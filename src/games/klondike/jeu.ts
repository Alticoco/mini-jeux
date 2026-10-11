import type { ContexteJeu, Jeu } from '../../core/types';
import { el, formaterTemps, vider } from '../../shared/dom';
import { COULEURS, SYMBOLE, elCarte } from '../../shared/cartes';
import {
  cartesSource, cloner, deplacer, destinationAuto, gagne, nouvelle, pasAuto, peutDeplacer, terminable, tirer,
  type Destination, type EtatKlondike, type Source,
} from './logique';

interface Sauvegarde {
  etat: EtatKlondike;
  secondes: number;
  historique: EtatKlondike[];
}

let ctx: ContexteJeu | null = null;
let etat: EtatKlondike | null = null;
let attente: Sauvegarde | null = null;
let historique: EtatKlondike[] = [];
let secondes = 0;
let horloge: number | undefined;
let finAuto: number | undefined;
let selection: Source | null = null;
let fini = false;
let dernierClic: { cle: string; t: number } | null = null;
let elTemps: HTMLElement | null = null;

function tirageDefaut(): 1 | 3 {
  return ctx?.options.difficulte === 'facile' ? 1 : 3;
}

function arreterHorloge(): void {
  window.clearInterval(horloge);
  horloge = undefined;
}

function demarrerHorloge(): void {
  arreterHorloge();
  horloge = window.setInterval(() => {
    if (fini) return;
    secondes++;
    if (elTemps) elTemps.textContent = formaterTemps(secondes);
    if (secondes % 15 === 0) ctx?.sauvegardeAuto();
  }, 1000);
}

function memoriser(): void {
  if (!etat) return;
  historique.push(cloner(etat));
  if (historique.length > 150) historique.shift();
}

function verifierFin(): void {
  if (!etat || !ctx || fini || !gagne(etat)) return;
  fini = true;
  arreterHorloge();
  window.clearInterval(finAuto);
  ctx.jouerSon('gagne');
  ctx.terminer({ victoire: true, score: etat.score });
}

function appliquer(s: Source, d: Destination): void {
  if (!etat || !ctx || fini) return;
  memoriser();
  if (deplacer(etat, s, d)) {
    ctx.jouerSon('pose');
    selection = null;
    verifierFin();
    dessiner();
    ctx.sauvegardeAuto();
  } else {
    historique.pop();
    ctx.jouerSon('erreur');
  }
}

function cliquerPioche(): void {
  if (!etat || !ctx || fini) return;
  memoriser();
  if (tirer(etat)) {
    ctx.jouerSon('clic');
    selection = null;
    dessiner();
    ctx.sauvegardeAuto();
  } else historique.pop();
}

/** Sélection d'une carte, double-clic = envoi automatique. */
function cliquerCarte(s: Source, cle: string): void {
  if (!etat || fini) return;
  const maintenant = Date.now();
  const double = dernierClic?.cle === cle && maintenant - dernierClic.t < 400;
  dernierClic = { cle, t: maintenant };
  if (!cartesSource(etat, s)) return;
  if (double) {
    const d = destinationAuto(etat, s);
    if (d) return appliquer(s, d);
  }
  if (selection && !memeSource(selection, s)) {
    const dest = destinationDepuisCarte(s);
    if (dest && peutDeplacer(etat, selection, dest)) return appliquer(selection, dest);
  }
  if (memeSource(selection, s)) {
    selection = null;
    return dessiner();
  }
  selection = s;
  ctx?.jouerSon('clic');
  dessiner();
}

function destinationDepuisCarte(s: Source): Destination | null {
  if (s.type === 'colonne') return { type: 'colonne', col: s.col };
  if (s.type === 'fondation') return { type: 'fondation' };
  return null;
}

function cliquerDestination(d: Destination): void {
  if (!etat || fini) return;
  if (!selection) return;
  appliquer(selection, d);
}

function memeSource(a: Source | null, b: Source): boolean {
  return a !== null && JSON.stringify(a) === JSON.stringify(b);
}

function lancerFinAuto(): void {
  if (!etat || !ctx || fini) return;
  window.clearInterval(finAuto);
  memoriser();
  finAuto = window.setInterval(() => {
    if (!etat || !pasAuto(etat)) {
      window.clearInterval(finAuto);
      return;
    }
    ctx?.jouerSon('pose');
    verifierFin();
    dessiner();
    ctx?.sauvegardeAuto();
  }, 110);
}

function dessiner(): void {
  if (!etat || !ctx) return;
  const e = etat;
  const decalageCache = 18;
  const decalageVisible = 28;
  const unite = 'var(--zoom-cartes)';

  const pioche = e.pioche.length
    ? el('div', { class: 'k-pioche', onclick: cliquerPioche, role: 'button', tabindex: 0, 'aria-label': `Pioche (${e.pioche.length} cartes)`, onkeydown: (ev: Event) => (ev as KeyboardEvent).key === 'Enter' && cliquerPioche() }, elCarte(null), el('span', { class: 'k-compte' }, String(e.pioche.length)))
    : el('button', { class: 'emplacement', onclick: cliquerPioche, 'aria-label': 'Reformer la pioche' }, e.defausse.length ? '↻' : '');

  const defausseSrc: Source = { type: 'defausse' };
  const visibles = e.defausse.slice(-Math.min(e.tirage, e.defausse.length));
  const defausse = el('div', { class: 'k-defausse' },
    ...(visibles.length ? visibles.map((c, i) => {
      const dessus = i === visibles.length - 1;
      return elCarte(c, {
        class: `${dessus && memeSource(selection, defausseSrc) ? 'choisie' : ''}`,
        style: `position:absolute;left:calc(${i * 22}px * ${unite});top:0`,
        onclick: dessus ? () => cliquerCarte(defausseSrc, 'defausse') : undefined,
      });
    }) : [el('div', { class: 'emplacement' })]));
  defausse.style.width = `calc((78px + ${Math.max(0, visibles.length - 1) * 22}px) * ${unite})`;
  defausse.style.height = `calc(78px * 1.4 * ${unite})`;

  const fondations = el('div', { class: 'k-fondations' }, ...COULEURS.map((couleur, f) => {
    const pile = e.fondations[f]!;
    const src: Source = { type: 'fondation', f };
    return el('div', { class: 'k-fondation', onclick: () => (pile.length && !selection ? cliquerCarte(src, `f${f}`) : cliquerDestination({ type: 'fondation' })) },
      pile.length ? elCarte(pile[pile.length - 1]!, { class: memeSource(selection, src) ? 'choisie' : '' }) : el('div', { class: 'emplacement', 'aria-label': `Fondation ${couleur}` }, SYMBOLE[couleur]));
  }));

  const tableau = el('div', { class: 'k-tableau' }, ...e.colonnes.map((col, c) => {
    let y = 0;
    const colEl = el('div', { class: 'k-colonne', 'aria-label': `Colonne ${c + 1}`, onclick: (ev: Event) => { if (ev.target === colEl) cliquerDestination({ type: 'colonne', col: c }); } });
    if (!col.length) colEl.append(el('div', { class: 'emplacement', onclick: () => cliquerDestination({ type: 'colonne', col: c }) }));
    col.forEach((k, i) => {
      const src: Source = { type: 'colonne', col: c, index: i };
      const choisie = selection?.type === 'colonne' && selection.col === c && i >= selection.index;
      const carte = k.visible
        ? elCarte(k, { class: choisie ? 'choisie' : '', style: `position:absolute;left:0;top:calc(${y}px * ${unite})`, onclick: () => cliquerCarte(src, `c${c}-${i}`) })
        : elCarte(null, { style: `position:absolute;left:0;top:calc(${y}px * ${unite})` });
      colEl.append(carte);
      y += k.visible ? decalageVisible : decalageCache;
    });
    const dernier = col[col.length - 1];
    const haut = col.length ? y - (dernier?.visible ? decalageVisible : decalageCache) + 78 * 1.4 : 78 * 1.4;
    colEl.style.height = `calc(${haut}px * ${unite})`;
    return colEl;
  }));

  elTemps = el('span', { class: 'val' }, formaterTemps(secondes));
  const choixTirage = el('div', { class: 'choix' }, el('span', {}, 'Pioche :'),
    ...([1, 3] as const).map((n) => el('button', { class: `btn${e.tirage === n ? ' actif' : ''}`, onclick: () => nouvelleAvec(n) }, `${n} carte${n > 1 ? 's' : ''}`)));
  const msg = fini ? `Bravo ! Partie gagnée en ${formaterTemps(secondes)} avec ${e.score} points.` : '';
  vider(ctx.conteneur);
  ctx.conteneur.append(
    choixTirage,
    el('div', { class: 'infos' }, el('span', {}, 'Score : ', el('span', { class: 'val' }, String(e.score))), el('span', {}, '⏱ ', elTemps), el('span', {}, 'Coups : ', el('span', { class: 'val' }, String(e.coups)))),
    el('div', { class: `message${fini ? ' gagne' : ''}`, role: 'status' }, msg),
    el('div', { class: 'tapis k-table' },
      el('div', { class: 'k-haut' }, el('div', { class: 'k-haut-gauche' }, pioche, defausse), fondations),
      tableau,
    ),
    ...(terminable(e) && !fini ? [el('button', { class: 'btn primaire', onclick: lancerFinAuto }, '✨ Terminer automatiquement')] : []),
    el('div', { class: 'muet' }, 'Cliquez une carte puis sa destination · double-clic : envoi automatique'),
  );
}

function nouvelleAvec(tirage: 1 | 3): void {
  if (!ctx) return;
  window.clearInterval(finAuto);
  etat = nouvelle(tirage);
  historique = [];
  secondes = 0;
  selection = null;
  fini = false;
  dessiner();
  demarrerHorloge();
  ctx.sauvegardeAuto();
}

export const jeuKlondike: Jeu = {
  id: 'klondike',
  nom: 'Solitaire Klondike',
  famille: 'Cartes solo',
  icone: '🃏',
  description: 'Le solitaire classique, avec sauvegarde.',
  regles: '<p>Le but : ranger les 52 cartes dans les <b>4 fondations</b> (une par couleur), de l\'as au roi.</p><ul><li>Dans les <b>7 colonnes</b>, on empile les cartes en <b>ordre décroissant</b> et en <b>alternant les couleurs</b> (rouge / noir). Seul un <b>roi</b> peut aller dans une colonne vide.</li><li>On peut déplacer une carte visible avec toutes celles qui la suivent.</li><li>La <b>pioche</b> révèle 1 ou 3 cartes ; quand elle est vide, cliquez dessus pour la reformer.</li><li>Cliquez sur une carte puis sur sa destination, ou <b>double-cliquez</b> pour l\'envoyer automatiquement.</li></ul><p>Points : +10 vers une fondation, +5 pour une carte retournée ou jouée depuis la pioche, −15 si on reprend une carte d\'une fondation.</p>',
  score: { libelle: 'meilleur score', sens: 'haut', suffixe: ' pts' },
  demarrer(c) {
    ctx = c;
    if (attente) {
      etat = attente.etat;
      historique = attente.historique;
      secondes = attente.secondes;
    } else {
      etat = nouvelle(tirageDefaut());
      historique = [];
      secondes = 0;
    }
    attente = null;
    selection = null;
    fini = gagne(etat);
    dessiner();
    if (!fini) demarrerHorloge();
  },
  arreter() {
    arreterHorloge();
    window.clearInterval(finAuto);
    ctx = null;
    etat = null;
    attente = null;
    elTemps = null;
  },
  sauvegarder() {
    return etat && !fini && etat.coups > 0 ? ({ etat, secondes, historique: historique.slice(-30) } satisfies Sauvegarde) : null;
  },
  charger(s) {
    const d = s as Sauvegarde;
    if (!d.etat || !Array.isArray(d.etat.colonnes) || d.etat.colonnes.length !== 7) throw new Error('sauvegarde invalide');
    attente = { etat: d.etat, secondes: d.secondes ?? 0, historique: Array.isArray(d.historique) ? d.historique : [] };
  },
  nouvellePartie() {
    if (ctx) nouvelleAvec(etat?.tirage ?? tirageDefaut());
  },
  annuler() {
    if (!etat || !ctx || fini || !historique.length) return;
    window.clearInterval(finAuto);
    etat = historique.pop()!;
    selection = null;
    dessiner();
    ctx.sauvegardeAuto();
  },
};

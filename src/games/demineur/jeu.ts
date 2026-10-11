import type { ContexteJeu, Difficulte, Jeu } from '../../core/types';
import { el, formaterTemps, vider } from '../../shared/dom';
import { NIVEAUX, basculerDrapeau, creer, drapeauxRestants, gagne, ouvrir, ouvrirAutour, type Plateau } from './logique';

interface Etat {
  plateau: Plateau;
  niveau: Difficulte;
  secondes: number;
  fini: boolean;
}

let ctx: ContexteJeu | null = null;
let etat: Etat | null = null;
let attente: Etat | null = null;
let horloge: number | undefined;
let modeDrapeau = false;
let elTemps: HTMLElement | null = null;

function neuf(niveau: Difficulte): Etat {
  const n = NIVEAUX[niveau];
  return { plateau: creer(n.lignes, n.colonnes, n.mines), niveau, secondes: 0, fini: false };
}

function arreterHorloge(): void {
  window.clearInterval(horloge);
  horloge = undefined;
}

function demarrerHorloge(): void {
  if (horloge !== undefined || !etat || etat.fini) return;
  horloge = window.setInterval(() => {
    if (!etat) return;
    etat.secondes++;
    if (elTemps) elTemps.textContent = formaterTemps(etat.secondes);
    if (etat.secondes % 10 === 0) ctx?.sauvegardeAuto();
  }, 1000);
}

function apresCoup(touche: boolean): void {
  if (!etat || !ctx) return;
  const p = etat.plateau;
  if (p.genere) demarrerHorloge();
  if (p.perdu) {
    etat.fini = true;
    arreterHorloge();
    p.cases.forEach((c) => { if (c.mine && !c.drapeau) c.ouverte = true; });
    ctx.jouerSon('perdu');
    ctx.terminer({ victoire: false });
  } else if (gagne(p)) {
    etat.fini = true;
    arreterHorloge();
    ctx.jouerSon('gagne');
    ctx.terminer({ victoire: true, score: etat.secondes });
  } else if (touche) ctx.jouerSon('clic');
  dessiner();
  ctx.sauvegardeAuto();
}

function agir(i: number, drapeau: boolean): void {
  if (!etat || etat.fini) return;
  const p = etat.plateau;
  if (drapeau || modeDrapeau) {
    if (!p.cases[i]!.ouverte) basculerDrapeau(p, i);
    else ouvrirAutour(p, i);
  } else if (p.cases[i]!.ouverte) ouvrirAutour(p, i);
  else ouvrir(p, i);
  apresCoup(true);
}

function dessiner(): void {
  if (!etat || !ctx) return;
  const e = etat;
  const p = e.plateau;
  const grille = el('div', { class: 'plateau demineur-grille', role: 'grid', style: `grid-template-columns: repeat(${p.colonnes}, 1fr); width: ${p.colonnes * 30}px` });
  p.cases.forEach((c, i) => {
    let contenu = '';
    let classe = 'case dem-case';
    if (c.ouverte) {
      classe += ' ouverte';
      if (c.mine) { contenu = '💥'; classe += ' mine'; } else if (c.voisines) { contenu = String(c.voisines); classe += ` n${c.voisines}`; }
    } else if (c.drapeau) contenu = '🚩';
    const b = el('button', { class: classe, 'aria-label': c.ouverte ? `Case ouverte ${contenu}` : c.drapeau ? 'Drapeau' : 'Case fermée', disabled: e.fini && !c.drapeau && !c.ouverte ? true : undefined }, contenu);
    b.addEventListener('click', () => agir(i, false));
    b.addEventListener('contextmenu', (ev) => { ev.preventDefault(); agir(i, true); });
    grille.append(b);
  });
  elTemps = el('span', { class: 'val' }, formaterTemps(e.secondes));
  const niveaux = el('div', { class: 'choix' }, el('span', {}, 'Niveau :'),
    ...(['facile', 'moyen', 'difficile'] as Difficulte[]).map((n) =>
      el('button', { class: `btn${n === e.niveau ? ' actif' : ''}`, onclick: () => { ctx!.options.difficulte = n; jeuDemineur.nouvellePartie(); } },
        `${n[0]!.toUpperCase() + n.slice(1)} (${NIVEAUX[n].colonnes}×${NIVEAUX[n].lignes})`)));
  const bascule = el('button', { class: `btn${modeDrapeau ? ' actif' : ''}`, 'aria-pressed': modeDrapeau, onclick: () => { modeDrapeau = !modeDrapeau; dessiner(); } }, '🚩 Mode drapeau');
  const msg = e.fini ? (p.perdu ? 'Boum ! Vous avez perdu.' : `Bravo ! Terminé en ${formaterTemps(e.secondes)}.`) : '';
  vider(ctx.conteneur);
  ctx.conteneur.append(
    niveaux,
    el('div', { class: 'infos' }, el('span', {}, '💣 ', el('span', { class: 'val' }, String(drapeauxRestants(p)))), el('span', {}, '⏱ ', elTemps), bascule),
    el('div', { class: `message${e.fini ? (p.perdu ? ' perdu' : ' gagne') : ''}`, role: 'status' }, msg),
    el('div', { class: 'defile-x' }, grille),
    el('div', { class: 'muet' }, 'Clic : ouvrir · Clic droit : drapeau · Clic sur un chiffre : ouvrir autour'),
  );
}

export const jeuDemineur: Jeu = {
  id: 'demineur',
  nom: 'Démineur',
  famille: 'Puzzles',
  icone: '💣',
  description: 'Dégagez le terrain sans toucher une mine.',
  regles: '<p>Ouvrez toutes les cases <b>sans mine</b>. Un chiffre indique combien de mines touchent la case (y compris en diagonale).</p><ul><li><b>Clic gauche</b> : ouvrir une case.</li><li><b>Clic droit</b> (ou « Mode drapeau ») : poser / retirer un drapeau 🚩.</li><li><b>Clic</b> sur un chiffre dont tous les drapeaux sont posés : ouvre les cases voisines restantes.</li></ul><p>Le premier clic est toujours sans danger. Votre score est le <b>temps</b> mis pour gagner.</p>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  demarrer(c) {
    ctx = c;
    etat = attente ?? neuf(c.options.difficulte);
    attente = null;
    dessiner();
    if (etat.plateau.genere) demarrerHorloge();
  },
  arreter() {
    arreterHorloge();
    ctx = null;
    etat = null;
    attente = null;
    elTemps = null;
  },
  sauvegarder() {
    return etat && !etat.fini && etat.plateau.genere ? etat : null;
  },
  charger(s) {
    const e = s as Etat;
    if (!e.plateau || !Array.isArray(e.plateau.cases) || e.plateau.cases.length !== e.plateau.lignes * e.plateau.colonnes) throw new Error('sauvegarde invalide');
    attente = e;
  },
  nouvellePartie() {
    if (!ctx) return;
    arreterHorloge();
    etat = neuf(ctx.options.difficulte);
    dessiner();
  },
};

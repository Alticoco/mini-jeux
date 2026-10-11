import dictionnaire from '../../../assets/dictionnaire-fr.json';
import type { ContexteJeu, Difficulte, Jeu } from '../../core/types';
import { el, vider } from '../../shared/dom';
import { choisirMot, erreurs, gagne, motAffiche, nouvelle, normaliser, perdu, proposer, type EtatPendu } from './logique';

let ctx: ContexteJeu | null = null;
let etat: EtatPendu | null = null;
let attente: EtatPendu | null = null;
let termine = false;

const ALPHABET = [...'abcdefghijklmnopqrstuvwxyz'];

/** Éléments du dessin, du premier au dernier (potence, corde, tête, corps, bras, jambes, visage). */
const DESSIN = [
  '<line x1="20" y1="190" x2="140" y2="190"/>',
  '<line x1="50" y1="190" x2="50" y2="20"/>',
  '<line x1="50" y1="20" x2="120" y2="20"/>',
  '<line x1="120" y1="20" x2="120" y2="45"/>',
  '<circle cx="120" cy="60" r="15"/>',
  '<line x1="120" y1="75" x2="120" y2="125"/>',
  '<line x1="120" y1="85" x2="98" y2="108"/><line x1="120" y1="85" x2="142" y2="108"/>',
  '<line x1="120" y1="125" x2="100" y2="160"/><line x1="120" y1="125" x2="140" y2="160"/>',
  '<line x1="114" y1="56" x2="118" y2="60"/><line x1="118" y1="56" x2="114" y2="60"/><line x1="122" y1="56" x2="126" y2="60"/><line x1="126" y1="56" x2="122" y2="60"/>',
];

function nouveauMot(): EtatPendu {
  const niveau = ctx!.options.difficulte;
  return nouvelle(choisirMot(dictionnaire as string[], niveau), niveau);
}

function jouer(lettre: string): void {
  if (!etat || !ctx || termine) return;
  const avant = etat;
  etat = proposer(etat, lettre);
  if (etat === avant) return;
  const bonne = normaliser(etat.mot).includes(normaliser(lettre));
  ctx.jouerSon(bonne ? 'clic' : 'erreur');
  if (gagne(etat) || perdu(etat)) {
    termine = true;
    const v = gagne(etat);
    ctx.terminer({ victoire: v });
    ctx.jouerSon(v ? 'gagne' : 'perdu');
  }
  dessiner();
  ctx.sauvegardeAuto();
}

function clavier(e: KeyboardEvent): void {
  if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
  jouer(e.key);
}

function dessiner(): void {
  if (!etat || !ctx) return;
  const e = etat;
  const nbErr = erreurs(e);
  const parts = Math.min(DESSIN.length, Math.round((nbErr / e.max) * DESSIN.length));
  const svg = el('div', { class: 'pendu-dessin', role: 'img', 'aria-label': `${nbErr} erreurs sur ${e.max}` });
  svg.innerHTML = `<svg viewBox="0 0 180 200" width="200" height="222" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round">${DESSIN.slice(0, parts).join('')}</svg>`;
  const mot = el('div', { class: 'pendu-mot', 'aria-label': 'Mot à deviner' }, ...motAffiche(e, termine).map((c) => el('span', { class: c === '_' ? 'vide' : '' }, c === '_' ? '' : c.toUpperCase())));
  const m = normaliser(e.mot);
  const clavierEl = el('div', { class: 'pendu-clavier' }, ...ALPHABET.map((l) =>
    el('button', {
      class: `btn${e.essais.includes(l) ? (m.includes(l) ? ' bonne' : ' mauvaise') : ''}`,
      disabled: termine || e.essais.includes(l), onclick: () => jouer(l),
    }, l.toUpperCase())));
  const niveaux = el('div', { class: 'choix' }, el('span', {}, 'Niveau :'),
    ...(['facile', 'moyen', 'difficile'] as Difficulte[]).map((n) =>
      el('button', { class: `btn${e.max === ({ facile: 9, moyen: 7, difficile: 6 })[n] ? ' actif' : ''}`, onclick: () => { ctx!.options.difficulte = n; jeuPendu.nouvellePartie(); } }, n[0]!.toUpperCase() + n.slice(1))));
  const msg = termine ? (gagne(e) ? 'Bravo, vous avez trouvé !' : `Perdu ! Le mot était « ${e.mot} ».`) : `Erreurs : ${nbErr} / ${e.max}`;
  vider(ctx.conteneur);
  ctx.conteneur.append(
    niveaux,
    el('div', { class: `message${termine ? (gagne(e) ? ' gagne' : ' perdu') : ''}`, role: 'status' }, msg),
    svg, mot, clavierEl,
    el('div', { class: 'muet' }, 'Tapez les lettres au clavier ou cliquez dessus (les accents sont automatiques)'),
  );
}

export const jeuPendu: Jeu = {
  id: 'pendu',
  nom: 'Pendu',
  famille: 'Mots',
  icone: '🪢',
  description: 'Devinez le mot lettre par lettre.',
  regles: '<p>Un mot français est caché. Proposez des <b>lettres</b> : si elle est dans le mot, elle apparaît à toutes ses places ; sinon, le dessin du pendu avance d\'une étape.</p><p>Trouvez le mot avant que le dessin soit complet. Les accents sont remplis automatiquement (« e » révèle aussi « é » et « è »). Le niveau règle la longueur des mots et le nombre d\'erreurs permises.</p>',
  demarrer(c) {
    ctx = c;
    etat = attente ?? nouveauMot();
    attente = null;
    termine = gagne(etat) || perdu(etat);
    dessiner();
    document.addEventListener('keydown', clavier);
  },
  arreter() {
    document.removeEventListener('keydown', clavier);
    ctx = null;
    etat = null;
    attente = null;
  },
  sauvegarder() {
    return etat && !termine && etat.essais.length > 0 ? etat : null;
  },
  charger(s) {
    const e = s as EtatPendu;
    if (typeof e.mot !== 'string' || !Array.isArray(e.essais) || typeof e.max !== 'number') throw new Error('sauvegarde invalide');
    attente = e;
  },
  nouvellePartie() {
    if (!ctx) return;
    etat = nouveauMot();
    termine = false;
    dessiner();
  },
};

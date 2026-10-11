import type { ContexteJeu, Difficulte, Jeu } from '../../core/types';
import { el, vider } from '../../shared/dom';
import { TAILLES, cliquer, estResolu, indexPourDirection, melanger } from './logique';

interface Etat {
  n: number;
  tuiles: number[];
  coups: number;
  fini: boolean;
  historique: number[][]; // positions successives des tuiles (pour annuler)
}

const TOUCHES: Record<string, 'haut' | 'bas' | 'gauche' | 'droite'> = {
  ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite',
};

let ctx: ContexteJeu | null = null;
let etat: Etat | null = null;
let attente: Etat | null = null;

function neuf(niveau: Difficulte): Etat {
  const n = TAILLES[niveau];
  return { n, tuiles: melanger(n), coups: 0, fini: false, historique: [] };
}

function jouer(i: number): void {
  if (!etat || !ctx || etat.fini || i < 0) return;
  const avant = [...etat.tuiles];
  if (!cliquer(etat.tuiles, etat.n, i)) {
    ctx.jouerSon('erreur');
    return;
  }
  etat.historique.push(avant);
  if (etat.historique.length > 200) etat.historique.shift();
  etat.coups++;
  ctx.jouerSon('pose');
  if (estResolu(etat.tuiles)) {
    etat.fini = true;
    ctx.jouerSon('gagne');
    ctx.terminer({ victoire: true, score: etat.coups });
  }
  dessiner();
  ctx.sauvegardeAuto();
}

function clavier(e: KeyboardEvent): void {
  const d = TOUCHES[e.key];
  if (!d || !etat) return;
  e.preventDefault();
  jouer(indexPourDirection(etat.tuiles, etat.n, d));
}

function dessiner(): void {
  if (!etat || !ctx) return;
  const e = etat;
  const plateau = el('div', { class: 'plateau taquin-grille', style: `grid-template-columns: repeat(${e.n}, 1fr); width: min(${e.n * 90}px, 90vw)`, role: 'grid' });
  e.tuiles.forEach((v, i) => {
    plateau.append(v === 0
      ? el('div', { class: 'taquin-vide' })
      : el('button', { class: 'case taquin-tuile', disabled: e.fini, 'aria-label': `Tuile ${v}`, onclick: () => jouer(i) }, String(v)));
  });
  const niveaux = el('div', { class: 'choix' }, el('span', {}, 'Niveau :'),
    ...(['facile', 'moyen', 'difficile'] as Difficulte[]).map((n) =>
      el('button', { class: `btn${TAILLES[n] === e.n ? ' actif' : ''}`, onclick: () => { ctx!.options.difficulte = n; jeuTaquin.nouvellePartie(); } },
        `${n[0]!.toUpperCase() + n.slice(1)} (${TAILLES[n]}×${TAILLES[n]})`)));
  vider(ctx.conteneur);
  ctx.conteneur.append(
    niveaux,
    el('div', { class: 'infos' }, el('span', {}, 'Coups : ', el('span', { class: 'val' }, String(e.coups)))),
    el('div', { class: `message${e.fini ? ' gagne' : ''}`, role: 'status' }, e.fini ? `Bravo ! Résolu en ${e.coups} coups.` : ''),
    plateau,
    el('div', { class: 'muet' }, 'Cliquez sur une tuile ou utilisez les flèches'),
  );
}

export const jeuTaquin: Jeu = {
  id: 'taquin',
  nom: 'Taquin',
  famille: 'Puzzles',
  icone: '🧩',
  description: 'Remettez les tuiles dans l\'ordre.',
  regles: '<p>Faites glisser les tuiles dans la case vide pour les ranger dans l\'<b>ordre croissant</b> (1, 2, 3… de gauche à droite et de haut en bas), la case vide terminant en bas à droite.</p><p>Cliquez sur une tuile alignée avec la case vide pour la déplacer (avec celles qui sont entre les deux), ou utilisez les <b>flèches</b> du clavier. Votre score est le <b>nombre de coups</b> : moins il y en a, mieux c\'est.</p>',
  score: { libelle: 'moins de coups', sens: 'bas', suffixe: ' coups' },
  demarrer(c) {
    ctx = c;
    etat = attente ?? neuf(c.options.difficulte);
    attente = null;
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
    return etat && !etat.fini && etat.coups > 0 ? etat : null;
  },
  charger(s) {
    const e = s as Etat;
    if (!Array.isArray(e.tuiles) || e.tuiles.length !== e.n * e.n) throw new Error('sauvegarde invalide');
    attente = e;
  },
  nouvellePartie() {
    if (!ctx) return;
    etat = neuf(ctx.options.difficulte);
    dessiner();
  },
  annuler() {
    if (!etat || !ctx || etat.fini || !etat.historique.length) return;
    etat.tuiles = etat.historique.pop()!;
    etat.coups = Math.max(0, etat.coups - 1);
    dessiner();
    ctx.sauvegardeAuto();
  },
};

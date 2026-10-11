import type { ContexteJeu, Difficulte, Jeu } from '../../core/types';
import { el, vider } from '../../shared/dom';
import { coupOrdi, gagnant, plein, type Case } from './logique';

interface Etat {
  plateau: Case[];
  niveau: Difficulte;
  fini: boolean;
}

let ctx: ContexteJeu | null = null;
let etat: Etat | null = null;
let attente: Etat | null = null;
let minuteur: number | undefined;
let tourOrdi = false;

function neuf(niveau: Difficulte): Etat {
  return { plateau: Array<Case>(9).fill(null), niveau, fini: false };
}

function verifierFin(): boolean {
  if (!etat || !ctx) return false;
  const g = gagnant(etat.plateau);
  if (!g && !plein(etat.plateau)) return false;
  etat.fini = true;
  ctx.terminer({ victoire: g?.marque === 'X' });
  ctx.jouerSon(g ? (g.marque === 'X' ? 'gagne' : 'perdu') : 'pose');
  return true;
}

function jouer(i: number): void {
  if (!etat || !ctx || etat.fini || tourOrdi || etat.plateau[i]) return;
  etat.plateau[i] = 'X';
  ctx.jouerSon('clic');
  if (!verifierFin()) {
    dessiner();
    tourOrdi = true;
    minuteur = window.setTimeout(() => {
      tourOrdi = false;
      if (!etat || etat.fini) return;
      etat.plateau[coupOrdi(etat.plateau, 'O', etat.niveau)] = 'O';
      ctx?.jouerSon('pose');
      verifierFin();
      dessiner();
      ctx?.sauvegardeAuto();
    }, 350);
  }
  dessiner();
  ctx.sauvegardeAuto();
}

function dessiner(): void {
  if (!etat || !ctx) return;
  const e = etat;
  const g = gagnant(e.plateau);
  const grille = el('div', { class: 'plateau morpion-grille', role: 'grid', 'aria-label': 'Grille de morpion' });
  e.plateau.forEach((c, i) => {
    const gagnante = g?.ligne.includes(i);
    grille.append(
      el('button', {
        class: `case morpion-case${gagnante ? ' gagnante' : ''}`, role: 'gridcell', disabled: e.fini || c !== null,
        'aria-label': `Case ${i + 1} : ${c ?? 'vide'}`, onclick: () => jouer(i),
      }, c ?? ''),
    );
  });
  const niveaux = el('div', { class: 'choix' }, el('span', {}, 'Niveau :'),
    ...(['facile', 'moyen', 'difficile'] as Difficulte[]).map((n) =>
      el('button', { class: `btn${n === e.niveau ? ' actif' : ''}`, onclick: () => { ctx!.options.difficulte = n; jeuMorpion.nouvellePartie(); } }, n[0]!.toUpperCase() + n.slice(1))));
  const msg = e.fini ? (g ? (g.marque === 'X' ? 'Bravo, vous avez gagné !' : "L'ordinateur a gagné.") : 'Match nul.') : 'À vous de jouer (X).';
  vider(ctx.conteneur);
  ctx.conteneur.append(
    niveaux,
    el('div', { class: `message${e.fini ? (g?.marque === 'X' ? ' gagne' : g ? ' perdu' : '') : ''}`, role: 'status' }, msg),
    grille,
  );
}

export const jeuMorpion: Jeu = {
  id: 'morpion',
  nom: 'Morpion',
  famille: 'Contre l\'ordi',
  icone: '⭕',
  description: 'Alignez 3 croix avant l\'ordinateur.',
  regles: '<p>Vous jouez les <b>X</b>, l\'ordinateur les <b>O</b>. Chacun pose sa marque à tour de rôle.</p><p>Le premier qui aligne <b>3 marques</b> (ligne, colonne ou diagonale) gagne. Si la grille est pleine sans alignement, c\'est match nul.</p><p>Le niveau (facile, moyen, difficile) règle la force de l\'ordinateur.</p>',
  demarrer(c) {
    ctx = c;
    etat = attente ?? neuf(c.options.difficulte);
    attente = null;
    dessiner();
  },
  arreter() {
    window.clearTimeout(minuteur);
    tourOrdi = false;
    ctx = null;
    etat = null;
    attente = null;
  },
  sauvegarder() {
    return etat && !etat.fini && etat.plateau.some((c) => c) ? etat : null;
  },
  charger(s) {
    const e = s as Etat;
    if (!Array.isArray(e.plateau) || e.plateau.length !== 9) throw new Error('sauvegarde invalide');
    attente = e;
  },
  nouvellePartie() {
    if (!ctx) return;
    window.clearTimeout(minuteur);
    tourOrdi = false;
    etat = neuf(ctx.options.difficulte);
    dessiner();
  },
};

export const morpion = jeuMorpion;

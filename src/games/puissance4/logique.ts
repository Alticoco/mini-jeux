import type { Difficulte } from '../../core/types';
import { choisir, type Rng } from '../../shared/alea';

export const LIGNES = 6;
export const COLONNES = 7;
/** 0 = vide, 1 = joueur, 2 = ordinateur. Index = ligne * COLONNES + colonne (ligne 0 en haut). */
export type Joueur = 1 | 2;
export type Grille = Array<0 | Joueur>;

export function grilleVide(): Grille {
  return Array<0 | Joueur>(LIGNES * COLONNES).fill(0);
}

export function colonneJouable(g: Grille, c: number): boolean {
  return c >= 0 && c < COLONNES && g[c] === 0;
}

export function colonnesJouables(g: Grille): number[] {
  return Array.from({ length: COLONNES }, (_, c) => c).filter((c) => colonneJouable(g, c));
}

/** Pose un jeton ; renvoie la ligne d'arrivée ou -1 si la colonne est pleine. */
export function poser(g: Grille, c: number, j: Joueur): number {
  if (!colonneJouable(g, c)) return -1;
  for (let l = LIGNES - 1; l >= 0; l--) {
    if (g[l * COLONNES + c] === 0) {
      g[l * COLONNES + c] = j;
      return l;
    }
  }
  return -1;
}

export function retirer(g: Grille, c: number): void {
  for (let l = 0; l < LIGNES; l++) {
    if (g[l * COLONNES + c] !== 0) {
      g[l * COLONNES + c] = 0;
      return;
    }
  }
}

const DIRECTIONS: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];

/** Fenêtres de 4 cases alignées (indices). */
const FENETRES: number[][] = (() => {
  const res: number[][] = [];
  for (let l = 0; l < LIGNES; l++) {
    for (let c = 0; c < COLONNES; c++) {
      for (const [dl, dc] of DIRECTIONS) {
        const el = l + 3 * dl;
        const ec = c + 3 * dc;
        if (el < 0 || el >= LIGNES || ec < 0 || ec >= COLONNES) continue;
        res.push([0, 1, 2, 3].map((k) => (l + k * dl) * COLONNES + c + k * dc));
      }
    }
  }
  return res;
})();

export function gagnant(g: Grille): { joueur: Joueur; cases: number[] } | null {
  for (const f of FENETRES) {
    const v = g[f[0]!]!;
    if (v !== 0 && f.every((i) => g[i] === v)) return { joueur: v, cases: f };
  }
  return null;
}

export function pleine(g: Grille): boolean {
  return colonnesJouables(g).length === 0;
}

function evaluer(g: Grille, moi: Joueur): number {
  const autre: Joueur = moi === 1 ? 2 : 1;
  let score = 0;
  for (let l = 0; l < LIGNES; l++) if (g[l * COLONNES + 3] === moi) score += 3;
  for (const f of FENETRES) {
    let a = 0;
    let b = 0;
    for (const i of f) {
      if (g[i] === moi) a++;
      else if (g[i] === autre) b++;
    }
    if (a && b) continue;
    if (a === 3) score += 5;
    else if (a === 2) score += 2;
    if (b === 3) score -= 4;
    else if (b === 2) score -= 1;
  }
  return score;
}

const ORDRE = [3, 2, 4, 1, 5, 0, 6];

function negamax(g: Grille, prof: number, alpha: number, beta: number, courant: Joueur, moi: Joueur): number {
  const w = gagnant(g);
  if (w) return (w.joueur === courant ? 1 : -1) * (100000 + prof);
  if (pleine(g)) return 0;
  if (prof === 0) return (courant === moi ? 1 : -1) * evaluer(g, moi);
  const suivant: Joueur = courant === 1 ? 2 : 1;
  let meilleur = -Infinity;
  for (const c of ORDRE) {
    if (!colonneJouable(g, c)) continue;
    poser(g, c, courant);
    const v = -negamax(g, prof - 1, -beta, -alpha, suivant, moi);
    retirer(g, c);
    if (v > meilleur) meilleur = v;
    if (meilleur > alpha) alpha = meilleur;
    if (alpha >= beta) break;
  }
  return meilleur;
}

const PROFONDEUR: Record<Difficulte, number> = { facile: 1, moyen: 4, difficile: 6 };

/** Choisit la colonne de l'ordinateur. Facile : joue au hasard mais gagne/bloque en 1 coup. */
export function coupOrdi(g: Grille, moi: Joueur, niveau: Difficulte, rng: Rng = Math.random): number {
  const libres = colonnesJouables(g);
  const autre: Joueur = moi === 1 ? 2 : 1;
  const copie = [...g] as Grille;
  for (const j of [moi, autre]) {
    for (const c of libres) {
      poser(copie, c, j);
      const gagne = gagnant(copie)?.joueur === j;
      retirer(copie, c);
      if (gagne) return c;
    }
  }
  if (niveau === 'facile') return choisir(libres, rng);
  let meilleur = -Infinity;
  let coups: number[] = [];
  for (const c of ORDRE) {
    if (!colonneJouable(copie, c)) continue;
    poser(copie, c, moi);
    const v = -negamax(copie, PROFONDEUR[niveau] - 1, -Infinity, Infinity, autre, moi);
    retirer(copie, c);
    if (v > meilleur) { meilleur = v; coups = [c]; } else if (v === meilleur) coups.push(c);
  }
  return choisir(coups, rng);
}

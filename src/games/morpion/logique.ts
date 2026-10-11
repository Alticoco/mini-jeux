import type { Difficulte } from '../../core/types';
import { choisir, type Rng } from '../../shared/alea';

export type Marque = 'X' | 'O';
export type Case = Marque | null;

const LIGNES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function gagnant(p: readonly Case[]): { marque: Marque; ligne: number[] } | null {
  for (const l of LIGNES) {
    const [a, b, c] = l as [number, number, number];
    if (p[a] && p[a] === p[b] && p[a] === p[c]) return { marque: p[a]!, ligne: l };
  }
  return null;
}

export function plein(p: readonly Case[]): boolean {
  return p.every((c) => c !== null);
}

export function coupsLibres(p: readonly Case[]): number[] {
  return p.flatMap((c, i) => (c === null ? [i] : []));
}

/** Valeur du point de vue de `moi` : +1 victoire, 0 nul, -1 défaite (moins les coups, pour gagner vite). */
function minimax(p: Case[], tour: Marque, moi: Marque, profondeur: number): number {
  const g = gagnant(p);
  if (g) return g.marque === moi ? 10 - profondeur : profondeur - 10;
  if (plein(p)) return 0;
  const suivant: Marque = tour === 'X' ? 'O' : 'X';
  let meilleur = tour === moi ? -Infinity : Infinity;
  for (const i of coupsLibres(p)) {
    p[i] = tour;
    const v = minimax(p, suivant, moi, profondeur + 1);
    p[i] = null;
    meilleur = tour === moi ? Math.max(meilleur, v) : Math.min(meilleur, v);
  }
  return meilleur;
}

export function meilleursCoups(p: readonly Case[], moi: Marque): number[] {
  const autre: Marque = moi === 'X' ? 'O' : 'X';
  const copie = [...p];
  let max = -Infinity;
  let coups: number[] = [];
  for (const i of coupsLibres(copie)) {
    copie[i] = moi;
    const v = minimax(copie, autre, moi, 1);
    copie[i] = null;
    if (v > max) { max = v; coups = [i]; } else if (v === max) coups.push(i);
  }
  return coups;
}

/** Facile : au hasard. Moyen : parfait 1 fois sur 2. Difficile : toujours parfait. */
export function coupOrdi(p: readonly Case[], moi: Marque, niveau: Difficulte, rng: Rng = Math.random): number {
  const libres = coupsLibres(p);
  const parfait = niveau === 'difficile' || (niveau === 'moyen' && rng() < 0.6);
  return choisir(parfait ? meilleursCoups(p, moi) : libres, rng);
}

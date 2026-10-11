import type { Rng } from '../../shared/alea';

/** Indices d'une ligne : longueurs des blocs de cases pleines consécutives ([0] si vide). */
export function indices(ligne: readonly boolean[]): number[] {
  const res: number[] = [];
  let n = 0;
  for (const v of ligne) {
    if (v) n++;
    else if (n) { res.push(n); n = 0; }
  }
  if (n) res.push(n);
  return res.length ? res : [0];
}

export function genererMotif(n: number, densite: number, rng: Rng = Math.random): boolean[] {
  let g: boolean[];
  do {
    g = Array.from({ length: n * n }, () => rng() < densite);
    // évite les lignes ou colonnes vides trop nombreuses : au moins une case pleine par ligne et par colonne
  } while (!Array.from({ length: n }, (_, k) => lignesNonVides(g, n, k)).every(Boolean));
  return g;
}

function lignesNonVides(g: boolean[], n: number, k: number): boolean {
  return Array.from({ length: n }, (_, j) => g[k * n + j]).some(Boolean) && Array.from({ length: n }, (_, j) => g[j * n + k]).some(Boolean);
}

export function ligne(g: readonly boolean[], n: number, k: number, colonne: boolean): boolean[] {
  return Array.from({ length: n }, (_, j) => g[colonne ? j * n + k : k * n + j]!);
}

export function cluesLignes(solution: readonly boolean[], n: number): number[][] {
  return Array.from({ length: n }, (_, k) => indices(ligne(solution, n, k, false)));
}

export function cluesColonnes(solution: readonly boolean[], n: number): number[][] {
  return Array.from({ length: n }, (_, k) => indices(ligne(solution, n, k, true)));
}

const egal = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** La ligne/colonne k de la grille du joueur respecte-t-elle ses indices ? */
export function ligneOk(pleines: readonly boolean[], n: number, k: number, colonne: boolean, clue: readonly number[]): boolean {
  return egal(indices(ligne(pleines, n, k, colonne)), clue);
}

/** Victoire : toutes les lignes et colonnes respectent leurs indices (plusieurs solutions possibles). */
export function gagne(pleines: readonly boolean[], n: number, cl: readonly number[][], cc: readonly number[][]): boolean {
  for (let k = 0; k < n; k++) {
    if (!ligneOk(pleines, n, k, false, cl[k]!) || !ligneOk(pleines, n, k, true, cc[k]!)) return false;
  }
  return true;
}

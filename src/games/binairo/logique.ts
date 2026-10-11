import { melanger, type Rng } from '../../shared/alea';

/** Grille n×n ; 0 = vide, 1 et 2 = les deux symboles. */
export type Grille = number[];

function ligneIdx(n: number, k: number, colonne: boolean): number[] {
  return Array.from({ length: n }, (_, j) => (colonne ? j * n + k : k * n + j));
}

/** Peut-on poser v en i sans violer les règles ? */
export function peutPlacer(g: Grille, n: number, i: number, v: number): boolean {
  const ancien = g[i]!;
  g[i] = v;
  const ok = verifierCase(g, n, i);
  g[i] = ancien;
  return ok;
}

function verifierCase(g: Grille, n: number, i: number): boolean {
  const l = Math.floor(i / n);
  const c = i % n;
  for (const colonne of [false, true]) {
    const idx = ligneIdx(n, colonne ? c : l, colonne);
    const pos = colonne ? l : c;
    const v = g[i]!;
    // pas trois identiques à la suite autour de i
    for (let s = Math.max(0, pos - 2); s <= Math.min(n - 3, pos); s++) {
      if (g[idx[s]!] === v && g[idx[s + 1]!] === v && g[idx[s + 2]!] === v) return false;
    }
    // pas plus de n/2 de chaque
    if (idx.filter((k) => g[k] === v).length > n / 2) return false;
    // pas deux lignes (colonnes) complètes identiques
    if (idx.every((k) => g[k] !== 0)) {
      for (let o = 0; o < n; o++) {
        if (o === (colonne ? c : l)) continue;
        const autre = ligneIdx(n, o, colonne);
        if (autre.every((k) => g[k] !== 0) && autre.every((k, j) => g[k] === g[idx[j]!])) return false;
      }
    }
  }
  return true;
}

/** Cases en infraction dans une grille (partielle ou complète). */
export function conflits(g: Grille, n: number): Set<number> {
  const res = new Set<number>();
  for (let i = 0; i < n * n; i++) if (g[i] && !verifierCase(g, n, i)) res.add(i);
  return res;
}

export function complete(g: Grille): boolean {
  return g.every((v) => v !== 0);
}

export function resolue(g: Grille, n: number): boolean {
  return complete(g) && conflits(g, n).size === 0;
}

/** Compte les solutions (jusqu'à limite). */
export function compter(g: Grille, n: number, limite = 2): number {
  const i = g.indexOf(0);
  if (i < 0) return 1;
  let total = 0;
  for (const v of [1, 2]) {
    if (!peutPlacer(g, n, i, v)) continue;
    g[i] = v;
    total += compter(g, n, limite - total);
    g[i] = 0;
    if (total >= limite) break;
  }
  return total;
}

function remplir(g: Grille, n: number, rng: Rng): boolean {
  const i = g.indexOf(0);
  if (i < 0) return true;
  for (const v of melanger([1, 2], rng)) {
    if (!peutPlacer(g, n, i, v)) continue;
    g[i] = v;
    if (remplir(g, n, rng)) return true;
    g[i] = 0;
  }
  return false;
}

/** Génère un puzzle à solution unique avec environ `garde` (0–1) des cases données. */
export function generer(n: number, garde: number, rng: Rng = Math.random): { puzzle: Grille; solution: Grille } {
  let solution: Grille;
  do {
    solution = Array<number>(n * n).fill(0);
  } while (!remplir(solution, n, rng));
  const puzzle = [...solution];
  let restantes = n * n;
  const cible = Math.round(n * n * garde);
  for (const i of melanger(Array.from({ length: n * n }, (_, k) => k), rng)) {
    if (restantes <= cible) break;
    const v = puzzle[i]!;
    puzzle[i] = 0;
    if (compter([...puzzle], n) === 1) restantes--;
    else puzzle[i] = v;
  }
  return { puzzle, solution };
}

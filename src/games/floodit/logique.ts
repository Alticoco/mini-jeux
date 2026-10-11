import { entier, type Rng } from '../../shared/alea';

export const COULEURS = 6;

export function grille(n: number, rng: Rng = Math.random): number[] {
  return Array.from({ length: n * n }, () => entier(COULEURS, rng));
}

/** Remplit la zone connectée au coin haut-gauche avec la couleur c. Renvoie false si rien ne change. */
export function inonder(g: number[], n: number, c: number): boolean {
  const depart = g[0]!;
  if (depart === c) return false;
  const pile = [0];
  const vu = new Set<number>([0]);
  while (pile.length) {
    const i = pile.pop()!;
    g[i] = c;
    const l = Math.floor(i / n);
    const col = i % n;
    const voisins = [l > 0 ? i - n : -1, l < n - 1 ? i + n : -1, col > 0 ? i - 1 : -1, col < n - 1 ? i + 1 : -1];
    for (const v of voisins) if (v >= 0 && !vu.has(v) && g[v] === depart) { vu.add(v); pile.push(v); }
  }
  return true;
}

export function uniforme(g: number[]): boolean {
  return g.every((v) => v === g[0]);
}

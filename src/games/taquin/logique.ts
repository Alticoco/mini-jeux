import { entier, type Rng } from '../../shared/alea';
import type { Difficulte } from '../../core/types';

export const TAILLES: Record<Difficulte, number> = { facile: 3, moyen: 4, difficile: 5 };

/** Tuiles 1..n²-1, 0 = case vide. Index = ligne * n + colonne. */
export function resolu(n: number): number[] {
  return Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));
}

export function estResolu(t: readonly number[]): boolean {
  return t.every((v, i) => v === (i + 1) % t.length);
}

/** Déplace la tuile `i` (ainsi que celles qui la séparent de la case vide, dans la même ligne/colonne). Renvoie le nombre de tuiles déplacées. */
export function cliquer(t: number[], n: number, i: number): number {
  const vide = t.indexOf(0);
  const lv = Math.floor(vide / n);
  const cv = vide % n;
  const l = Math.floor(i / n);
  const c = i % n;
  if (i === vide || (l !== lv && c !== cv)) return 0;
  const pas = l === lv ? (c > cv ? 1 : -1) : l > lv ? n : -n;
  let k = vide;
  let nb = 0;
  while (k !== i) {
    t[k] = t[k + pas]!;
    k += pas;
    nb++;
  }
  t[i] = 0;
  return nb;
}

/** Déplacement « flèche » : la tuile voisine de la case vide, du côté opposé à la direction, glisse vers la case vide. */
export function indexPourDirection(t: readonly number[], n: number, d: 'haut' | 'bas' | 'gauche' | 'droite'): number {
  const vide = t.indexOf(0);
  const l = Math.floor(vide / n);
  const c = vide % n;
  if (d === 'haut') return l + 1 < n ? vide + n : -1;
  if (d === 'bas') return l > 0 ? vide - n : -1;
  if (d === 'gauche') return c + 1 < n ? vide + 1 : -1;
  return c > 0 ? vide - 1 : -1;
}

/** Mélange en jouant des coups légaux depuis la grille résolue : toujours soluble. */
export function melanger(n: number, rng: Rng = Math.random): number[] {
  const t = resolu(n);
  let precedent = -1;
  for (let k = 0; k < n * n * 40 || estResolu(t); k++) {
    const vide = t.indexOf(0);
    const l = Math.floor(vide / n);
    const c = vide % n;
    const voisins: number[] = [];
    if (l > 0) voisins.push(vide - n);
    if (l < n - 1) voisins.push(vide + n);
    if (c > 0) voisins.push(vide - 1);
    if (c < n - 1) voisins.push(vide + 1);
    const choix = voisins.filter((v) => v !== precedent);
    const v = choix[entier(choix.length, rng)]!;
    precedent = vide;
    cliquer(t, n, v);
  }
  return t;
}

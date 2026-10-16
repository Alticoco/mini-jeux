import { entier, type Rng } from '../../shared/alea';
import { estMot, prefixesMots } from '../../shared/dictionnaire';

export const N = 4;
const LETTRES = 'EEEEEEEEEEEEAAAAAAAAIIIIIIIISSSSSSSNNNNNNRRRRRRTTTTTTOOOOOOLLLLLUUUUUDDDCCCMMMPPGGBFHVJXYZ';

function voisins(i: number): number[] {
  const l = Math.floor(i / N);
  const c = i % N;
  const res: number[] = [];
  for (let dl = -1; dl <= 1; dl++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dl && !dc) continue;
      const nl = l + dl;
      const nc = c + dc;
      if (nl >= 0 && nl < N && nc >= 0 && nc < N) res.push(nl * N + nc);
    }
  return res;
}

/** Existe-t-il un chemin de cases voisines (sans réutilisation) qui épelle le mot ? */
export function existeChemin(grille: readonly string[], mot: string): boolean {
  const m = mot.toLowerCase();
  const rec = (i: number, k: number, vu: Set<number>): boolean => {
    if (grille[i]!.toLowerCase() !== m[k]) return false;
    if (k === m.length - 1) return true;
    vu.add(i);
    const ok = voisins(i).some((v) => !vu.has(v) && rec(v, k + 1, vu));
    vu.delete(i);
    return ok;
  };
  return m.length > 0 && grille.some((_, i) => rec(i, 0, new Set()));
}

/** Tous les mots (≥ 3 lettres) du dictionnaire présents dans la grille. */
export function trouverMots(grille: readonly string[]): Set<string> {
  const pref = prefixesMots();
  const res = new Set<string>();
  const rec = (i: number, mot: string, vu: Set<number>): void => {
    const m = mot + grille[i]!.toLowerCase();
    if (!pref.has(m)) return;
    if (m.length >= 3 && estMot(m)) res.add(m);
    vu.add(i);
    for (const v of voisins(i)) if (!vu.has(v)) rec(v, m, vu);
    vu.delete(i);
  };
  grille.forEach((_, i) => rec(i, '', new Set()));
  return res;
}

/** Grille de 16 lettres comportant au moins `minMots` mots (meilleure de plusieurs essais). */
export function genererGrille(minMots = 30, rng: Rng = Math.random): { grille: string[]; mots: Set<string> } {
  let meilleur: { grille: string[]; mots: Set<string> } | null = null;
  for (let essai = 0; essai < 600; essai++) {
    const grille = Array.from({ length: N * N }, () => LETTRES[entier(LETTRES.length, rng)]!);
    const mots = trouverMots(grille);
    if (!meilleur || mots.size > meilleur.mots.size) meilleur = { grille, mots };
    if (mots.size >= minMots) break;
  }
  return meilleur!;
}

export function points(mot: string): number {
  const n = mot.length;
  return n <= 4 ? 1 : n === 5 ? 2 : n === 6 ? 3 : n === 7 ? 5 : 11;
}

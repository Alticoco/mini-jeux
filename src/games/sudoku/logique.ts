import { melanger, type Rng } from '../../shared/alea';

export type NiveauSudoku = 'facile' | 'moyen' | 'difficile' | 'expert';
export const NIVEAUX_SUDOKU: NiveauSudoku[] = ['facile', 'moyen', 'difficile', 'expert'];
/** Nombre d'indices visés (le générateur s'arrête avant si l'unicité l'empêche). */
export const INDICES: Record<NiveauSudoku, number> = { facile: 40, moyen: 34, difficile: 29, expert: 24 };

export type Grille = number[]; // 81 valeurs, 0 = vide

const PAIRES: number[][] = Array.from({ length: 81 }, (_, i) => {
  const l = Math.floor(i / 9);
  const c = i % 9;
  const bl = l - (l % 3);
  const bc = c - (c % 3);
  const s = new Set<number>();
  for (let k = 0; k < 9; k++) {
    s.add(l * 9 + k);
    s.add(k * 9 + c);
    s.add((bl + Math.floor(k / 3)) * 9 + bc + (k % 3));
  }
  s.delete(i);
  return [...s];
});

export function voisines(i: number): readonly number[] {
  return PAIRES[i]!;
}

export function possibles(g: Grille, i: number): number[] {
  const interdits = new Set(PAIRES[i]!.map((k) => g[k]!));
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => !interdits.has(v));
}

/** Compte les solutions (jusqu'à `limite`). Modifie puis restaure la grille. */
export function compterSolutions(g: Grille, limite = 2): number {
  let meilleur = -1;
  let options: number[] = [];
  for (let i = 0; i < 81; i++) {
    if (g[i] !== 0) continue;
    const p = possibles(g, i);
    if (p.length === 0) return 0;
    if (meilleur < 0 || p.length < options.length) {
      meilleur = i;
      options = p;
      if (p.length === 1) break;
    }
  }
  if (meilleur < 0) return 1;
  let total = 0;
  for (const v of options) {
    g[meilleur] = v;
    total += compterSolutions(g, limite - total);
    g[meilleur] = 0;
    if (total >= limite) break;
  }
  return total;
}

function remplir(g: Grille, rng: Rng): boolean {
  let meilleur = -1;
  let options: number[] = [];
  for (let i = 0; i < 81; i++) {
    if (g[i] !== 0) continue;
    const p = possibles(g, i);
    if (p.length === 0) return false;
    if (meilleur < 0 || p.length < options.length) {
      meilleur = i;
      options = p;
    }
  }
  if (meilleur < 0) return true;
  for (const v of melanger(options, rng)) {
    g[meilleur] = v;
    if (remplir(g, rng)) return true;
  }
  g[meilleur] = 0;
  return false;
}

export function resoudre(g: Grille): Grille | null {
  const copie = [...g];
  return remplir(copie, () => 0.5) ? copie : null;
}

export function generer(niveau: NiveauSudoku, rng: Rng = Math.random): { puzzle: Grille; solution: Grille } {
  const solution: Grille = Array(81).fill(0);
  remplir(solution, rng);
  const puzzle = [...solution];
  let indices = 81;
  for (const i of melanger(Array.from({ length: 81 }, (_, k) => k), rng)) {
    if (indices <= INDICES[niveau]) break;
    const v = puzzle[i]!;
    puzzle[i] = 0;
    if (compterSolutions(puzzle) === 1) indices--;
    else puzzle[i] = v;
  }
  return { puzzle, solution };
}

/** Cases dont la valeur est en conflit avec une case voisine. */
export function conflits(g: Grille): Set<number> {
  const res = new Set<number>();
  for (let i = 0; i < 81; i++) {
    if (g[i] && PAIRES[i]!.some((k) => g[k] === g[i])) res.add(i);
  }
  return res;
}

export function termine(g: Grille, solution: Grille): boolean {
  return g.every((v, i) => v === solution[i]);
}

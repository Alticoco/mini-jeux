import { entier, type Rng } from '../../shared/alea';

/** États : 0 = inconnu, 1 = mer (noir), 2 = terre marquée (point). */
export interface Puzzle { n: number; nombres: number[] } // nombres[i] = taille de l'île si la case est numérotée, sinon 0

function voisins(n: number, i: number): number[] {
  const l = Math.floor(i / n);
  const c = i % n;
  return [l > 0 ? i - n : -1, l < n - 1 ? i + n : -1, c > 0 ? i - 1 : -1, c < n - 1 ? i + 1 : -1].filter((k) => k >= 0);
}

export function mer2x2(n: number, mer: readonly boolean[]): number[] {
  const res: number[] = [];
  for (let l = 0; l < n - 1; l++)
    for (let c = 0; c < n - 1; c++) {
      const i = l * n + c;
      if (mer[i] && mer[i + 1] && mer[i + n] && mer[i + n + 1]) res.push(i);
    }
  return res;
}

export function merConnexe(n: number, mer: readonly boolean[]): boolean {
  const cases = mer.flatMap((m, i) => (m ? [i] : []));
  if (!cases.length) return false;
  const vu = new Set([cases[0]!]);
  const pile = [cases[0]!];
  while (pile.length) for (const v of voisins(n, pile.pop()!)) if (mer[v] && !vu.has(v)) { vu.add(v); pile.push(v); }
  return vu.size === cases.length;
}

/** Îles = composantes connexes de cases non mer. */
export function iles(n: number, mer: readonly boolean[]): number[][] {
  const vu = new Set<number>();
  const res: number[][] = [];
  for (let i = 0; i < n * n; i++) {
    if (mer[i] || vu.has(i)) continue;
    const ile = [i];
    vu.add(i);
    for (let k = 0; k < ile.length; k++) for (const v of voisins(n, ile[k]!)) if (!mer[v] && !vu.has(v)) { vu.add(v); ile.push(v); }
    res.push(ile);
  }
  return res;
}

export interface Verification { ok: boolean; ilesFausses: number[]; piscines: number[]; connexe: boolean }

export function verifier(p: Puzzle, etat: readonly number[]): Verification {
  const mer = etat.map((v) => v === 1);
  const ilesFausses: number[] = [];
  for (const ile of iles(p.n, mer)) {
    const numerotees = ile.filter((i) => p.nombres[i]! > 0);
    if (numerotees.length !== 1 || p.nombres[numerotees[0]!] !== ile.length) ilesFausses.push(...ile);
  }
  const piscines = mer2x2(p.n, mer);
  const connexe = merConnexe(p.n, mer);
  return { ok: !ilesFausses.length && !piscines.length && connexe, ilesFausses, piscines, connexe };
}

/**
 * Génère un puzzle : on fait « pousser » une mer connexe sans carré de 2×2 ; la terre restante forme les îles
 * (on exige des îles de taille raisonnable). Un chiffre est posé sur une case de chaque île.
 */
export function generer(n: number, rng: Rng = Math.random): { puzzle: Puzzle; solution: boolean[] } {
  const cibleMer = Math.round(n * n * 0.62);
  for (let essai = 0; essai < 5000; essai++) {
    const mer = Array<boolean>(n * n).fill(false);
    const depart = entier(n * n, rng);
    mer[depart] = true;
    let nb = 1;
    let echecs = 0;
    while (nb < cibleMer && echecs < 400) {
      const i = entier(n * n, rng);
      if (mer[i] || !voisins(n, i).some((v) => mer[v])) { echecs++; continue; }
      mer[i] = true;
      if (mer2x2(n, mer).length) { mer[i] = false; echecs++; continue; }
      nb++;
    }
    const ilesTrouvees = iles(n, mer);
    if (ilesTrouvees.length < 3 || ilesTrouvees.some((ile) => ile.length > 7)) continue;
    const nombres = Array<number>(n * n).fill(0);
    for (const ile of ilesTrouvees) nombres[ile[entier(ile.length, rng)]!] = ile.length;
    return { puzzle: { n, nombres }, solution: mer };
  }
  throw new Error('génération Nurikabe impossible');
}

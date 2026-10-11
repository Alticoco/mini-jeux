import { melanger, type Rng } from '../../shared/alea';

export const L = 10;
export const H = 20;

/** Cellules (x, y) de chaque pièce dans sa boîte de taille n, rotation 0. */
const FORMES: Array<{ n: number; cellules: Array<[number, number]> }> = [
  { n: 4, cellules: [[0, 1], [1, 1], [2, 1], [3, 1]] }, // I
  { n: 2, cellules: [[0, 0], [1, 0], [0, 1], [1, 1]] }, // O
  { n: 3, cellules: [[1, 0], [0, 1], [1, 1], [2, 1]] }, // T
  { n: 3, cellules: [[1, 0], [2, 0], [0, 1], [1, 1]] }, // S
  { n: 3, cellules: [[0, 0], [1, 0], [1, 1], [2, 1]] }, // Z
  { n: 3, cellules: [[0, 0], [0, 1], [1, 1], [2, 1]] }, // J
  { n: 3, cellules: [[2, 0], [0, 1], [1, 1], [2, 1]] }, // L
];
export const NB_PIECES = FORMES.length;

export interface Piece { type: number; rot: number; x: number; y: number }

export interface Etat {
  grille: number[][]; // H lignes de L cases : 0 vide, sinon type+1
  piece: Piece;
  suivante: number;
  sac: number[];
  score: number;
  lignes: number;
  niveau: number;
  fini: boolean;
}

export function cellules(p: Piece): Array<[number, number]> {
  const f = FORMES[p.type]!;
  let cs = f.cellules;
  for (let r = 0; r < p.rot % 4; r++) cs = cs.map(([x, y]) => [f.n - 1 - y, x] as [number, number]);
  return cs.map(([x, y]) => [x + p.x, y + p.y] as [number, number]);
}

export function valide(grille: number[][], p: Piece): boolean {
  return cellules(p).every(([x, y]) => x >= 0 && x < L && y < H && (y < 0 || grille[y]![x] === 0));
}

function tirer(e: { sac: number[] }, rng: Rng): number {
  if (!e.sac.length) e.sac = melanger(Array.from({ length: NB_PIECES }, (_, i) => i), rng);
  return e.sac.pop()!;
}

const depart = (type: number): Piece => ({ type, rot: 0, x: Math.floor((L - FORMES[type]!.n) / 2), y: type === 0 ? -1 : 0 });

export function nouvelle(niveau = 1, rng: Rng = Math.random): Etat {
  const e: Etat = { grille: Array.from({ length: H }, () => Array<number>(L).fill(0)), piece: depart(0), suivante: 0, sac: [], score: 0, lignes: 0, niveau, fini: false };
  e.piece = depart(tirer(e, rng));
  e.suivante = tirer(e, rng);
  return e;
}

export function deplacer(e: Etat, dx: number): boolean {
  const p = { ...e.piece, x: e.piece.x + dx };
  if (e.fini || !valide(e.grille, p)) return false;
  e.piece = p;
  return true;
}

export function tourner(e: Etat, sens = 1): boolean {
  if (e.fini) return false;
  const rot = (e.piece.rot + sens + 4) % 4;
  for (const dx of [0, -1, 1, -2, 2]) {
    const p = { ...e.piece, rot, x: e.piece.x + dx };
    if (valide(e.grille, p)) { e.piece = p; return true; }
  }
  return false;
}

const POINTS = [0, 100, 300, 500, 800];

/** Fixe la pièce, retire les lignes pleines, fait apparaître la suivante. Renvoie le nombre de lignes retirées. */
export function fixer(e: Etat, rng: Rng = Math.random): number {
  for (const [x, y] of cellules(e.piece)) if (y >= 0) e.grille[y]![x] = e.piece.type + 1;
  const restantes = e.grille.filter((l) => l.some((c) => c === 0));
  const retirees = H - restantes.length;
  e.grille = [...Array.from({ length: retirees }, () => Array<number>(L).fill(0)), ...restantes];
  e.lignes += retirees;
  e.score += POINTS[retirees]! * e.niveau;
  e.niveau = Math.max(e.niveau, 1 + Math.floor(e.lignes / 10));
  e.piece = depart(e.suivante);
  e.suivante = tirer(e, rng);
  if (!valide(e.grille, e.piece)) e.fini = true;
  return retirees;
}

/** Descend d'une case ; fixe la pièce si elle est posée. Renvoie 'bouge', 'fixe'. */
export function descendre(e: Etat, rng: Rng = Math.random): { fixe: boolean; lignes: number } {
  const p = { ...e.piece, y: e.piece.y + 1 };
  if (valide(e.grille, p)) { e.piece = p; return { fixe: false, lignes: 0 }; }
  return { fixe: true, lignes: fixer(e, rng) };
}

export function chuteDure(e: Etat, rng: Rng = Math.random): number {
  let cases = 0;
  while (valide(e.grille, { ...e.piece, y: e.piece.y + 1 })) { e.piece = { ...e.piece, y: e.piece.y + 1 }; cases++; }
  e.score += cases * 2;
  fixer(e, rng);
  return cases;
}

export function ombre(e: Etat): Piece {
  let p = e.piece;
  while (valide(e.grille, { ...p, y: p.y + 1 })) p = { ...p, y: p.y + 1 };
  return p;
}

/** Délai de chute (ms) selon le niveau. */
export function delai(niveau: number): number {
  return Math.max(70, 800 - (niveau - 1) * 65);
}

export function cellulesSuivante(type: number): Array<[number, number]> {
  return cellules({ type, rot: 0, x: 0, y: 0 });
}

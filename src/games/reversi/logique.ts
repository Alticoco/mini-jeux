import type { Difficulte } from '../../core/types';
import { choisir, type Rng } from '../../shared/alea';

/** 0 vide, 1 noir (joueur), 2 blanc (ordinateur). */
export type Pion = 0 | 1 | 2;
export type Plateau = Pion[];
export const N = 8;

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] as const;

export function depart(): Plateau {
  const p = Array<Pion>(64).fill(0);
  p[27] = 2; p[36] = 2; p[28] = 1; p[35] = 1;
  return p;
}

export const adversaire = (j: 1 | 2): 1 | 2 => (j === 1 ? 2 : 1);

/** Cases retournées si j joue en i (liste vide : coup illégal). */
export function retournees(p: Plateau, i: number, j: 1 | 2): number[] {
  if (p[i] !== 0) return [];
  const l = Math.floor(i / N);
  const c = i % N;
  const res: number[] = [];
  for (const [dl, dc] of DIRS) {
    const ligne: number[] = [];
    let nl = l + dl;
    let nc = c + dc;
    while (nl >= 0 && nl < N && nc >= 0 && nc < N && p[nl * N + nc] === adversaire(j)) {
      ligne.push(nl * N + nc);
      nl += dl;
      nc += dc;
    }
    if (ligne.length && nl >= 0 && nl < N && nc >= 0 && nc < N && p[nl * N + nc] === j) res.push(...ligne);
  }
  return res;
}

export function coupsLegaux(p: Plateau, j: 1 | 2): number[] {
  return p.flatMap((_, i) => (retournees(p, i, j).length ? [i] : []));
}

export function jouer(p: Plateau, i: number, j: 1 | 2): Plateau {
  const r = retournees(p, i, j);
  const q = [...p];
  q[i] = j;
  for (const k of r) q[k] = j;
  return q;
}

export function score(p: Plateau): { noir: number; blanc: number } {
  return { noir: p.filter((v) => v === 1).length, blanc: p.filter((v) => v === 2).length };
}

export function fini(p: Plateau): boolean {
  return coupsLegaux(p, 1).length === 0 && coupsLegaux(p, 2).length === 0;
}

const POIDS = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, 1, 1, 1, 1, -2, 10,
  5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5,
  10, -2, 1, 1, 1, 1, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100,
];

function evaluer(p: Plateau, moi: 1 | 2): number {
  let s = 0;
  for (let i = 0; i < 64; i++) if (p[i]) s += (p[i] === moi ? 1 : -1) * POIDS[i]!;
  const mob = coupsLegaux(p, moi).length - coupsLegaux(p, adversaire(moi)).length;
  return s + mob * 3;
}

function alphabeta(p: Plateau, prof: number, alpha: number, beta: number, tour: 1 | 2, moi: 1 | 2): number {
  const coups = coupsLegaux(p, tour);
  if (prof === 0) return evaluer(p, moi);
  if (!coups.length) {
    if (!coupsLegaux(p, adversaire(tour)).length) {
      const s = score(p);
      const diff = (moi === 1 ? s.noir - s.blanc : s.blanc - s.noir);
      return diff * 1000;
    }
    return alphabeta(p, prof - 1, alpha, beta, adversaire(tour), moi);
  }
  if (tour === moi) {
    let v = -Infinity;
    for (const i of coups) {
      v = Math.max(v, alphabeta(jouer(p, i, tour), prof - 1, alpha, beta, adversaire(tour), moi));
      alpha = Math.max(alpha, v);
      if (alpha >= beta) break;
    }
    return v;
  }
  let v = Infinity;
  for (const i of coups) {
    v = Math.min(v, alphabeta(jouer(p, i, tour), prof - 1, alpha, beta, adversaire(tour), moi));
    beta = Math.min(beta, v);
    if (alpha >= beta) break;
  }
  return v;
}

const PROFONDEUR: Record<Difficulte, number> = { facile: 1, moyen: 2, difficile: 4 };

export function coupOrdi(p: Plateau, moi: 1 | 2, niveau: Difficulte, rng: Rng = Math.random): number {
  const coups = coupsLegaux(p, moi);
  if (niveau === 'facile' && rng() < 0.4) return choisir(coups, rng);
  let meilleur = -Infinity;
  let choix: number[] = [];
  for (const i of coups) {
    const v = alphabeta(jouer(p, i, moi), PROFONDEUR[niveau] - 1, -Infinity, Infinity, adversaire(moi), moi);
    if (v > meilleur) { meilleur = v; choix = [i]; } else if (v === meilleur) choix.push(i);
  }
  return choisir(choix, rng);
}

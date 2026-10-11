import type { Difficulte } from '../../core/types';
import { choisir, type Rng } from '../../shared/alea';

/**
 * Dames 8×8 (règles brésiliennes) : prise obligatoire, prise en arrière autorisée pour les pions,
 * dames volantes, prise majoritaire obligatoire.
 * 0 vide · 1 pion joueur · 2 dame joueur · 3 pion ordi · 4 dame ordi. Le joueur est en bas et monte.
 */
export type Case = 0 | 1 | 2 | 3 | 4;
export type Plateau = Case[];
export type Camp = 'joueur' | 'ordi';
export const N = 8;

export interface Coup {
  de: number;
  vers: number;
  pris: number[];
}

const DIAGS = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const;

export const estCamp = (v: Case, c: Camp): boolean => (c === 'joueur' ? v === 1 || v === 2 : v === 3 || v === 4);
const estDame = (v: Case) => v === 2 || v === 4;
export const adverse = (c: Camp): Camp => (c === 'joueur' ? 'ordi' : 'joueur');

export function depart(): Plateau {
  const p = Array<Case>(64).fill(0);
  for (let l = 0; l < 8; l++) {
    for (let c = 0; c < 8; c++) {
      if ((l + c) % 2 !== 1) continue;
      if (l < 3) p[l * 8 + c] = 3;
      else if (l > 4) p[l * 8 + c] = 1;
    }
  }
  return p;
}

const dans = (l: number, c: number) => l >= 0 && l < 8 && c >= 0 && c < 8;

function captures(p: Plateau, de: number, camp: Camp): Coup[] {
  const piece = p[de]!;
  const dame = estDame(piece);
  const resultats: Coup[] = [];
  const pris = new Set<number>();
  const l0 = Math.floor(de / 8);
  const c0 = de % 8;

  const explorer = (l: number, c: number, nb: number): void => {
    let prolonge = false;
    for (const [dl, dc] of DIAGS) {
      let nl = l + dl;
      let nc = c + dc;
      if (dame) while (dans(nl, nc) && (p[nl * 8 + nc] === 0 || nl * 8 + nc === de) && !pris.has(nl * 8 + nc)) { nl += dl; nc += dc; }
      if (!dans(nl, nc)) continue;
      const i = nl * 8 + nc;
      if (pris.has(i) || !estCamp(p[i]!, adverse(camp))) continue;
      // la case d'atterrissage doit être libre (la case de départ compte comme libre)
      let al = nl + dl;
      let ac = nc + dc;
      const atterrissages: number[] = [];
      while (dans(al, ac) && (p[al * 8 + ac] === 0 || al * 8 + ac === de)) {
        atterrissages.push(al * 8 + ac);
        if (!dame) break;
        al += dl;
        ac += dc;
      }
      if (!atterrissages.length) continue;
      pris.add(i);
      for (const a of atterrissages) {
        prolonge = true;
        explorer(Math.floor(a / 8), a % 8, nb + 1);
      }
      pris.delete(i);
    }
    if (!prolonge && nb > 0) resultats.push({ de, vers: l * 8 + c, pris: [...pris] });
  };
  explorer(l0, c0, 0);
  return resultats;
}

function simples(p: Plateau, de: number, camp: Camp): Coup[] {
  const piece = p[de]!;
  const l = Math.floor(de / 8);
  const c = de % 8;
  const res: Coup[] = [];
  for (const [dl, dc] of DIAGS) {
    if (!estDame(piece) && dl !== (camp === 'joueur' ? -1 : 1)) continue;
    let nl = l + dl;
    let nc = c + dc;
    while (dans(nl, nc) && p[nl * 8 + nc] === 0) {
      res.push({ de, vers: nl * 8 + nc, pris: [] });
      if (!estDame(piece)) break;
      nl += dl;
      nc += dc;
    }
  }
  return res;
}

/** Coups légaux (prise obligatoire et majoritaire). */
export function coupsLegaux(p: Plateau, camp: Camp): Coup[] {
  const pieces = p.flatMap((v, i) => (estCamp(v, camp) ? [i] : []));
  let prises = pieces.flatMap((i) => captures(p, i, camp));
  if (prises.length) {
    const max = Math.max(...prises.map((c) => c.pris.length));
    prises = prises.filter((c) => c.pris.length === max);
    return prises;
  }
  return pieces.flatMap((i) => simples(p, i, camp));
}

export function appliquer(p: Plateau, coup: Coup): Plateau {
  const q = [...p];
  const piece = q[coup.de]!;
  q[coup.de] = 0;
  for (const i of coup.pris) q[i] = 0;
  const ligne = Math.floor(coup.vers / 8);
  let nouv = piece;
  if (piece === 1 && ligne === 0) nouv = 2;
  if (piece === 3 && ligne === 7) nouv = 4;
  q[coup.vers] = nouv;
  return q;
}

const VAL: Record<Case, number> = { 0: 0, 1: 100, 2: 320, 3: -100, 4: -320 };

function evaluer(p: Plateau): number {
  // du point de vue de l'ordi : positif = bon pour l'ordi
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const v = p[i]!;
    if (!v) continue;
    s -= VAL[v];
    const l = Math.floor(i / 8);
    if (v === 3) s += l * 4;
    if (v === 1) s -= (7 - l) * 4;
    const c = i % 8;
    if (c === 0 || c === 7) s += v <= 2 ? -3 : 3;
  }
  return s;
}

function negamax(p: Plateau, prof: number, alpha: number, beta: number, camp: Camp): number {
  const coups = coupsLegaux(p, camp);
  const signe = camp === 'ordi' ? 1 : -1;
  if (!coups.length) return -100000 - prof; // le camp qui ne peut plus jouer perd
  if (prof === 0) return signe * evaluer(p);
  let meilleur = -Infinity;
  for (const c of coups) {
    const v = -negamax(appliquer(p, c), prof - 1, -beta, -alpha, adverse(camp));
    if (v > meilleur) meilleur = v;
    if (meilleur > alpha) alpha = meilleur;
    if (alpha >= beta) break;
  }
  return meilleur;
}

const PROFONDEUR: Record<Difficulte, number> = { facile: 1, moyen: 4, difficile: 6 };

export function coupOrdi(p: Plateau, niveau: Difficulte, rng: Rng = Math.random): Coup {
  const coups = coupsLegaux(p, 'ordi');
  if (niveau === 'facile' && rng() < 0.35) return choisir(coups, rng);
  let meilleur = -Infinity;
  let choix: Coup[] = [];
  for (const c of coups) {
    const v = -negamax(appliquer(p, c), PROFONDEUR[niveau] - 1, -Infinity, Infinity, 'joueur');
    if (v > meilleur) { meilleur = v; choix = [c]; } else if (v === meilleur) choix.push(c);
  }
  return choisir(choix, rng);
}

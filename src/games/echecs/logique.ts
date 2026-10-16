import { choisir, type Rng } from '../../shared/alea';
import type { Difficulte } from '../../core/types';

/**
 * Échecs. Case 0 = a8 … case 63 = h1 (rangée 8 en haut). Blancs positifs, noirs négatifs.
 * Pièces : 1 pion, 2 cavalier, 3 fou, 4 tour, 5 dame, 6 roi.
 */
export type Camp = 1 | -1;
export const PION = 1, CAVALIER = 2, FOU = 3, TOUR = 4, DAME = 5, ROI = 6;

export interface Etat {
  b: number[];
  tour: Camp;
  /** Droits de roque : [petit blanc, grand blanc, petit noir, grand noir]. */
  droits: [boolean, boolean, boolean, boolean];
  ep: number; // case de prise en passant, -1 si aucune
  demi: number; // demi-coups sans prise ni coup de pion
  num: number;
}

export interface Coup { de: number; vers: number; promo?: number; roque?: boolean; ep?: boolean }

const ligne = (i: number) => i >> 3;
const col = (i: number) => i & 7;
const DEP_CAVALIER: Array<[number, number]> = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const DIAGONALES: Array<[number, number]> = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const DROITES: Array<[number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function depart(): Etat {
  return depuisFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
}

export function depuisFen(fen: string): Etat {
  const [pos, trait, roques, ep, demi, num] = fen.split(' ');
  const b: number[] = [];
  const codes: Record<string, number> = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 };
  for (const c of pos!) {
    if (c === '/') continue;
    if (/\d/.test(c)) for (let k = 0; k < Number(c); k++) b.push(0);
    else b.push(c === c.toLowerCase() ? -codes[c]! : codes[c.toLowerCase()]!);
  }
  const epCase = ep && ep !== '-' ? (8 - Number(ep[1])) * 8 + (ep.charCodeAt(0) - 97) : -1;
  return {
    b, tour: trait === 'w' ? 1 : -1,
    droits: [roques!.includes('K'), roques!.includes('Q'), roques!.includes('k'), roques!.includes('q')],
    ep: epCase, demi: Number(demi ?? 0), num: Number(num ?? 1),
  };
}

export const cloner = (e: Etat): Etat => ({ ...e, b: [...e.b], droits: [...e.droits] as Etat['droits'] });

export function nomCase(i: number): string {
  return String.fromCharCode(97 + col(i)) + (8 - ligne(i));
}

export const notation = (c: Coup): string => `${nomCase(c.de)}${nomCase(c.vers)}${c.promo ? 'nbrq'[c.promo - 2] : ''}`;

/** La case est-elle attaquée par une pièce du camp donné ? */
export function attaquee(b: readonly number[], sq: number, par: Camp): boolean {
  const l = ligne(sq), c = col(sq);
  // pions : un pion blanc attaque vers le haut (lignes décroissantes), donc il se trouve sur la ligne l+1
  const lp = par === 1 ? l + 1 : l - 1;
  if (lp >= 0 && lp < 8) for (const dc of [-1, 1]) if (c + dc >= 0 && c + dc < 8 && b[lp * 8 + c + dc] === par * PION) return true;
  for (const [dl, dc] of DEP_CAVALIER) {
    const nl = l + dl, nc = c + dc;
    if (nl >= 0 && nl < 8 && nc >= 0 && nc < 8 && b[nl * 8 + nc] === par * CAVALIER) return true;
  }
  for (let dl = -1; dl <= 1; dl++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dl && !dc) continue;
      const nl = l + dl, nc = c + dc;
      if (nl >= 0 && nl < 8 && nc >= 0 && nc < 8 && b[nl * 8 + nc] === par * ROI) return true;
    }
  for (const [dirs, pieces] of [[DIAGONALES, [FOU, DAME]], [DROITES, [TOUR, DAME]]] as Array<[Array<[number, number]>, number[]]>) {
    for (const [dl, dc] of dirs) {
      let nl = l + dl, nc = c + dc;
      while (nl >= 0 && nl < 8 && nc >= 0 && nc < 8) {
        const v = b[nl * 8 + nc]!;
        if (v) { if (v * par > 0 && pieces.includes(Math.abs(v))) return true; break; }
        nl += dl; nc += dc;
      }
    }
  }
  return false;
}

export function caseRoi(b: readonly number[], camp: Camp): number {
  return b.indexOf(camp * ROI);
}

export const enEchec = (e: Etat, camp: Camp = e.tour): boolean => attaquee(e.b, caseRoi(e.b, camp), -camp as Camp);

/** Coups pseudo-légaux (le roi peut encore être en échec après). */
export function generer(e: Etat, seulementPrises = false): Coup[] {
  const { b, tour } = e;
  const res: Coup[] = [];
  const ajouter = (de: number, vers: number, extra: Partial<Coup> = {}) => res.push({ de, vers, ...extra });
  for (let i = 0; i < 64; i++) {
    const v = b[i]!;
    if (!v || v * tour < 0) continue;
    const type = Math.abs(v);
    const l = ligne(i), c = col(i);
    if (type === PION) {
      const avance = tour === 1 ? -1 : 1;
      const base = tour === 1 ? 6 : 1;
      const derniere = tour === 1 ? 0 : 7;
      const l1 = l + avance;
      if (l1 < 0 || l1 > 7) continue;
      const promotions = (de: number, vers: number) => { for (const p of [DAME, TOUR, FOU, CAVALIER]) ajouter(de, vers, { promo: p }); };
      if (!seulementPrises && !b[l1 * 8 + c]) {
        if (l1 === derniere) promotions(i, l1 * 8 + c);
        else {
          ajouter(i, l1 * 8 + c);
          if (l === base && !b[(l + 2 * avance) * 8 + c]) ajouter(i, (l + 2 * avance) * 8 + c);
        }
      }
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (nc < 0 || nc > 7) continue;
        const cible = l1 * 8 + nc;
        if (b[cible]! * tour < 0) { if (l1 === derniere) promotions(i, cible); else ajouter(i, cible); }
        else if (cible === e.ep) ajouter(i, cible, { ep: true });
      }
    } else if (type === CAVALIER || type === ROI) {
      const dirs: Array<[number, number]> = type === CAVALIER ? DEP_CAVALIER : [...DIAGONALES, ...DROITES];
      for (const [dl, dc] of dirs) {
        const nl = l + dl, nc = c + dc;
        if (nl < 0 || nl > 7 || nc < 0 || nc > 7) continue;
        const cible = nl * 8 + nc;
        if (b[cible]! * tour > 0) continue;
        if (seulementPrises && !b[cible]) continue;
        ajouter(i, cible);
      }
      if (type === ROI && !seulementPrises) {
        const r = tour === 1 ? 0 : 2;
        const base = tour === 1 ? 60 : 4;
        if (i === base && !attaquee(b, base, -tour as Camp)) {
          if (e.droits[r] && !b[base + 1] && !b[base + 2] && b[base + 3] === tour * TOUR && !attaquee(b, base + 1, -tour as Camp) && !attaquee(b, base + 2, -tour as Camp)) ajouter(base, base + 2, { roque: true });
          if (e.droits[r + 1] && !b[base - 1] && !b[base - 2] && !b[base - 3] && b[base - 4] === tour * TOUR && !attaquee(b, base - 1, -tour as Camp) && !attaquee(b, base - 2, -tour as Camp)) ajouter(base, base - 2, { roque: true });
        }
      }
    } else {
      const dirs = type === FOU ? DIAGONALES : type === TOUR ? DROITES : [...DIAGONALES, ...DROITES];
      for (const [dl, dc] of dirs) {
        let nl = l + dl, nc = c + dc;
        while (nl >= 0 && nl < 8 && nc >= 0 && nc < 8) {
          const cible = nl * 8 + nc;
          const w = b[cible]!;
          if (w * tour > 0) break;
          if (!seulementPrises || w) ajouter(i, cible);
          if (w) break;
          nl += dl; nc += dc;
        }
      }
    }
  }
  return res;
}

interface Annulation { capture: number; droits: Etat['droits']; ep: number; demi: number; num: number; piece: number }

/** Joue le coup en modifiant l'état ; renvoie de quoi le défaire. */
export function faire(e: Etat, m: Coup): Annulation {
  const piece = e.b[m.de]!;
  const a: Annulation = { capture: e.b[m.vers]!, droits: [...e.droits] as Etat['droits'], ep: e.ep, demi: e.demi, num: e.num, piece };
  const camp = e.tour;
  e.b[m.de] = 0;
  if (m.ep) { a.capture = e.b[m.vers - camp * -8]!; e.b[m.vers - camp * -8] = 0; }
  e.b[m.vers] = m.promo ? camp * m.promo : piece;
  if (m.roque) {
    const grand = m.vers < m.de;
    const tourDe = grand ? m.de - 4 : m.de + 3;
    e.b[grand ? m.de - 1 : m.de + 1] = e.b[tourDe]!;
    e.b[tourDe] = 0;
  }
  // droits de roque
  if (Math.abs(piece) === ROI) { if (camp === 1) { e.droits[0] = e.droits[1] = false; } else { e.droits[2] = e.droits[3] = false; } }
  for (const sq of [m.de, m.vers]) {
    if (sq === 63) e.droits[0] = false; else if (sq === 56) e.droits[1] = false; else if (sq === 7) e.droits[2] = false; else if (sq === 0) e.droits[3] = false;
  }
  e.ep = Math.abs(piece) === PION && Math.abs(m.vers - m.de) === 16 ? (m.de + m.vers) / 2 : -1;
  e.demi = Math.abs(piece) === PION || a.capture ? 0 : e.demi + 1;
  if (camp === -1) e.num++;
  e.tour = -camp as Camp;
  return a;
}

export function defaire(e: Etat, m: Coup, a: Annulation): void {
  e.tour = -e.tour as Camp;
  const camp = e.tour;
  e.b[m.de] = a.piece;
  if (m.ep) { e.b[m.vers] = 0; e.b[m.vers - camp * -8] = a.capture; }
  else e.b[m.vers] = a.capture;
  if (m.roque) {
    const grand = m.vers < m.de;
    const tourDe = grand ? m.de - 4 : m.de + 3;
    e.b[tourDe] = e.b[grand ? m.de - 1 : m.de + 1]!;
    e.b[grand ? m.de - 1 : m.de + 1] = 0;
  }
  e.droits = a.droits;
  e.ep = a.ep;
  e.demi = a.demi;
  e.num = a.num;
}

/** Coups légaux (le roi n'est jamais laissé en échec). */
export function coupsLegaux(e: Etat): Coup[] {
  const camp = e.tour;
  const res: Coup[] = [];
  for (const m of generer(e)) {
    const a = faire(e, m);
    if (!attaquee(e.b, caseRoi(e.b, camp), -camp as Camp)) res.push(m);
    defaire(e, m, a);
  }
  return res;
}

export function jouer(e: Etat, m: Coup): Etat {
  const n = cloner(e);
  faire(n, m);
  return n;
}

export type Fin = 'mat' | 'pat' | 'cinquante' | 'materiel' | 'repetition' | null;

function materielInsuffisant(b: readonly number[]): boolean {
  const pieces = b.filter((v) => v && Math.abs(v) !== ROI).map(Math.abs);
  if (pieces.length === 0) return true;
  if (pieces.length === 1 && (pieces[0] === CAVALIER || pieces[0] === FOU)) return true;
  return false;
}

export function cleePosition(e: Etat): string {
  return `${e.b.join('')}${e.tour}${e.droits.map(Number).join('')}${e.ep}`;
}

export function finDePartie(e: Etat, cles: readonly string[] = []): Fin {
  if (!coupsLegaux(e).length) return enEchec(e) ? 'mat' : 'pat';
  if (materielInsuffisant(e.b)) return 'materiel';
  if (e.demi >= 100) return 'cinquante';
  if (cles.filter((c) => c === cleePosition(e)).length >= 3) return 'repetition';
  return null;
}

export function perft(e: Etat, profondeur: number): number {
  if (profondeur === 0) return 1;
  let n = 0;
  for (const m of coupsLegaux(e)) {
    const a = faire(e, m);
    n += perft(e, profondeur - 1);
    defaire(e, m, a);
  }
  return n;
}

/* ------------------------------------ Intelligence artificielle ------------------------------------ */

const VAL = [0, 100, 320, 330, 500, 900, 0];
const PST_PION = [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0];
const PST_CAV = [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50];
const PST_FOU = [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20];
const PST_TOUR = [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0];
const PST_ROI = [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20];
const PST: number[][] = [[], PST_PION, PST_CAV, PST_FOU, PST_TOUR, Array<number>(64).fill(0), PST_ROI];

/** Évaluation du point de vue des blancs. */
export function evaluer(e: Etat): number {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const v = e.b[i]!;
    if (!v) continue;
    const t = Math.abs(v);
    s += v > 0 ? VAL[t]! + PST[t]![i]! : -(VAL[t]! + PST[t]![i ^ 56]!);
  }
  return s;
}

const MATE = 100000;

function ordonner(e: Etat, coups: Coup[]): Coup[] {
  const score = (m: Coup) => (e.b[m.vers] ? 10 * Math.abs(e.b[m.vers]!) - Math.abs(e.b[m.de]!) + 100 : 0) + (m.promo ? 80 : 0);
  return coups.sort((a, b) => score(b) - score(a));
}

class Delai extends Error {}

function quiescence(e: Etat, alpha: number, beta: number, fin: number, prof: number): number {
  const stand = evaluer(e) * e.tour;
  if (stand >= beta) return beta;
  if (prof <= 0) return stand;
  if (stand > alpha) alpha = stand;
  const camp = e.tour;
  for (const m of ordonner(e, generer(e, true))) {
    const a = faire(e, m);
    if (attaquee(e.b, caseRoi(e.b, camp), -camp as Camp)) { defaire(e, m, a); continue; }
    const v = -quiescence(e, -beta, -alpha, fin, prof - 1);
    defaire(e, m, a);
    if (v >= beta) return beta;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

function negamax(e: Etat, prof: number, alpha: number, beta: number, fin: number, ply: number): number {
  if (performance.now() > fin) throw new Delai();
  if (prof === 0) return quiescence(e, alpha, beta, fin, 4);
  const camp = e.tour;
  let legaux = 0;
  for (const m of ordonner(e, generer(e))) {
    const a = faire(e, m);
    if (attaquee(e.b, caseRoi(e.b, camp), -camp as Camp)) { defaire(e, m, a); continue; }
    legaux++;
    const v = -negamax(e, prof - 1, -beta, -alpha, fin, ply + 1);
    defaire(e, m, a);
    if (v >= beta) return beta;
    if (v > alpha) alpha = v;
  }
  if (!legaux) return enEchec(e) ? -MATE + ply : 0;
  return alpha;
}

const PARAM: Record<Difficulte, { prof: number; ms: number; hasard: number }> = {
  facile: { prof: 1, ms: 300, hasard: 0.35 },
  moyen: { prof: 3, ms: 900, hasard: 0 },
  difficile: { prof: 5, ms: 2200, hasard: 0 },
};

/** Meilleur coup trouvé dans le temps imparti (approfondissement itératif). */
export function meilleurCoup(e0: Etat, niveau: Difficulte, rng: Rng = Math.random): Coup | null {
  const e = cloner(e0);
  const legaux = coupsLegaux(e);
  if (!legaux.length) return null;
  const p = PARAM[niveau];
  if (rng() < p.hasard) return choisir(legaux, rng);
  const fin = performance.now() + p.ms;
  let meilleur: Coup = ordonner(e, [...legaux])[0]!;
  for (let prof = 1; prof <= p.prof; prof++) {
    try {
      let alpha = -Infinity;
      let courant: Coup = meilleur;
      const ordre = ordonner(e, [...legaux]);
      // le meilleur coup de la profondeur précédente est examiné en premier
      ordre.sort((a, b) => (b === meilleur ? 1 : 0) - (a === meilleur ? 1 : 0));
      for (const m of ordre) {
        const a = faire(e, m);
        const v = -negamax(e, prof - 1, -Infinity, -alpha, fin, 1);
        defaire(e, m, a);
        if (v > alpha) { alpha = v; courant = m; }
      }
      meilleur = courant;
      if (alpha > MATE - 100) break;
    } catch (err) {
      if (err instanceof Delai) break;
      throw err;
    }
  }
  return meilleur;
}

import { entier, type Rng } from '../../shared/alea';

export const OBJECTIF = 5;
export const MIN_JOUEURS = 2;
export const MAX_JOUEURS = 4;
export const DELAI_MIN = 1500;
export const DELAI_MAX = 5000;

/** Touches de chaque joueur (KeyboardEvent.key en minuscules) et leur libellé affiché. */
export const TOUCHES = [
  { cle: 'a', libelle: 'A' },
  { cle: 'p', libelle: 'P' },
  { cle: 'arrowleft', libelle: '←' },
  { cle: 'arrowright', libelle: '→' },
] as const;

export type Phase = 'repos' | 'attente' | 'vert' | 'fini';

export interface Dernier {
  type: 'point' | 'faux';
  joueur: number;
  /** Temps de réaction en ms (0 pour un faux départ). */
  ms: number;
}

export interface Etat {
  n: number;
  scores: number[];
  phase: Phase;
  /** Instant (ms) où la zone est passée au vert. */
  vertA: number | null;
  dernier: Dernier | null;
  gagnant: number | null;
  fini: boolean;
}

export function nouvelle(n: number): Etat {
  if (n < MIN_JOUEURS || n > MAX_JOUEURS) throw new Error('nombre de joueurs invalide');
  return { n, scores: Array<number>(n).fill(0), phase: 'repos', vertA: null, dernier: null, gagnant: null, fini: false };
}

/** Délai aléatoire avant le passage au vert. */
export function delaiAleatoire(rng: Rng = Math.random): number {
  return DELAI_MIN + entier(DELAI_MAX - DELAI_MIN + 1, rng);
}

/** Joueur (0-based) associé à une touche, ou -1. */
export function joueurPourTouche(cle: string, n: number): number {
  const i = TOUCHES.findIndex((t) => t.cle === cle.toLowerCase());
  return i >= 0 && i < n ? i : -1;
}

export function lancerManche(e: Etat): void {
  if (e.phase !== 'repos') return;
  e.phase = 'attente';
  e.vertA = null;
  e.dernier = null;
}

export function passerAuVert(e: Etat, t: number): void {
  if (e.phase !== 'attente') return;
  e.phase = 'vert';
  e.vertA = t;
}

/**
 * Un joueur appuie à l'instant t (ms).
 * - avant le vert : faux départ, le joueur perd un point (minimum 0), la manche s'arrête ;
 * - au vert : premier appui = point pour ce joueur, la manche s'arrête.
 * Renvoie le résultat, ou null si l'appui n'a pas d'effet.
 */
export function appui(e: Etat, joueur: number, t: number): Dernier | null {
  if (joueur < 0 || joueur >= e.n) return null;
  if (e.phase === 'attente') {
    e.scores[joueur] = Math.max(0, e.scores[joueur]! - 1);
    e.phase = 'repos';
    e.dernier = { type: 'faux', joueur, ms: 0 };
    return e.dernier;
  }
  if (e.phase === 'vert') {
    e.scores[joueur]!++;
    e.dernier = { type: 'point', joueur, ms: Math.max(0, Math.round(t - (e.vertA ?? t))) };
    if (e.scores[joueur]! >= OBJECTIF) { e.phase = 'fini'; e.fini = true; e.gagnant = joueur; }
    else e.phase = 'repos';
    e.vertA = null;
    return e.dernier;
  }
  return null;
}

/** Gagnant de la manche parmi plusieurs appuis (joueur, instant) : le plus rapide après le vert ; null si aucun. */
export function gagnantManche(vertA: number, appuis: ReadonlyArray<{ joueur: number; t: number }>): { joueur: number; ms: number } | null {
  let meilleur: { joueur: number; t: number } | null = null;
  for (const a of appuis) if (a.t >= vertA && (!meilleur || a.t < meilleur.t)) meilleur = a;
  return meilleur ? { joueur: meilleur.joueur, ms: Math.round(meilleur.t - vertA) } : null;
}

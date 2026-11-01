import { entier, type Rng } from '../../shared/alea';

export const OBJECTIF = 100;
export const MIN_JOUEURS = 2;
export const MAX_JOUEURS = 4;

export interface Etat {
  noms: string[];
  scores: number[];
  courant: number;
  /** Points accumulés pendant le tour en cours (non banqués). */
  cumul: number;
  /** Dernier dé lancé (null en début de tour). */
  de: number | null;
  /** Gagnant, une fois la partie finie. */
  gagnant: number | null;
  fini: boolean;
}

export function nomsParDefaut(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `Joueur ${i + 1}`);
}

/** Nettoie les prénoms : vides remplacés par « Joueur i », limités à 16 caractères. */
export function nettoyerNoms(noms: readonly string[]): string[] {
  return noms.map((n, i) => n.trim().slice(0, 16) || `Joueur ${i + 1}`);
}

export function nouvelle(noms: readonly string[]): Etat {
  const propres = nettoyerNoms(noms);
  if (propres.length < MIN_JOUEURS || propres.length > MAX_JOUEURS) throw new Error('nombre de joueurs invalide');
  return { noms: propres, scores: propres.map(() => 0), courant: 0, cumul: 0, de: null, gagnant: null, fini: false };
}

function suivant(e: Etat): void {
  e.courant = (e.courant + 1) % e.noms.length;
  e.cumul = 0;
}

/** Lance le dé. Un 1 fait perdre le cumul du tour et passe la main. Renvoie la valeur du dé. */
export function lancer(e: Etat, rng: Rng = Math.random): number {
  if (e.fini) return e.de ?? 0;
  const d = 1 + entier(6, rng);
  e.de = d;
  if (d === 1) suivant(e);
  else e.cumul += d;
  return d;
}

/** Banque le cumul ; fin de partie si l'objectif est atteint, sinon passe la main. */
export function garder(e: Etat): void {
  if (e.fini || e.cumul === 0) return;
  e.scores[e.courant]! += e.cumul;
  if (e.scores[e.courant]! >= OBJECTIF) {
    e.fini = true;
    e.gagnant = e.courant;
    e.cumul = 0;
    return;
  }
  suivant(e);
  e.de = null;
}

export function valide(x: unknown): x is Etat {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Partial<Etat>;
  const n = e.noms?.length ?? 0;
  return Array.isArray(e.noms) && e.noms.every((s) => typeof s === 'string')
    && n >= MIN_JOUEURS && n <= MAX_JOUEURS
    && Array.isArray(e.scores) && e.scores.length === n && e.scores.every((s) => Number.isInteger(s) && s >= 0)
    && Number.isInteger(e.courant) && e.courant! >= 0 && e.courant! < n
    && Number.isInteger(e.cumul) && e.cumul! >= 0
    && (e.de === null || (Number.isInteger(e.de) && e.de! >= 1 && e.de! <= 6))
    && (e.gagnant === null || Number.isInteger(e.gagnant))
    && typeof e.fini === 'boolean';
}

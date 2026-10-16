import { choisir, entier, type Rng } from '../../shared/alea';
import type { Difficulte } from '../../core/types';

export const N = 10;
export const FLOTTE = [5, 4, 3, 3, 2];
export const NOMS_NAVIRES = ['Porte-avions', 'Croiseur', 'Contre-torpilleur', 'Sous-marin', 'Torpilleur'];

export interface Navire { taille: number; cases: number[] }

/** État d'une case tirée : 0 = inconnue, 1 = à l'eau, 2 = touché, 3 = coulé. */
export type Tir = 0 | 1 | 2 | 3;

export interface Plateau { navires: Navire[]; tirs: Tir[] }

export const nouveauPlateau = (): Plateau => ({ navires: [], tirs: Array<Tir>(N * N).fill(0) });

export function casesNavire(depart: number, taille: number, horizontal: boolean): number[] | null {
  const l = Math.floor(depart / N);
  const c = depart % N;
  if (horizontal ? c + taille > N : l + taille > N) return null;
  return Array.from({ length: taille }, (_, k) => (horizontal ? depart + k : depart + k * N));
}

/** Les cases sont-elles libres, et sans contact (même en diagonale) avec un autre navire ? */
export function peutPlacer(p: Plateau, cases: readonly number[] | null): boolean {
  if (!cases) return false;
  const occupees = new Set(p.navires.flatMap((n) => n.cases));
  for (const c of cases) {
    const l = Math.floor(c / N);
    const col = c % N;
    for (let dl = -1; dl <= 1; dl++)
      for (let dc = -1; dc <= 1; dc++) {
        const nl = l + dl, nc = col + dc;
        if (nl >= 0 && nl < N && nc >= 0 && nc < N && occupees.has(nl * N + nc)) return false;
      }
  }
  return true;
}

export function placerAleatoire(rng: Rng = Math.random): Plateau {
  for (;;) {
    const p = nouveauPlateau();
    let ok = true;
    for (const taille of FLOTTE) {
      let place = false;
      for (let essai = 0; essai < 200 && !place; essai++) {
        const cases = casesNavire(entier(N * N, rng), taille, rng() < 0.5);
        if (peutPlacer(p, cases)) { p.navires.push({ taille, cases: cases! }); place = true; }
      }
      if (!place) { ok = false; break; }
    }
    if (ok) return p;
  }
}

export interface ResultatTir { resultat: 'eau' | 'touche' | 'coule' | 'deja'; navire?: Navire }

export function tirer(p: Plateau, i: number): ResultatTir {
  if (p.tirs[i] !== 0) return { resultat: 'deja' };
  const n = p.navires.find((nv) => nv.cases.includes(i));
  if (!n) { p.tirs[i] = 1; return { resultat: 'eau' }; }
  p.tirs[i] = 2;
  if (n.cases.every((c) => p.tirs[c] !== 0)) {
    for (const c of n.cases) p.tirs[c] = 3;
    return { resultat: 'coule', navire: n };
  }
  return { resultat: 'touche', navire: n };
}

export const flotteCoulee = (p: Plateau): boolean => p.navires.length > 0 && p.navires.every((n) => n.cases.every((c) => p.tirs[c] === 3));

export const naviresRestants = (p: Plateau): number[] => p.navires.filter((n) => !n.cases.every((c) => p.tirs[c] === 3)).map((n) => n.taille);

const voisins = (i: number): number[] => {
  const l = Math.floor(i / N), c = i % N;
  return [l > 0 ? i - N : -1, l < N - 1 ? i + N : -1, c > 0 ? i - 1 : -1, c < N - 1 ? i + 1 : -1].filter((v) => v >= 0);
};

/** Tir de l'ordinateur à partir de ce qu'il connaît (tirs) et des tailles de navires encore à flot. */
export function choixTir(tirs: readonly Tir[], restants: readonly number[], niveau: Difficulte, rng: Rng = Math.random): number {
  const inconnues = tirs.flatMap((t, i) => (t === 0 ? [i] : []));
  if (niveau === 'facile') return choisir(inconnues, rng);
  const touches = tirs.flatMap((t, i) => (t === 2 ? [i] : []));
  if (niveau === 'moyen') {
    const cibles = touches.flatMap((t) => voisins(t)).filter((v) => tirs[v] === 0);
    if (cibles.length) return choisir(cibles, rng);
    const damier = inconnues.filter((i) => (Math.floor(i / N) + (i % N)) % 2 === 0);
    return choisir(damier.length ? damier : inconnues, rng);
  }
  // difficile : carte de probabilité (positions possibles de chaque navire restant)
  const poids = Array<number>(N * N).fill(0);
  for (const taille of restants) {
    for (const horizontal of [true, false]) {
      for (let d = 0; d < N * N; d++) {
        const cases = casesNavire(d, taille, horizontal);
        if (!cases || cases.some((c) => tirs[c] === 1 || tirs[c] === 3)) continue;
        const nbTouches = cases.filter((c) => tirs[c] === 2).length;
        const w = nbTouches ? 1 + nbTouches * 25 : 1;
        for (const c of cases) if (tirs[c] === 0) poids[c] = poids[c]! + w;
      }
    }
  }
  const max = Math.max(...inconnues.map((i) => poids[i]!));
  return choisir(inconnues.filter((i) => poids[i] === max), rng);
}

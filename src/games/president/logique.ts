import { choisir, type Rng } from '../../shared/alea';
import { paquetMelange, type Carte } from '../../shared/cartes';
import type { Difficulte } from '../../core/types';

/** Président (Trou du cul) à 4 joueurs. Force des cartes : 3 < 4 < … < roi < as < 2. */
export const NB = 4;
export const force = (c: Carte): number => (c.rang === 2 ? 15 : c.rang === 1 ? 14 : c.rang);

export interface Etat {
  mains: Carte[][];
  pli: { joueur: number; cartes: Carte[] } | null; // dernière pose encore « sur la table »
  dernier: number; // dernier joueur ayant posé
  passes: number; // passes consécutives depuis la dernière pose
  tour: number;
  classement: number[]; // joueurs sortis, dans l'ordre
}

export function nouvelle(rng: Rng = Math.random): Etat {
  const p = paquetMelange(rng);
  const mains: Carte[][] = Array.from({ length: NB }, () => []);
  p.forEach((c, i) => mains[i % NB]!.push(c));
  for (const m of mains) m.sort((a, b) => force(a) - force(b) || a.couleur.localeCompare(b.couleur));
  // le joueur qui détient le 3 de trèfle commence
  const depart = mains.findIndex((m) => m.some((c) => c.rang === 3 && c.couleur === 'trefle'));
  return { mains, pli: null, dernier: depart, passes: 0, tour: depart, classement: [] };
}

export const actifs = (e: Etat): number[] => Array.from({ length: NB }, (_, i) => i).filter((i) => !e.classement.includes(i));
export const fini = (e: Etat): boolean => actifs(e).length <= 1;

function suivant(e: Etat, j: number): number {
  for (let k = 1; k <= NB; k++) {
    const n = (j + k) % NB;
    if (!e.classement.includes(n)) return n;
  }
  return j;
}

/** Une pose est légale si toutes les cartes ont le même rang, et (à l'ouverture) ou (même nombre et force supérieure). */
export function posePossible(e: Etat, j: number, cartes: readonly Carte[]): boolean {
  if (e.tour !== j || !cartes.length || cartes.length > 4) return false;
  if (!cartes.every((c) => c.rang === cartes[0]!.rang)) return false;
  if (!cartes.every((c) => e.mains[j]!.includes(c))) return false;
  if (!e.pli) return true;
  return cartes.length === e.pli.cartes.length && force(cartes[0]!) > force(e.pli.cartes[0]!);
}

/** Toutes les poses légales du joueur j (un groupe par nombre de cartes). */
export function poses(e: Etat, j: number): Carte[][] {
  const groupes = new Map<number, Carte[]>();
  for (const c of e.mains[j]!) groupes.set(c.rang, [...(groupes.get(c.rang) ?? []), c]);
  const res: Carte[][] = [];
  for (const g of [...groupes.values()].sort((a, b) => force(a[0]!) - force(b[0]!))) {
    const tailles = e.pli ? [e.pli.cartes.length] : Array.from({ length: g.length }, (_, k) => k + 1);
    for (const n of tailles) {
      if (n > g.length) continue;
      const cartes = g.slice(0, n);
      if (posePossible(e, j, cartes)) res.push(cartes);
    }
  }
  return res;
}

function viderPli(e: Etat): void {
  e.pli = null;
  e.passes = 0;
  e.tour = e.classement.includes(e.dernier) ? suivant(e, e.dernier) : e.dernier;
}

export function jouer(e: Etat, j: number, cartes: Carte[]): boolean {
  if (!posePossible(e, j, cartes)) return false;
  e.mains[j] = e.mains[j]!.filter((c) => !cartes.includes(c));
  e.pli = { joueur: j, cartes };
  e.dernier = j;
  e.passes = 0;
  if (!e.mains[j]!.length) e.classement.push(j);
  if (fini(e)) { const reste = actifs(e)[0]; if (reste !== undefined) e.classement.push(reste); return true; }
  if (cartes[0]!.rang === 2) { viderPli(e); return true; } // un 2 coupe : on rejoue
  e.tour = suivant(e, j);
  return true;
}

export function passer(e: Etat, j: number): boolean {
  if (e.tour !== j || !e.pli) return false;
  e.passes++;
  const aAttendre = actifs(e).filter((i) => i !== e.dernier).length;
  if (e.passes >= aAttendre) viderPli(e);
  else e.tour = suivant(e, j);
  return true;
}

/** Décision de l'ordinateur : une pose ou null (passer). */
export function choixOrdi(e: Etat, j: number, niveau: Difficulte, rng: Rng = Math.random): Carte[] | null {
  const options = poses(e, j);
  if (!options.length) return null;
  const main = e.mains[j]!;
  if (!e.pli) {
    // ouverture : on se débarrasse des petites cartes, par le plus grand groupe disponible de la plus petite valeur
    const plusBas = Math.min(...options.map((o) => force(o[0]!)));
    const bas = options.filter((o) => force(o[0]!) === plusBas);
    return niveau === 'facile' ? choisir(options, rng) : bas[bas.length - 1]!;
  }
  const meilleure = options[0]!; // la plus faible pose possible
  const forte = force(meilleure[0]!) >= 14;
  const reste = main.length - meilleure.length;
  const autreProcheDeFinir = e.mains.some((m, i) => i !== j && !e.classement.includes(i) && m.length <= 2);
  if (niveau === 'facile') return meilleure;
  if (forte && reste > 3 && !autreProcheDeFinir) return rng() < (niveau === 'difficile' ? 0.8 : 0.4) ? null : meilleure;
  return meilleure;
}

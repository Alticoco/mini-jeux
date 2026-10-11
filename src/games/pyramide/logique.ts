import { paquetMelange, type Carte } from '../../shared/cartes';
import type { Rng } from '../../shared/alea';

export interface Etat {
  pyr: Array<Carte | null>; // 28 cartes, rangée r (0..6), colonne c (0..r) -> r(r+1)/2 + c
  talon: Carte[]; // dessus = dernier
  defausse: Carte[]; // dessus = dernier
  recyclages: number;
  coups: number;
}

export const MAX_RECYCLAGES = 2;
export const idx = (r: number, c: number): number => (r * (r + 1)) / 2 + c;

export function nouvelle(rng: Rng = Math.random): Etat {
  const p = paquetMelange(rng);
  return { pyr: p.slice(0, 28), talon: p.slice(28), defausse: [], recyclages: 0, coups: 0 };
}

export function ligneColonne(i: number): [number, number] {
  let r = 0;
  while (idx(r + 1, 0) <= i) r++;
  return [r, i - idx(r, 0)];
}

/** Carte libre : plus aucune carte ne la recouvre. */
export function libre(e: Etat, i: number): boolean {
  if (!e.pyr[i]) return false;
  const [r, c] = ligneColonne(i);
  if (r === 6) return true;
  return !e.pyr[idx(r + 1, c)] && !e.pyr[idx(r + 1, c + 1)];
}

export type Ref = { type: 'pyr'; i: number } | { type: 'defausse' };

export function carteDe(e: Etat, r: Ref): Carte | null {
  if (r.type === 'defausse') return e.defausse[e.defausse.length - 1] ?? null;
  return libre(e, r.i) ? e.pyr[r.i]! : null;
}

function retirer(e: Etat, r: Ref): void {
  if (r.type === 'defausse') e.defausse.pop();
  else e.pyr[r.i] = null;
}

/** Retire un roi seul. */
export function retirerRoi(e: Etat, r: Ref): boolean {
  const c = carteDe(e, r);
  if (!c || c.rang !== 13) return false;
  retirer(e, r);
  e.coups++;
  return true;
}

/** Retire deux cartes libres dont la somme vaut 13. */
export function retirerPaire(e: Etat, a: Ref, b: Ref): boolean {
  if (a.type === b.type && (a.type === 'defausse' || (b.type === 'pyr' && a.i === b.i))) return false;
  const ca = carteDe(e, a);
  const cb = carteDe(e, b);
  if (!ca || !cb || ca.rang + cb.rang !== 13) return false;
  retirer(e, a);
  retirer(e, b);
  e.coups++;
  return true;
}

export function piocher(e: Etat): boolean {
  if (e.talon.length) {
    e.defausse.push(e.talon.pop()!);
    return true;
  }
  if (e.defausse.length && e.recyclages < MAX_RECYCLAGES) {
    e.talon = e.defausse.reverse();
    e.defausse = [];
    e.recyclages++;
    return true;
  }
  return false;
}

export function gagne(e: Etat): boolean {
  return e.pyr.every((c) => c === null);
}

/** Reste-t-il un coup (retrait ou pioche) ? */
export function coupPossible(e: Etat): boolean {
  if (e.talon.length || (e.defausse.length && e.recyclages < MAX_RECYCLAGES)) return true;
  const refs: Ref[] = [...e.pyr.keys()].filter((i) => libre(e, i)).map((i) => ({ type: 'pyr' as const, i }));
  if (e.defausse.length) refs.push({ type: 'defausse' });
  const cartes = refs.map((r) => carteDe(e, r)!);
  return cartes.some((c, i) => c.rang === 13 || cartes.some((d, k) => k !== i && c.rang + d.rang === 13));
}

import { paquetMelange, type Carte } from '../../shared/cartes';
import type { Rng } from '../../shared/alea';

export interface Position { x: number; rang: number }

/** Disposition en trois pics : rangées de 3, 6, 9 et 10 cartes (x en largeurs de carte). */
export const POSITIONS: Position[] = [
  ...[1.5, 4.5, 7.5].map((x) => ({ x, rang: 0 })),
  ...[1, 2, 4, 5, 7, 8].map((x) => ({ x, rang: 1 })),
  ...[0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5].map((x) => ({ x, rang: 2 })),
  ...Array.from({ length: 10 }, (_, x) => ({ x, rang: 3 })),
];

/** Indices des cartes qui recouvrent la carte i. */
export const COUVREURS: number[][] = POSITIONS.map((p) =>
  POSITIONS.flatMap((q, k) => (q.rang === p.rang + 1 && Math.abs(q.x - p.x) === 0.5 ? [k] : [])));

export interface Etat {
  cartes: Array<Carte | null>; // 28 cartes du plateau (null = retirée)
  talon: Carte[];
  defausse: Carte[];
  serie: number; // cartes jouées d'affilée depuis le plateau
  score: number;
}

export function nouvelle(rng: Rng = Math.random): Etat {
  const p = paquetMelange(rng);
  const cartes = p.splice(0, 28);
  const defausse = [p.pop()!];
  return { cartes, talon: p, defausse, serie: 0, score: 0 };
}

export function libre(e: Etat, i: number): boolean {
  return !!e.cartes[i] && COUVREURS[i]!.every((k) => !e.cartes[k]);
}

/** Valeurs voisines, avec passage du roi à l'as autorisé. */
export function voisines(a: number, b: number): boolean {
  const d = Math.abs(a - b);
  return d === 1 || d === 12;
}

export function peutJouer(e: Etat, i: number): boolean {
  const d = e.defausse.at(-1);
  return libre(e, i) && !!d && voisines(e.cartes[i]!.rang, d.rang);
}

export function jouer(e: Etat, i: number): boolean {
  if (!peutJouer(e, i)) return false;
  e.defausse.push(e.cartes[i]!);
  e.cartes[i] = null;
  e.serie++;
  e.score += 10 * e.serie;
  return true;
}

export function piocher(e: Etat): boolean {
  const c = e.talon.pop();
  if (!c) return false;
  e.defausse.push(c);
  e.serie = 0;
  return true;
}

export const restantes = (e: Etat): number => e.cartes.filter(Boolean).length;
export const gagne = (e: Etat): boolean => restantes(e) === 0;
export const bloque = (e: Etat): boolean => !gagne(e) && e.talon.length === 0 && e.cartes.every((_, i) => !peutJouer(e, i));

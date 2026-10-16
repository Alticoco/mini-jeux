import { paquetMelange, type Carte } from '../../shared/cartes';
import type { Rng } from '../../shared/alea';

export interface Etat {
  colonnes: Carte[][]; // 7 colonnes de 5 cartes visibles, dessus = dernier
  talon: Carte[]; // dessus = dernier
  defausse: Carte[]; // dessus = dernier
}

export function nouvelle(rng: Rng = Math.random): Etat {
  const p = paquetMelange(rng);
  const colonnes = Array.from({ length: 7 }, () => p.splice(0, 5));
  const defausse = [p.pop()!];
  return { colonnes, talon: p, defausse };
}

/** Voisins en valeur (sans passer du roi à l'as). */
export function consecutives(a: number, b: number): boolean {
  return Math.abs(a - b) === 1;
}

export function peutJouer(e: Etat, col: number): boolean {
  const c = e.colonnes[col]?.at(-1);
  const d = e.defausse.at(-1);
  return !!c && !!d && consecutives(c.rang, d.rang);
}

export function jouer(e: Etat, col: number): boolean {
  if (!peutJouer(e, col)) return false;
  e.defausse.push(e.colonnes[col]!.pop()!);
  return true;
}

export function piocher(e: Etat): boolean {
  const c = e.talon.pop();
  if (!c) return false;
  e.defausse.push(c);
  return true;
}

export const restantes = (e: Etat): number => e.colonnes.reduce((s, c) => s + c.length, 0);
export const gagne = (e: Etat): boolean => restantes(e) === 0;

export function bloque(e: Etat): boolean {
  return !gagne(e) && e.talon.length === 0 && e.colonnes.every((_, i) => !peutJouer(e, i));
}

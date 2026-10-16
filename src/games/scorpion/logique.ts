import { paquetMelange, type Carte } from '../../shared/cartes';
import type { Rng } from '../../shared/alea';

export interface CarteS extends Carte { visible: boolean }

export interface Etat {
  colonnes: CarteS[][]; // 7 colonnes, dessus = dernier
  talon: Carte[]; // 3 cartes de réserve
  suites: number; // suites complètes retirées (0 à 4)
  coups: number;
}

export function nouvelle(rng: Rng = Math.random): Etat {
  const p = paquetMelange(rng);
  const colonnes: CarteS[][] = [];
  for (let c = 0; c < 7; c++) colonnes.push(p.splice(0, 7).map((carte, i) => ({ ...carte, visible: c >= 4 || i >= 3 })));
  return { colonnes, talon: p, suites: 0, coups: 0 };
}

export const cloner = (e: Etat): Etat => structuredClone(e);

/** Une carte visible se pose sur une carte de même couleur et de valeur supérieure ; un roi va seul sur colonne vide. */
export function peutDeplacer(e: Etat, de: number, index: number, vers: number): boolean {
  if (de === vers) return false;
  const carte = e.colonnes[de]?.[index];
  if (!carte || !carte.visible) return false;
  const dest = e.colonnes[vers]!;
  const dessus = dest[dest.length - 1];
  if (!dessus) return carte.rang === 13;
  return dessus.couleur === carte.couleur && dessus.rang === carte.rang + 1;
}

function retournerDessus(c: CarteS[]): void {
  const d = c[c.length - 1];
  if (d) d.visible = true;
}

function retirerSuites(e: Etat): number {
  let retirees = 0;
  for (const col of e.colonnes) {
    if (col.length < 13) continue;
    const fin = col.slice(-13);
    if (fin.every((c, i) => c.visible && c.couleur === fin[0]!.couleur && c.rang === 13 - i)) {
      col.splice(col.length - 13);
      retournerDessus(col);
      e.suites++;
      retirees++;
    }
  }
  return retirees;
}

export function deplacer(e: Etat, de: number, index: number, vers: number): { ok: boolean; suites: number } {
  if (!peutDeplacer(e, de, index, vers)) return { ok: false, suites: 0 };
  const cartes = e.colonnes[de]!.splice(index);
  e.colonnes[vers]!.push(...cartes);
  retournerDessus(e.colonnes[de]!);
  e.coups++;
  return { ok: true, suites: retirerSuites(e) };
}

export function peutDistribuer(e: Etat): boolean {
  return e.talon.length === 3;
}

export function distribuer(e: Etat): boolean {
  if (!peutDistribuer(e)) return false;
  for (let c = 0; c < 3; c++) e.colonnes[c]!.push({ ...e.talon.pop()!, visible: true });
  e.coups++;
  retirerSuites(e);
  return true;
}

export const gagne = (e: Etat): boolean => e.suites === 4;

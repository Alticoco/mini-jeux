import { COULEURS, estRouge, paquetMelange, type Carte } from '../../shared/cartes';
import type { Rng } from '../../shared/alea';

export interface Etat {
  colonnes: Carte[][]; // 8 colonnes, dessus = dernier
  cellules: Array<Carte | null>; // 4 cellules libres
  fondations: Carte[][]; // une par couleur (ordre COULEURS)
  coups: number;
}

export type Source = { type: 'colonne'; col: number; index: number } | { type: 'cellule'; i: number };
export type Destination = { type: 'colonne'; col: number } | { type: 'cellule'; i: number } | { type: 'fondation' };

export function nouvelle(rng: Rng = Math.random): Etat {
  const p = paquetMelange(rng);
  const colonnes: Carte[][] = Array.from({ length: 8 }, () => []);
  p.forEach((c, i) => colonnes[i % 8]!.push(c));
  return { colonnes, cellules: [null, null, null, null], fondations: [[], [], [], []], coups: 0 };
}

export const cloner = (e: Etat): Etat => structuredClone(e);

const suit = (a: Carte, b: Carte) => estRouge(a.couleur) !== estRouge(b.couleur) && a.rang === b.rang + 1;

export function suiteValide(cartes: readonly Carte[]): boolean {
  for (let i = 0; i < cartes.length - 1; i++) if (!suit(cartes[i]!, cartes[i + 1]!)) return false;
  return true;
}

export function cartesSource(e: Etat, s: Source): Carte[] | null {
  if (s.type === 'cellule') {
    const c = e.cellules[s.i];
    return c ? [c] : null;
  }
  const col = e.colonnes[s.col];
  if (!col || s.index < 0 || s.index >= col.length) return null;
  const reste = col.slice(s.index);
  return suiteValide(reste) ? reste : null;
}

export function cellulesLibres(e: Etat): number {
  return e.cellules.filter((c) => !c).length;
}

/** Nombre maximal de cartes déplaçables d'un coup vers une colonne (vide ou non). */
export function capacite(e: Etat, versColonneVide: boolean): number {
  const vides = e.colonnes.filter((c) => c.length === 0).length - (versColonneVide ? 1 : 0);
  return (cellulesLibres(e) + 1) * 2 ** Math.max(0, vides);
}

export function peutDeplacer(e: Etat, s: Source, d: Destination): boolean {
  const cartes = cartesSource(e, s);
  if (!cartes) return false;
  if (d.type === 'cellule') return cartes.length === 1 && !e.cellules[d.i] && !(s.type === 'cellule' && s.i === d.i);
  if (d.type === 'fondation') {
    if (cartes.length !== 1) return false;
    const c = cartes[0]!;
    return e.fondations[COULEURS.indexOf(c.couleur)]!.length + 1 === c.rang;
  }
  if (s.type === 'colonne' && s.col === d.col) return false;
  const dest = e.colonnes[d.col]!;
  const base = cartes[0]!;
  if (dest.length === 0) return cartes.length <= capacite(e, true);
  return suit(dest[dest.length - 1]!, base) && cartes.length <= capacite(e, false);
}

export function deplacer(e: Etat, s: Source, d: Destination): boolean {
  if (!peutDeplacer(e, s, d)) return false;
  const cartes = cartesSource(e, s)!;
  if (s.type === 'cellule') e.cellules[s.i] = null;
  else e.colonnes[s.col]!.splice(s.index);
  if (d.type === 'cellule') e.cellules[d.i] = cartes[0]!;
  else if (d.type === 'fondation') e.fondations[COULEURS.indexOf(cartes[0]!.couleur)]!.push(cartes[0]!);
  else e.colonnes[d.col]!.push(...cartes);
  e.coups++;
  return true;
}

export function gagne(e: Etat): boolean {
  return e.fondations.every((f) => f.length === 13);
}

/** Toutes les colonnes sont strictement décroissantes : la fin est automatique. */
export function terminable(e: Etat): boolean {
  return !gagne(e) && e.colonnes.every((col) => col.every((c, i) => i === 0 || col[i - 1]!.rang > c.rang));
}

/** Envoie une carte (dessus de colonne ou cellule) vers une fondation. */
export function pasAuto(e: Etat): boolean {
  for (let i = 0; i < 4; i++) if (e.cellules[i] && deplacer(e, { type: 'cellule', i }, { type: 'fondation' })) return true;
  for (let col = 0; col < 8; col++) {
    const c = e.colonnes[col]!;
    if (c.length && deplacer(e, { type: 'colonne', col, index: c.length - 1 }, { type: 'fondation' })) return true;
  }
  return false;
}

/** Destination automatique d'un double-clic : fondation, sinon cellule libre. */
export function destinationAuto(e: Etat, s: Source): Destination | null {
  if (peutDeplacer(e, s, { type: 'fondation' })) return { type: 'fondation' };
  const cartes = cartesSource(e, s);
  if (!cartes || cartes.length !== 1 || s.type === 'cellule') return null;
  const i = e.cellules.findIndex((c) => !c);
  return i >= 0 ? { type: 'cellule', i } : null;
}

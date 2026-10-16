import { COULEURS, estRouge, paquetMelange, type Carte } from '../../shared/cartes';
import type { Rng } from '../../shared/alea';

export interface CarteY extends Carte { visible: boolean }

export interface Etat {
  colonnes: CarteY[][]; // 7 colonnes
  fondations: Carte[][]; // une par couleur (ordre COULEURS)
  coups: number;
}

export function nouvelle(rng: Rng = Math.random): Etat {
  const p = paquetMelange(rng);
  const colonnes: CarteY[][] = [];
  for (let c = 0; c < 7; c++) {
    const n = c === 0 ? 1 : c + 5;
    colonnes.push(p.splice(0, n).map((carte, i) => ({ ...carte, visible: i >= c })));
  }
  return { colonnes, fondations: [[], [], [], []], coups: 0 };
}

export const cloner = (e: Etat): Etat => structuredClone(e);

export function peutDeplacer(e: Etat, de: number, index: number, vers: number): boolean {
  if (de === vers) return false;
  const carte = e.colonnes[de]?.[index];
  if (!carte || !carte.visible) return false;
  const dest = e.colonnes[vers]!;
  const dessus = dest[dest.length - 1];
  if (!dessus) return carte.rang === 13;
  return estRouge(dessus.couleur) !== estRouge(carte.couleur) && dessus.rang === carte.rang + 1;
}

export function deplacer(e: Etat, de: number, index: number, vers: number): boolean {
  if (!peutDeplacer(e, de, index, vers)) return false;
  const cartes = e.colonnes[de]!.splice(index);
  e.colonnes[vers]!.push(...cartes);
  const d = e.colonnes[de]!.at(-1);
  if (d) d.visible = true;
  e.coups++;
  return true;
}

export function peutFondation(e: Etat, col: number): boolean {
  const c = e.colonnes[col]?.at(-1);
  return !!c && c.visible && e.fondations[COULEURS.indexOf(c.couleur)]!.length + 1 === c.rang;
}

export function versFondation(e: Etat, col: number): boolean {
  if (!peutFondation(e, col)) return false;
  const { visible: _v, ...c } = e.colonnes[col]!.pop()!;
  e.fondations[COULEURS.indexOf(c.couleur)]!.push(c);
  const d = e.colonnes[col]!.at(-1);
  if (d) d.visible = true;
  e.coups++;
  return true;
}

export const gagne = (e: Etat): boolean => e.fondations.every((f) => f.length === 13);

/** Fin automatique : tout est visible. On envoie tout ce qui peut l'être aux fondations. */
export function toutVisible(e: Etat): boolean {
  return e.colonnes.every((c) => c.every((k) => k.visible));
}

export function pasAuto(e: Etat): boolean {
  for (let c = 0; c < 7; c++) if (versFondation(e, c)) return true;
  return false;
}

import { melanger, type Rng } from '../../shared/alea';
import { COULEURS, type Carte, type Couleur } from '../../shared/cartes';

export interface CarteS extends Carte { visible: boolean }

export interface Etat {
  colonnes: CarteS[][]; // 10 colonnes
  talon: Carte[]; // jusqu'à 5 distributions de 10 cartes
  suites: number; // suites complètes retirées (0 à 8)
  couleurs: 1 | 2 | 4;
  score: number;
  coups: number;
}

export function paquet(couleurs: 1 | 2 | 4, rng: Rng = Math.random): Carte[] {
  const utilisees: Couleur[] = couleurs === 1 ? ['pique'] : couleurs === 2 ? ['pique', 'coeur'] : [...COULEURS];
  const jeux = 8 / utilisees.length;
  const cartes: Carte[] = [];
  for (const couleur of utilisees)
    for (let k = 0; k < jeux; k++) for (let rang = 1; rang <= 13; rang++) cartes.push({ rang, couleur });
  return melanger(cartes, rng);
}

export function nouvelle(couleurs: 1 | 2 | 4, rng: Rng = Math.random): Etat {
  const p = paquet(couleurs, rng);
  const colonnes: CarteS[][] = [];
  for (let c = 0; c < 10; c++) {
    const n = c < 4 ? 6 : 5;
    colonnes.push(p.splice(0, n).map((carte, i) => ({ ...carte, visible: i === n - 1 })));
  }
  return { colonnes, talon: p, suites: 0, couleurs, score: 500, coups: 0 };
}

export const cloner = (e: Etat): Etat => structuredClone(e);

/** Cartes déplaçables à partir de l'index : suite de même couleur, décroissante, visible. */
export function suiteDepuis(e: Etat, col: number, index: number): CarteS[] | null {
  const c = e.colonnes[col];
  if (!c || index < 0 || index >= c.length) return null;
  const s = c.slice(index);
  for (let i = 0; i < s.length; i++) {
    if (!s[i]!.visible) return null;
    if (i > 0 && (s[i]!.couleur !== s[i - 1]!.couleur || s[i]!.rang !== s[i - 1]!.rang - 1)) return null;
  }
  return s;
}

export function peutDeplacer(e: Etat, de: number, index: number, vers: number): boolean {
  if (de === vers) return false;
  const s = suiteDepuis(e, de, index);
  if (!s) return false;
  const dest = e.colonnes[vers]!;
  if (dest.length === 0) return true;
  return dest[dest.length - 1]!.rang === s[0]!.rang + 1;
}

/** Retire une suite K→A de même couleur en haut d'une colonne. */
function retirerSuite(e: Etat, col: number): boolean {
  const c = e.colonnes[col]!;
  if (c.length < 13) return false;
  const debut = c.length - 13;
  const s = suiteDepuis(e, col, debut);
  if (!s || s[0]!.rang !== 13) return false;
  c.splice(debut);
  e.suites++;
  e.score += 100;
  return true;
}

function retournerDessus(e: Etat, col: number): void {
  const c = e.colonnes[col]!;
  const d = c[c.length - 1];
  if (d && !d.visible) d.visible = true;
}

export function deplacer(e: Etat, de: number, index: number, vers: number): { ok: boolean; suiteRetiree: boolean } {
  if (!peutDeplacer(e, de, index, vers)) return { ok: false, suiteRetiree: false };
  const cartes = e.colonnes[de]!.splice(index);
  e.colonnes[vers]!.push(...cartes);
  retournerDessus(e, de);
  const suiteRetiree = retirerSuite(e, vers);
  if (suiteRetiree) retournerDessus(e, vers);
  e.coups++;
  e.score = Math.max(0, e.score - 1);
  return { ok: true, suiteRetiree };
}

export function peutDistribuer(e: Etat): boolean {
  return e.talon.length >= 10 && e.colonnes.every((c) => c.length > 0);
}

export function distribuer(e: Etat): boolean {
  if (!peutDistribuer(e)) return false;
  for (let c = 0; c < 10; c++) {
    e.colonnes[c]!.push({ ...e.talon.pop()!, visible: true });
    retirerSuite(e, c);
  }
  e.coups++;
  e.score = Math.max(0, e.score - 1);
  return true;
}

export function gagne(e: Etat): boolean {
  return e.suites === 8;
}

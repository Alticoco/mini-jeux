import { entier, melanger, type Rng } from '../../shared/alea';

export interface Position {
  x: number; // en largeurs de tuile
  y: number; // en hauteurs de tuile
  z: number; // couche
}

/** Rangées par couche : [y, largeur]. Les largeurs sont centrées sur 12 colonnes. */
const COUCHES: Array<Array<[number, number]>> = [
  [[0, 8], [1, 10], [2, 12], [3, 12], [4, 12], [5, 10], [6, 8]], // 72
  [[1, 6], [2, 8], [3, 10], [4, 8], [5, 6]], // 38
  [[1.5, 4], [2.5, 6], [3.5, 6], [4.5, 4]], // 20
  [[2, 2], [3, 4], [4, 2]], // 8
  [[2.5, 2], [3.5, 2]], // 4
  [[3, 2]], // 2
];

export const POSITIONS: Position[] = COUCHES.flatMap((rangees, z) =>
  rangees.flatMap(([y, w]) => Array.from({ length: w }, (_, k) => ({ x: (12 - w) / 2 + k, y, z }))));

export const NB_TUILES = POSITIONS.length; // 144

/** Familles : 0-8 caractères, 9-17 bambous, 18-26 cercles, 27-30 vents, 31-33 dragons, 34-37 fleurs, 38-41 saisons. */
export const NB_TYPES = 42;

export function assortis(a: number, b: number): boolean {
  if (a === b) return true;
  return (a >= 34 && a <= 37 && b >= 34 && b <= 37) || (a >= 38 && a <= 41 && b >= 38 && b <= 41);
}

export interface Etat {
  tuiles: number[]; // type de chaque position
  retirees: boolean[];
}

const recouvre = (haut: Position, bas: Position) => haut.z > bas.z && Math.abs(haut.x - bas.x) < 1 && Math.abs(haut.y - bas.y) < 1;
const voisinGauche = (a: Position, b: Position) => a.z === b.z && Math.abs(a.y - b.y) < 1 && Math.abs(b.x - (a.x - 1)) < 0.01;
const voisinDroite = (a: Position, b: Position) => a.z === b.z && Math.abs(a.y - b.y) < 1 && Math.abs(b.x - (a.x + 1)) < 0.01;

function libreParmi(retirees: readonly boolean[], i: number): boolean {
  if (retirees[i]) return false;
  const p = POSITIONS[i]!;
  let gauche = false;
  let droite = false;
  for (let k = 0; k < NB_TUILES; k++) {
    if (retirees[k] || k === i) continue;
    const q = POSITIONS[k]!;
    if (recouvre(q, p)) return false;
    if (voisinGauche(p, q)) gauche = true;
    if (voisinDroite(p, q)) droite = true;
  }
  return !(gauche && droite);
}

export const libre = (e: Etat, i: number): boolean => libreParmi(e.retirees, i);

export function libres(e: Etat): number[] {
  return Array.from({ length: NB_TUILES }, (_, i) => i).filter((i) => libre(e, i));
}

export function coupsPossibles(e: Etat): Array<[number, number]> {
  const l = libres(e);
  const res: Array<[number, number]> = [];
  for (let a = 0; a < l.length; a++)
    for (let b = a + 1; b < l.length; b++) if (assortis(e.tuiles[l[a]!]!, e.tuiles[l[b]!]!)) res.push([l[a]!, l[b]!]);
  return res;
}

/** Donne soluble : on « joue » la partie à l'envers en retirant des paires de tuiles libres au hasard. */
export function nouvelle(rng: Rng = Math.random): Etat {
  for (;;) {
    const retirees = Array<boolean>(NB_TUILES).fill(false);
    const paires: Array<[number, number]> = [];
    let bloque = false;
    while (paires.length < NB_TUILES / 2) {
      const l = Array.from({ length: NB_TUILES }, (_, i) => i).filter((i) => libreParmi(retirees, i));
      if (l.length < 2) { bloque = true; break; }
      const a = l.splice(entier(l.length, rng), 1)[0]!;
      const b = l[entier(l.length, rng)]!;
      retirees[a] = retirees[b] = true;
      paires.push([a, b]);
    }
    if (bloque) continue;
    // 34 types normaux × 2 paires, plus 2 paires de fleurs et 2 paires de saisons
    const types: Array<[number, number]> = [];
    for (let t = 0; t < 34; t++) types.push([t, t], [t, t]);
    types.push([34, 35], [36, 37], [38, 39], [40, 41]);
    const tuiles = Array<number>(NB_TUILES).fill(0);
    melanger(types, rng).forEach(([ta, tb], k) => {
      tuiles[paires[k]![0]] = ta;
      tuiles[paires[k]![1]] = tb;
    });
    return { tuiles, retirees: Array<boolean>(NB_TUILES).fill(false) };
  }
}

export function retirerPaire(e: Etat, a: number, b: number): boolean {
  if (a === b || !libre(e, a) || !libre(e, b) || !assortis(e.tuiles[a]!, e.tuiles[b]!)) return false;
  e.retirees[a] = e.retirees[b] = true;
  return true;
}

export function gagne(e: Etat): boolean {
  return e.retirees.every(Boolean);
}

/** Mélange les tuiles restantes (en garantissant qu'un coup existe). */
export function melangerRestantes(e: Etat, rng: Rng = Math.random): void {
  const restants = e.retirees.flatMap((r, i) => (r ? [] : [i]));
  const types = restants.map((i) => e.tuiles[i]!);
  for (let essai = 0; essai < 200; essai++) {
    melanger(types, rng).forEach((t, k) => { e.tuiles[restants[k]!] = t; });
    if (coupsPossibles(e).length) return;
  }
}

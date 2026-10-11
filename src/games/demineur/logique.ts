import { melanger, type Rng } from '../../shared/alea';
import type { Difficulte } from '../../core/types';

export interface Cellule {
  mine: boolean;
  ouverte: boolean;
  drapeau: boolean;
  voisines: number;
}

export interface Plateau {
  lignes: number;
  colonnes: number;
  mines: number;
  cases: Cellule[];
  genere: boolean;
  perdu: boolean;
}

export const NIVEAUX: Record<Difficulte, { lignes: number; colonnes: number; mines: number }> = {
  facile: { lignes: 9, colonnes: 9, mines: 10 },
  moyen: { lignes: 16, colonnes: 16, mines: 40 },
  difficile: { lignes: 16, colonnes: 30, mines: 99 },
};

export function creer(lignes: number, colonnes: number, mines: number): Plateau {
  return {
    lignes, colonnes, mines, genere: false, perdu: false,
    cases: Array.from({ length: lignes * colonnes }, () => ({ mine: false, ouverte: false, drapeau: false, voisines: 0 })),
  };
}

export function voisins(p: Plateau, i: number): number[] {
  const l = Math.floor(i / p.colonnes);
  const c = i % p.colonnes;
  const res: number[] = [];
  for (let dl = -1; dl <= 1; dl++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dl && !dc) continue;
      const nl = l + dl;
      const nc = c + dc;
      if (nl >= 0 && nl < p.lignes && nc >= 0 && nc < p.colonnes) res.push(nl * p.colonnes + nc);
    }
  return res;
}

/** Place les mines en évitant la case cliquée et ses voisines (premier clic toujours sûr). */
export function genererMines(p: Plateau, premiere: number, rng: Rng = Math.random): void {
  const interdit = new Set([premiere, ...voisins(p, premiere)]);
  let candidats = p.cases.map((_, i) => i).filter((i) => !interdit.has(i));
  if (candidats.length < p.mines) candidats = p.cases.map((_, i) => i).filter((i) => i !== premiere);
  for (const i of melanger(candidats, rng).slice(0, p.mines)) p.cases[i]!.mine = true;
  p.cases.forEach((c, i) => { c.voisines = voisins(p, i).filter((v) => p.cases[v]!.mine).length; });
  p.genere = true;
}

/** Ouvre une case (et propage si 0). Renvoie false si on a sauté sur une mine. */
export function ouvrir(p: Plateau, i: number, rng: Rng = Math.random): boolean {
  if (p.perdu) return false;
  const c0 = p.cases[i]!;
  if (c0.ouverte || c0.drapeau) return true;
  if (!p.genere) genererMines(p, i, rng);
  if (c0.mine) {
    p.perdu = true;
    c0.ouverte = true;
    return false;
  }
  const pile = [i];
  while (pile.length) {
    const k = pile.pop()!;
    const c = p.cases[k]!;
    if (c.ouverte || c.drapeau) continue;
    c.ouverte = true;
    if (c.voisines === 0) pile.push(...voisins(p, k));
  }
  return true;
}

/** Double-clic sur un chiffre : ouvre les voisines si le nombre de drapeaux correspond. */
export function ouvrirAutour(p: Plateau, i: number): boolean {
  const c = p.cases[i]!;
  if (!c.ouverte || c.voisines === 0 || p.perdu) return true;
  const v = voisins(p, i);
  if (v.filter((k) => p.cases[k]!.drapeau).length !== c.voisines) return true;
  let ok = true;
  for (const k of v) if (!ouvrir(p, k)) ok = false;
  return ok;
}

export function basculerDrapeau(p: Plateau, i: number): void {
  const c = p.cases[i]!;
  if (!c.ouverte && !p.perdu) c.drapeau = !c.drapeau;
}

export function gagne(p: Plateau): boolean {
  return !p.perdu && p.genere && p.cases.every((c) => c.mine || c.ouverte);
}

export function drapeauxRestants(p: Plateau): number {
  return p.mines - p.cases.filter((c) => c.drapeau).length;
}

import { entier, type Rng } from '../../shared/alea';

export const L = 480;
export const H = 560;
export const COLS = 10;
export const LIGNES = 5;
export const AL_W = 30;
export const AL_H = 22;
export const PAS_X = 42;
export const PAS_Y = 32;
export const JOUEUR_Y = H - 50;
export const JOUEUR_W = 40;

export interface Tir { x: number; y: number }
export interface Bouclier { x: number; y: number; cases: number[] } // 8×4 cases, pv 0-3

export interface Etat {
  aliens: boolean[]; // LIGNES × COLS
  ox: number; // décalage horizontal de la formation
  oy: number; // décalage vertical
  sens: 1 | -1;
  acc: number; // temps accumulé avant le prochain pas (s)
  joueurX: number;
  tirJoueur: Tir | null;
  tirsAliens: Tir[];
  boucliers: Bouclier[];
  score: number;
  vies: number;
  niveau: number;
  accTir: number;
  rechargement: number;
  fini: boolean;
}

function boucliers(): Bouclier[] {
  return [0, 1, 2, 3].map((k) => ({ x: 60 + k * 110, y: H - 140, cases: Array<number>(32).fill(3) }));
}

export function nouvelle(niveau = 1): Etat {
  return {
    aliens: Array<boolean>(LIGNES * COLS).fill(true), ox: 30, oy: 50 + Math.min(niveau - 1, 5) * 12, sens: 1, acc: 0,
    joueurX: L / 2, tirJoueur: null, tirsAliens: [], boucliers: boucliers(), score: 0, vies: 3, niveau, accTir: 0, rechargement: 0, fini: false,
  };
}

export const nbVivants = (e: Etat): number => e.aliens.filter(Boolean).length;

/** Position d'un alien. */
export const posAlien = (e: Etat, i: number): { x: number; y: number } => ({ x: e.ox + (i % COLS) * PAS_X, y: e.oy + Math.floor(i / COLS) * PAS_Y });

export function deplacerJoueur(e: Etat, dx: number): void {
  e.joueurX = Math.min(L - JOUEUR_W / 2, Math.max(JOUEUR_W / 2, e.joueurX + dx));
}

export function tirer(e: Etat): boolean {
  if (e.tirJoueur || e.fini) return false;
  e.tirJoueur = { x: e.joueurX, y: JOUEUR_Y - 10 };
  return true;
}

function toucheBouclier(e: Etat, x: number, y: number): boolean {
  for (const b of e.boucliers) {
    const cx = Math.floor((x - b.x) / 10);
    const cy = Math.floor((y - b.y) / 10);
    if (cx < 0 || cx >= 8 || cy < 0 || cy >= 4) continue;
    const i = cy * 8 + cx;
    if (b.cases[i]! > 0) { b.cases[i]!--; return true; }
  }
  return false;
}

export interface Evenements { alien: boolean; touche: boolean; niveauTermine: boolean; fin: boolean; pas: boolean }

/** Fait avancer la partie de dt secondes. */
export function avancer(e: Etat, dt: number, rng: Rng = Math.random): Evenements {
  const ev: Evenements = { alien: false, touche: false, niveauTermine: false, fin: false, pas: false };
  if (e.fini) return ev;
  const vivants = nbVivants(e);
  // pas de la formation : plus il reste d'aliens, plus c'est lent
  const delai = Math.max(0.04, (0.06 + vivants * 0.014) / (1 + (e.niveau - 1) * 0.15));
  e.acc += dt;
  while (vivants > 0 && e.acc >= delai) {
    e.acc -= delai;
    ev.pas = true;
    const colonnes = e.aliens.flatMap((v, i) => (v ? [i % COLS] : []));
    const gauche = Math.min(...colonnes), droite = Math.max(...colonnes);
    const xmin = e.ox + gauche * PAS_X;
    const xmax = e.ox + droite * PAS_X + AL_W;
    if ((e.sens === 1 && xmax + 8 > L - 6) || (e.sens === -1 && xmin - 8 < 6)) { e.sens = e.sens === 1 ? -1 : 1; e.oy += 14; }
    else e.ox += 8 * e.sens;
  }
  // tir du joueur
  if (e.tirJoueur) {
    const t = e.tirJoueur;
    t.y -= 520 * dt;
    let fini = t.y < 0;
    if (!fini && toucheBouclier(e, t.x, t.y)) fini = true;
    if (!fini) {
      for (let i = 0; i < e.aliens.length; i++) {
        if (!e.aliens[i]) continue;
        const p = posAlien(e, i);
        if (t.x >= p.x && t.x <= p.x + AL_W && t.y >= p.y && t.y <= p.y + AL_H) {
          e.aliens[i] = false;
          e.score += (LIGNES - Math.floor(i / COLS)) * 10 + 10;
          ev.alien = true;
          fini = true;
          break;
        }
      }
    }
    if (fini) e.tirJoueur = null;
  }
  // tirs des aliens
  e.accTir += dt;
  const cadence = Math.max(0.35, 1.1 - e.niveau * 0.08);
  if (e.accTir >= cadence && vivants) {
    e.accTir = 0;
    const colonnes = Array.from({ length: COLS }, (_, c) => c).filter((c) => e.aliens.some((v, i) => v && i % COLS === c));
    const c = colonnes[entier(colonnes.length, rng)]!;
    let bas = -1;
    for (let l = LIGNES - 1; l >= 0; l--) if (e.aliens[l * COLS + c]) { bas = l * COLS + c; break; }
    const p = posAlien(e, bas);
    e.tirsAliens.push({ x: p.x + AL_W / 2, y: p.y + AL_H });
  }
  const gardes: Tir[] = [];
  for (const t of e.tirsAliens) {
    t.y += (230 + e.niveau * 15) * dt;
    if (t.y > H) continue;
    if (toucheBouclier(e, t.x, t.y)) continue;
    if (t.y >= JOUEUR_Y && t.y <= JOUEUR_Y + 18 && Math.abs(t.x - e.joueurX) <= JOUEUR_W / 2) {
      e.vies--;
      ev.touche = true;
      if (e.vies <= 0) { e.fini = true; ev.fin = true; }
      continue;
    }
    gardes.push(t);
  }
  e.tirsAliens = gardes;
  // invasion
  for (let i = 0; i < e.aliens.length; i++) if (e.aliens[i] && posAlien(e, i).y + AL_H >= JOUEUR_Y) { e.fini = true; e.vies = 0; ev.fin = true; break; }
  if (!nbVivants(e) && !e.fini) ev.niveauTermine = true;
  return ev;
}

export function niveauSuivant(e: Etat): void {
  const n = nouvelle(e.niveau + 1);
  Object.assign(e, { ...n, score: e.score, vies: Math.min(5, e.vies + 1), joueurX: e.joueurX });
}

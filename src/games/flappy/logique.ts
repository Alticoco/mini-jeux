import { entier, type Rng } from '../../shared/alea';
import type { Difficulte } from '../../core/types';

export const L = 400;
export const H = 560;
export const SOL = 40;
export const OISEAU_X = 110;
export const RAYON = 13;
export const LARGEUR_TUYAU = 62;

export interface Tuyau { x: number; gapY: number; passe: boolean }

export interface Etat {
  y: number;
  vy: number;
  tuyaux: Tuyau[];
  score: number;
  fini: boolean;
  demarre: boolean;
  distance: number;
}

export const REGLAGE: Record<Difficulte, { gap: number; vitesse: number; ecart: number }> = {
  facile: { gap: 190, vitesse: 120, ecart: 250 },
  moyen: { gap: 160, vitesse: 150, ecart: 230 },
  difficile: { gap: 135, vitesse: 180, ecart: 210 },
};

export function nouvelle(): Etat {
  return { y: H / 2 - 20, vy: 0, tuyaux: [], score: 0, fini: false, demarre: false, distance: 0 };
}

export function battre(e: Etat): void {
  if (e.fini) return;
  e.demarre = true;
  e.vy = -330;
}

function nouveauTuyau(x: number, gap: number, rng: Rng): Tuyau {
  const marge = 60;
  return { x, gapY: marge + gap / 2 + entier(H - SOL - 2 * marge - gap, rng), passe: false };
}

export interface Evenements { point: boolean; mort: boolean }

export function avancer(e: Etat, dt: number, niveau: Difficulte, rng: Rng = Math.random): Evenements {
  const ev: Evenements = { point: false, mort: false };
  if (e.fini) return ev;
  const r = REGLAGE[niveau];
  if (!e.demarre) { e.y = H / 2 - 20 + Math.sin(performance.now() / 250) * 6; return ev; }
  e.vy = Math.min(520, e.vy + 980 * dt);
  e.y += e.vy * dt;
  e.distance += r.vitesse * dt;
  for (const t of e.tuyaux) t.x -= r.vitesse * dt;
  e.tuyaux = e.tuyaux.filter((t) => t.x > -LARGEUR_TUYAU - 5);
  const dernier = e.tuyaux[e.tuyaux.length - 1];
  if (!dernier || dernier.x < L - r.ecart) e.tuyaux.push(nouveauTuyau(dernier ? dernier.x + r.ecart : L + 120, r.gap, rng));
  for (const t of e.tuyaux) {
    if (!t.passe && t.x + LARGEUR_TUYAU < OISEAU_X - RAYON) { t.passe = true; e.score++; ev.point = true; }
    const dansColonne = OISEAU_X + RAYON > t.x && OISEAU_X - RAYON < t.x + LARGEUR_TUYAU;
    if (dansColonne && (e.y - RAYON < t.gapY - r.gap / 2 || e.y + RAYON > t.gapY + r.gap / 2)) { e.fini = true; ev.mort = true; }
  }
  if (e.y + RAYON > H - SOL) { e.y = H - SOL - RAYON; e.fini = true; ev.mort = true; }
  if (e.y - RAYON < -40) { e.y = -40 + RAYON; e.vy = 0; }
  return ev;
}

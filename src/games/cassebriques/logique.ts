export const LARGEUR = 480;
export const HAUTEUR = 560;
export const COLS = 10;
export const LIGNES = 6;
export const BW = LARGEUR / COLS;
export const BH = 22;
export const HAUT_BRIQUES = 60;
export const RAQ_Y = HAUTEUR - 36;
export const RAQ_H = 12;

export interface Etat {
  raquette: { x: number; w: number }; // x = centre
  balle: { x: number; y: number; vx: number; vy: number; r: number };
  briques: boolean[]; // LIGNES × COLS
  score: number;
  vies: number;
  niveau: number;
  colle: boolean; // balle posée sur la raquette, en attente de lancement
  fini: boolean;
  gagne: boolean;
}

export function nouvelle(niveau = 1): Etat {
  return {
    raquette: { x: LARGEUR / 2, w: 90 },
    balle: { x: LARGEUR / 2, y: RAQ_Y - 8, vx: 0, vy: 0, r: 7 },
    briques: Array<boolean>(LIGNES * COLS).fill(true),
    score: 0, vies: 3, niveau, colle: true, fini: false, gagne: false,
  };
}

export const vitesse = (niveau: number, difficulte: 'facile' | 'moyen' | 'difficile') =>
  (260 + niveau * 25) * (difficulte === 'facile' ? 0.85 : difficulte === 'difficile' ? 1.2 : 1);

export function lancer(e: Etat, v: number): void {
  if (!e.colle) return;
  e.colle = false;
  const a = (-Math.PI / 2) + (Math.random() - 0.5) * 0.6;
  e.balle.vx = Math.cos(a) * v;
  e.balle.vy = Math.sin(a) * v;
}

export function deplacerRaquette(e: Etat, x: number): void {
  e.raquette.x = Math.min(LARGEUR - e.raquette.w / 2, Math.max(e.raquette.w / 2, x));
  if (e.colle) e.balle.x = e.raquette.x;
}

export interface Evenements { brique: boolean; rebond: boolean; perdue: boolean; niveauTermine: boolean }

/** Fait avancer la balle de dt secondes (pas fractionnés pour éviter la traversée). */
export function avancer(e: Etat, dt: number, vitesseBalle: number): Evenements {
  const ev: Evenements = { brique: false, rebond: false, perdue: false, niveauTermine: false };
  if (e.fini || e.colle) return ev;
  const b = e.balle;
  const pas = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 4));
  const h = dt / pas;
  for (let k = 0; k < pas; k++) {
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); ev.rebond = true; }
    if (b.x > LARGEUR - b.r) { b.x = LARGEUR - b.r; b.vx = -Math.abs(b.vx); ev.rebond = true; }
    if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); ev.rebond = true; }
    // raquette
    const r = e.raquette;
    if (b.vy > 0 && b.y + b.r >= RAQ_Y && b.y + b.r <= RAQ_Y + RAQ_H + 8 && b.x >= r.x - r.w / 2 - b.r && b.x <= r.x + r.w / 2 + b.r) {
      const t = Math.max(-1, Math.min(1, (b.x - r.x) / (r.w / 2)));
      const angle = (-Math.PI / 2) + t * (Math.PI / 3);
      b.vx = Math.cos(angle) * vitesseBalle;
      b.vy = Math.sin(angle) * vitesseBalle;
      b.y = RAQ_Y - b.r;
      ev.rebond = true;
    }
    // briques
    const col = Math.floor(b.x / BW);
    const lig = Math.floor((b.y - HAUT_BRIQUES) / BH);
    for (const [dl, dc] of [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const l = lig + dl;
      const c = col + dc;
      if (l < 0 || l >= LIGNES || c < 0 || c >= COLS || !e.briques[l * COLS + c]) continue;
      const bx = c * BW, by = HAUT_BRIQUES + l * BH;
      const px = Math.max(bx, Math.min(b.x, bx + BW));
      const py = Math.max(by, Math.min(b.y, by + BH));
      if (Math.hypot(b.x - px, b.y - py) > b.r) continue;
      e.briques[l * COLS + c] = false;
      e.score += (LIGNES - l) * 10;
      ev.brique = true;
      // rebond selon l'axe de plus faible pénétration
      const dxg = b.x - bx, dxd = bx + BW - b.x, dyh = b.y - by, dyb = by + BH - b.y;
      if (Math.min(dxg, dxd) < Math.min(dyh, dyb)) b.vx = dxg < dxd ? -Math.abs(b.vx) : Math.abs(b.vx);
      else b.vy = dyh < dyb ? -Math.abs(b.vy) : Math.abs(b.vy);
      break;
    }
    if (ev.brique && e.briques.every((x) => !x)) { ev.niveauTermine = true; return ev; }
    if (b.y - b.r > HAUTEUR) {
      ev.perdue = true;
      e.vies--;
      e.colle = true;
      b.vx = b.vy = 0;
      b.x = e.raquette.x;
      b.y = RAQ_Y - b.r - 1;
      if (e.vies <= 0) e.fini = true;
      return ev;
    }
  }
  return ev;
}

export function niveauSuivant(e: Etat): void {
  e.niveau++;
  e.briques = Array<boolean>(LIGNES * COLS).fill(true);
  e.colle = true;
  e.balle.vx = e.balle.vy = 0;
  e.balle.x = e.raquette.x;
  e.balle.y = RAQ_Y - e.balle.r - 1;
}

export const L = 640;
export const H = 400;
export const PH = 80; // hauteur des raquettes
export const PW = 12;
export const MARGE = 20;
export const OBJECTIF = 7;

export interface Etat {
  balle: { x: number; y: number; vx: number; vy: number };
  joueurY: number; // centre
  ordiY: number;
  scores: [number, number]; // joueur, ordinateur
  servir: boolean; // balle au centre, en attente
  vers: 1 | -1; // direction du prochain service (1 = vers l'ordinateur)
  fini: boolean;
}

export function nouvelle(): Etat {
  return { balle: { x: L / 2, y: H / 2, vx: 0, vy: 0 }, joueurY: H / 2, ordiY: H / 2, scores: [0, 0], servir: true, vers: 1, fini: false };
}

export const VITESSE_ORDI = { facile: 170, moyen: 250, difficile: 340 } as const;
const VITESSE_BALLE = { facile: 300, moyen: 360, difficile: 430 } as const;

export function servir(e: Etat, niveau: keyof typeof VITESSE_BALLE, rng: () => number = Math.random): void {
  if (!e.servir || e.fini) return;
  const a = (rng() - 0.5) * 0.9;
  const v = VITESSE_BALLE[niveau];
  e.balle = { x: L / 2, y: H / 2, vx: Math.cos(a) * v * e.vers, vy: Math.sin(a) * v };
  e.servir = false;
}

export function deplacerJoueur(e: Etat, y: number): void {
  e.joueurY = Math.min(H - PH / 2, Math.max(PH / 2, y));
}

export interface Evenements { rebond: boolean; point: 'joueur' | 'ordi' | null }

export function avancer(e: Etat, dt: number, niveau: keyof typeof VITESSE_BALLE): Evenements {
  const ev: Evenements = { rebond: false, point: null };
  if (e.fini) return ev;
  const b = e.balle;
  // ordinateur : suit la balle quand elle vient vers lui, sinon revient au centre
  const cible = !e.servir && b.vx > 0 ? b.y : H / 2;
  const maxPas = VITESSE_ORDI[niveau] * dt;
  e.ordiY += Math.max(-maxPas, Math.min(maxPas, cible - e.ordiY));
  e.ordiY = Math.min(H - PH / 2, Math.max(PH / 2, e.ordiY));
  if (e.servir) return ev;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.y < 5) { b.y = 5; b.vy = Math.abs(b.vy); ev.rebond = true; }
  if (b.y > H - 5) { b.y = H - 5; b.vy = -Math.abs(b.vy); ev.rebond = true; }
  const frappe = (raquetteY: number, cote: 1 | -1) => {
    const t = (b.y - raquetteY) / (PH / 2);
    const v = Math.min(760, Math.hypot(b.vx, b.vy) * 1.06);
    const angle = Math.max(-1, Math.min(1, t)) * (Math.PI / 3.2);
    b.vx = Math.cos(angle) * v * cote;
    b.vy = Math.sin(angle) * v;
    ev.rebond = true;
  };
  if (b.vx < 0 && b.x - 5 <= MARGE + PW && b.x >= MARGE && Math.abs(b.y - e.joueurY) <= PH / 2 + 5) { b.x = MARGE + PW + 5; frappe(e.joueurY, 1); }
  if (b.vx > 0 && b.x + 5 >= L - MARGE - PW && b.x <= L - MARGE && Math.abs(b.y - e.ordiY) <= PH / 2 + 5) { b.x = L - MARGE - PW - 5; frappe(e.ordiY, -1); }
  if (b.x < -10 || b.x > L + 10) {
    const joueur = b.x > L;
    e.scores[joueur ? 0 : 1]++;
    ev.point = joueur ? 'joueur' : 'ordi';
    e.servir = true;
    e.vers = joueur ? -1 : 1;
    e.balle = { x: L / 2, y: H / 2, vx: 0, vy: 0 };
    if (e.scores[0] >= OBJECTIF || e.scores[1] >= OBJECTIF) e.fini = true;
  }
  return ev;
}

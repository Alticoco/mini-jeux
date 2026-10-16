import { choisir, type Rng } from '../../shared/alea';
import type { Difficulte } from '../../core/types';

/** Labyrinthe 19×21 : # mur, . pastille, * super-pastille, P départ du joueur, espace = vide (la ligne 9 forme un tunnel). */
export const PLAN = [
  '###################',
  '#........#........#',
  '#*##.###.#.###.##*#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  '####.#       #.####',
  '####.# ##-## #.####',
  '    .  #   #  .    ',
  '####.# ##### #.####',
  '####.#       #.####',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#*.#.....P.....#.*#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
];
export const L = 19;
export const H = PLAN.length;
export const MAISON = { x: 9, y: 9 };

const DIRS: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const mur = (g: readonly string[][], x: number, y: number): boolean => {
  if (y < 0 || y >= H) return true;
  const xx = ((x % L) + L) % L; // tunnel : on boucle horizontalement
  return g[y]![xx] === '#';
};

export interface Ent { x: number; y: number; dx: number; dy: number; p: number }
export interface Fantome extends Ent { id: number; mode: 'normal' | 'peur' | 'yeux'; sortie: number } // sortie : ms avant de quitter la maison

export interface Etat {
  grille: string[][];
  pac: Ent & { vx: number; vy: number; ouverture: number };
  fantomes: Fantome[];
  score: number;
  vies: number;
  niveau: number;
  restantes: number;
  peur: number; // ms restantes
  chaine: number; // fantômes mangés pendant la super-pastille
  attente: number; // ms de pause (après une perte de vie)
  fini: boolean;
  gagne: boolean;
}

const NB_FANTOMES: Record<Difficulte, number> = { facile: 2, moyen: 3, difficile: 4 };

function departPac(): { x: number; y: number } {
  for (let y = 0; y < H; y++) { const x = PLAN[y]!.indexOf('P'); if (x >= 0) return { x, y }; }
  throw new Error('pas de départ');
}

export function grilleDepart(): string[][] {
  return PLAN.map((r) => [...r.replace('P', ' ').replace('-', ' ')]);
}

export const compter = (g: readonly string[][]): number => g.flat().filter((c) => c === '.' || c === '*').length;

export function placerEntites(e: Etat): void {
  const d = departPac();
  e.pac = { x: d.x, y: d.y, dx: 0, dy: 0, p: 0, vx: 0, vy: 0, ouverture: 0 };
  e.fantomes = e.fantomes.map((f, i) => ({ id: f.id, x: MAISON.x - 1 + (i % 3), y: MAISON.y, dx: 0, dy: 0, p: 0, mode: 'normal' as const, sortie: 1500 + i * 2600 }));
}

export function nouvelle(niveau: Difficulte, numero = 1): Etat {
  const grille = grilleDepart();
  const e: Etat = {
    grille, pac: { x: 0, y: 0, dx: 0, dy: 0, p: 0, vx: 0, vy: 0, ouverture: 0 },
    fantomes: Array.from({ length: NB_FANTOMES[niveau] }, (_, id) => ({ id, x: 0, y: 0, dx: 0, dy: 0, p: 0, mode: 'normal' as const, sortie: 0 })),
    score: 0, vies: 3, niveau: numero, restantes: compter(grille), peur: 0, chaine: 0, attente: 0, fini: false, gagne: false,
  };
  placerEntites(e);
  return e;
}

export function prochainNiveau(e: Etat): void {
  e.grille = grilleDepart();
  e.restantes = compter(e.grille);
  e.niveau++;
  e.peur = 0;
  placerEntites(e);
}

/** Distance (en cases) de chaque case au centre de la maison des fantômes. */
export const DIST_MAISON: number[] = (() => {
  const d = Array<number>(L * H).fill(-1);
  const g = grilleDepart();
  const file: Array<[number, number]> = [[MAISON.x, MAISON.y]];
  d[MAISON.y * L + MAISON.x] = 0;
  for (let k = 0; k < file.length; k++) {
    const [x, y] = file[k]!;
    for (const [dx, dy] of DIRS) {
      const nx = (x + dx + L) % L, ny = y + dy;
      if (!mur(g, nx, ny) && d[ny * L + nx] === -1) { d[ny * L + nx] = d[y * L + x]! + 1; file.push([nx, ny]); }
    }
  }
  return d;
})();

const vitessePac = (niveau: number) => 6.2 + Math.min(niveau, 6) * 0.15;
const vitesseFantome = (e: Etat, f: Fantome, diff: Difficulte) =>
  f.mode === 'yeux' ? 11 : f.mode === 'peur' ? 3.4 : ({ facile: 4.3, moyen: 5.2, difficile: 5.9 }[diff] + Math.min(e.niveau, 6) * 0.12);

export const position = (en: Ent): { x: number; y: number } => ({ x: en.x + en.dx * en.p, y: en.y + en.dy * en.p });

function cibleFantome(e: Etat, f: Fantome): { x: number; y: number } {
  const { pac } = e;
  switch (f.id % 4) {
    case 0: return { x: pac.x, y: pac.y };
    case 1: return { x: pac.x + pac.dx * 4, y: pac.y + pac.dy * 4 };
    case 2: return { x: pac.x - pac.dx * 3, y: pac.y - pac.dy * 3 };
    default: return Math.hypot(f.x - pac.x, f.y - pac.y) > 7 ? { x: pac.x, y: pac.y } : { x: 1, y: H - 2 };
  }
}

function dirsPossibles(g: readonly string[][], x: number, y: number): Array<[number, number]> {
  return DIRS.filter(([dx, dy]) => !mur(g, x + dx, y + dy));
}

function choisirDirectionFantome(e: Etat, f: Fantome, rng: Rng): void {
  let opts = dirsPossibles(e.grille, f.x, f.y);
  const retour = opts.filter(([dx, dy]) => !(dx === -f.dx && dy === -f.dy));
  if (retour.length && (f.dx || f.dy)) opts = retour;
  if (!opts.length) { f.dx = f.dy = 0; return; }
  if (f.mode === 'peur') { [f.dx, f.dy] = choisir(opts, rng); return; }
  if (f.mode === 'yeux') {
    let meilleur = opts[0]!;
    let dm = Infinity;
    for (const o of opts) {
      const nx = (f.x + o[0] + L) % L, ny = f.y + o[1];
      const dd = DIST_MAISON[ny * L + nx]!;
      if (dd >= 0 && dd < dm) { dm = dd; meilleur = o; }
    }
    [f.dx, f.dy] = meilleur;
    return;
  }
  // un fantôme sur trois choisit parfois au hasard pour rester battable
  if (rng() < 0.12) { [f.dx, f.dy] = choisir(opts, rng); return; }
  const c = cibleFantome(e, f);
  let meilleur = opts[0]!;
  let dm = Infinity;
  for (const o of opts) {
    const d = (f.x + o[0] - c.x) ** 2 + (f.y + o[1] - c.y) ** 2;
    if (d < dm) { dm = d; meilleur = o; }
  }
  [f.dx, f.dy] = meilleur;
}

export interface Evenements { pastille: boolean; super: boolean; fantome: boolean; mort: boolean; niveauTermine: boolean; fin: boolean }

/** Avance la partie de dt secondes. */
export function avancer(e: Etat, dt: number, diff: Difficulte, rng: Rng = Math.random): Evenements {
  const ev: Evenements = { pastille: false, super: false, fantome: false, mort: false, niveauTermine: false, fin: false };
  if (e.fini) return ev;
  if (e.attente > 0) { e.attente = Math.max(0, e.attente - dt * 1000); return ev; }
  if (e.peur > 0) {
    e.peur -= dt * 1000;
    if (e.peur <= 0) { e.peur = 0; e.chaine = 0; for (const f of e.fantomes) if (f.mode === 'peur') f.mode = 'normal'; }
  }
  // joueur
  const pac = e.pac;
  pac.ouverture += dt * 14;
  // demi-tour immédiat possible en cours de case
  if ((pac.dx || pac.dy) && (pac.vx === -pac.dx && pac.vy === -pac.dy) && (pac.vx || pac.vy)) {
    pac.x += pac.dx; pac.y += pac.dy;
    pac.x = (pac.x + L) % L;
    pac.dx = pac.vx; pac.dy = pac.vy; pac.p = 1 - pac.p;
  }
  let reste = vitessePac(e.niveau) * dt;
  while (reste > 0) {
    if (!pac.dx && !pac.dy) {
      if (pac.vx || pac.vy) {
        if (!mur(e.grille, pac.x + pac.vx, pac.y + pac.vy)) { pac.dx = pac.vx; pac.dy = pac.vy; pac.p = 0; } else break;
      } else break;
    }
    const pas = Math.min(reste, 1 - pac.p);
    pac.p += pas;
    reste -= pas;
    if (pac.p >= 1 - 1e-9) {
      pac.x = (pac.x + pac.dx + L) % L;
      pac.y += pac.dy;
      pac.p = 0;
      const c = e.grille[pac.y]![pac.x]!;
      if (c === '.' || c === '*') {
        e.grille[pac.y]![pac.x] = ' ';
        e.restantes--;
        e.score += c === '*' ? 50 : 10;
        ev.pastille = true;
        if (c === '*') {
          ev.super = true;
          e.peur = Math.max(3000, 7000 - e.niveau * 500);
          e.chaine = 0;
          for (const f of e.fantomes) {
            if (f.mode !== 'normal') continue;
            f.mode = 'peur';
            if (f.dx || f.dy) { // demi-tour : (x,y,d,p) équivaut à (x+d, -d, 1-p)
              f.x = (f.x + f.dx + L) % L; f.y += f.dy; f.dx = -f.dx; f.dy = -f.dy; f.p = 1 - f.p;
            }
          }
        }
        if (e.restantes === 0) { ev.niveauTermine = true; return ev; }
      }
      // nouvelle direction
      if ((pac.vx || pac.vy) && !mur(e.grille, pac.x + pac.vx, pac.y + pac.vy)) { pac.dx = pac.vx; pac.dy = pac.vy; }
      else if (mur(e.grille, pac.x + pac.dx, pac.y + pac.dy)) { pac.dx = 0; pac.dy = 0; }
    }
  }
  // fantômes
  for (const f of e.fantomes) {
    if (f.sortie > 0) { f.sortie -= dt * 1000; continue; }
    let r = vitesseFantome(e, f, diff) * dt;
    let garde = 0;
    while (r > 0 && garde++ < 20) {
      if (!f.dx && !f.dy) { choisirDirectionFantome(e, f, rng); f.p = 0; if (!f.dx && !f.dy) break; }
      const pas = Math.min(r, 1 - f.p);
      f.p += pas;
      r -= pas;
      if (f.p >= 1 - 1e-9) {
        f.x = (f.x + f.dx + L) % L;
        f.y += f.dy;
        f.p = 0;
        if (f.mode === 'yeux' && f.x === MAISON.x && f.y === MAISON.y) f.mode = e.peur > 0 ? 'peur' : 'normal';
        choisirDirectionFantome(e, f, rng);
      }
    }
  }
  // collisions
  const pp = position(e.pac);
  for (const f of e.fantomes) {
    const pf = position(f);
    if (Math.hypot(pp.x - pf.x, pp.y - pf.y) > 0.6 || f.mode === 'yeux') continue;
    if (f.mode === 'peur') {
      f.mode = 'yeux';
      e.chaine++;
      e.score += 100 * 2 ** e.chaine;
      ev.fantome = true;
    } else {
      e.vies--;
      ev.mort = true;
      if (e.vies <= 0) { e.fini = true; ev.fin = true; }
      else { placerEntites(e); e.peur = 0; e.attente = 1400; }
      break;
    }
  }
  return ev;
}

export function orienter(e: Etat, dx: number, dy: number): void {
  e.pac.vx = dx;
  e.pac.vy = dy;
}

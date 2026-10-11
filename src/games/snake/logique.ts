import { entier, type Rng } from '../../shared/alea';

export interface Point { x: number; y: number }
export type Dir = 'haut' | 'bas' | 'gauche' | 'droite';

export interface EtatSnake {
  l: number;
  h: number;
  serpent: Point[]; // tête en premier
  dir: Dir;
  nourriture: Point;
  score: number;
  vivant: boolean;
}

const VECT: Record<Dir, Point> = { haut: { x: 0, y: -1 }, bas: { x: 0, y: 1 }, gauche: { x: -1, y: 0 }, droite: { x: 1, y: 0 } };
const OPPOSE: Record<Dir, Dir> = { haut: 'bas', bas: 'haut', gauche: 'droite', droite: 'gauche' };

export function nouvelleNourriture(l: number, h: number, serpent: Point[], rng: Rng): Point | null {
  const libres: Point[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) if (!serpent.some((p) => p.x === x && p.y === y)) libres.push({ x, y });
  return libres.length ? libres[entier(libres.length, rng)]! : null;
}

export function nouveau(l = 20, h = 20, rng: Rng = Math.random): EtatSnake {
  const serpent = [{ x: 5, y: Math.floor(h / 2) }, { x: 4, y: Math.floor(h / 2) }, { x: 3, y: Math.floor(h / 2) }];
  return { l, h, serpent, dir: 'droite', nourriture: nouvelleNourriture(l, h, serpent, rng)!, score: 0, vivant: true };
}

export function peutTourner(actuelle: Dir, voulue: Dir): boolean {
  return OPPOSE[actuelle] !== voulue;
}

/** Avance d'une case. Murs et corps sont mortels. */
export function pas(e: EtatSnake, dir: Dir, rng: Rng = Math.random): EtatSnake {
  if (!e.vivant) return e;
  const d = peutTourner(e.dir, dir) ? dir : e.dir;
  const v = VECT[d];
  const tete = { x: e.serpent[0]!.x + v.x, y: e.serpent[0]!.y + v.y };
  const mange = tete.x === e.nourriture.x && tete.y === e.nourriture.y;
  const corps = mange ? e.serpent : e.serpent.slice(0, -1);
  if (tete.x < 0 || tete.y < 0 || tete.x >= e.l || tete.y >= e.h || corps.some((p) => p.x === tete.x && p.y === tete.y)) {
    return { ...e, dir: d, vivant: false };
  }
  const serpent = [tete, ...corps];
  if (!mange) return { ...e, serpent, dir: d };
  const n = nouvelleNourriture(e.l, e.h, serpent, rng);
  // Grille entièrement remplie : victoire totale, on arrête la partie.
  return { ...e, serpent, dir: d, score: e.score + 1, nourriture: n ?? e.nourriture, vivant: n !== null };
}

import { entier, type Rng, graine } from '../../shared/alea';

export interface Niveau {
  l: number;
  h: number;
  murs: boolean[];
  objectifs: number[]; // indices
  boites: number[];
  joueur: number;
}

export const DIRS = { haut: [-1, 0], bas: [1, 0], gauche: [0, -1], droite: [0, 1] } as const;
export type Dir = keyof typeof DIRS;

function voisin(niv: { l: number; h: number }, i: number, d: Dir): number {
  const [dl, dc] = DIRS[d];
  const l = Math.floor(i / niv.l) + dl;
  const c = (i % niv.l) + dc;
  return l < 0 || l >= niv.h || c < 0 || c >= niv.l ? -1 : l * niv.l + c;
}

function connexe(murs: boolean[], l: number, h: number): boolean {
  const libres = murs.flatMap((m, i) => (m ? [] : [i]));
  if (!libres.length) return false;
  const vu = new Set([libres[0]!]);
  const pile = [libres[0]!];
  while (pile.length) {
    const i = pile.pop()!;
    for (const d of Object.keys(DIRS) as Dir[]) {
      const v = voisin({ l, h }, i, d);
      if (v >= 0 && !murs[v] && !vu.has(v)) { vu.add(v); pile.push(v); }
    }
  }
  return vu.size === libres.length;
}

/**
 * Génère un niveau garanti soluble : on part de la position résolue et on « tire » les caisses
 * au hasard (coups inverses). Rejouer ces coups à l'envers est une solution.
 */
export function genererNiveau(numero: number, rng: Rng = graine(numero * 7919 + 13)): Niveau {
  const taille = Math.min(9, 6 + Math.floor((numero - 1) / 4));
  const nbBoites = Math.min(5, 1 + Math.floor((numero - 1) / 3));
  for (;;) {
    const l = taille;
    const h = taille;
    const murs = Array.from({ length: l * h }, (_, i) => {
      const lig = Math.floor(i / l);
      const col = i % l;
      return lig === 0 || col === 0 || lig === h - 1 || col === l - 1;
    });
    for (let k = 0; k < Math.floor(taille * 0.9); k++) murs[entier(l * h, rng)] = true;
    if (!connexe(murs, l, h)) continue;
    const libres = murs.flatMap((m, i) => (m ? [] : [i]));
    if (libres.length < nbBoites + 6) continue;
    const pris = new Set<number>();
    const tirer = () => {
      for (;;) {
        const c = libres[entier(libres.length, rng)]!;
        if (!pris.has(c)) { pris.add(c); return c; }
      }
    };
    const objectifs = Array.from({ length: nbBoites }, tirer);
    const boites = [...objectifs];
    let joueur = tirer();
    const niv = { l, h };
    let tirages = 0;
    const objectif = 4 + nbBoites * 4 + numero;
    for (let essai = 0; essai < 4000 && tirages < objectif; essai++) {
      const dirs = Object.keys(DIRS) as Dir[];
      const d = dirs[entier(4, rng)]!;
      const avant = voisin(niv, joueur, d);
      const arriere = voisin(niv, joueur, ({ haut: 'bas', bas: 'haut', gauche: 'droite', droite: 'gauche' } as const)[d]);
      const libre = (i: number) => i >= 0 && !murs[i] && !boites.includes(i);
      if (!libre(avant)) continue;
      const k = boites.indexOf(arriere);
      if (k >= 0 && rng() < 0.8) {
        // tirage : la caisse derrière le joueur le suit
        boites[k] = joueur;
        tirages++;
      }
      joueur = avant;
    }
    if (tirages < nbBoites * 2 || boites.every((b) => objectifs.includes(b))) continue;
    return { l, h, murs, objectifs, boites, joueur };
  }
}

/** Déplace le joueur (et pousse une caisse). Renvoie null si impossible, sinon le nouvel état. */
export function deplacer(niv: Niveau, boites: readonly number[], joueur: number, d: Dir): { boites: number[]; joueur: number; pousse: boolean } | null {
  const v = voisin(niv, joueur, d);
  if (v < 0 || niv.murs[v]) return null;
  const k = boites.indexOf(v);
  if (k < 0) return { boites: [...boites], joueur: v, pousse: false };
  const apres = voisin(niv, v, d);
  if (apres < 0 || niv.murs[apres] || boites.includes(apres)) return null;
  const nb = [...boites];
  nb[k] = apres;
  return { boites: nb, joueur: v, pousse: true };
}

export function gagne(niv: Niveau, boites: readonly number[]): boolean {
  return boites.every((b) => niv.objectifs.includes(b));
}

import { entier, type Rng } from '../../shared/alea';

export const TAILLE = 4;
export type Grille = number[]; // TAILLE*TAILLE, 0 = vide
export type Direction = 'gauche' | 'droite' | 'haut' | 'bas';

/** Fait glisser une ligne vers la gauche et fusionne. */
export function glisserLigne(ligne: number[]): { ligne: number[]; gain: number } {
  const valeurs = ligne.filter((v) => v);
  const res: number[] = [];
  let gain = 0;
  for (let i = 0; i < valeurs.length; i++) {
    if (valeurs[i] === valeurs[i + 1]) {
      const v = valeurs[i]! * 2;
      res.push(v);
      gain += v;
      i++;
    } else res.push(valeurs[i]!);
  }
  while (res.length < ligne.length) res.push(0);
  return { ligne: res, gain };
}

function lignes(d: Direction): number[][] {
  const idx: number[][] = [];
  for (let a = 0; a < TAILLE; a++) {
    const l: number[] = [];
    for (let b = 0; b < TAILLE; b++) {
      if (d === 'gauche') l.push(a * TAILLE + b);
      else if (d === 'droite') l.push(a * TAILLE + (TAILLE - 1 - b));
      else if (d === 'haut') l.push(b * TAILLE + a);
      else l.push((TAILLE - 1 - b) * TAILLE + a);
    }
    idx.push(l);
  }
  return idx;
}

export function deplacer(g: Grille, d: Direction): { grille: Grille; gain: number; bouge: boolean } {
  const res = [...g];
  let gain = 0;
  for (const idx of lignes(d)) {
    const r = glisserLigne(idx.map((i) => g[i]!));
    gain += r.gain;
    idx.forEach((i, k) => { res[i] = r.ligne[k]!; });
  }
  return { grille: res, gain, bouge: res.some((v, i) => v !== g[i]) };
}

export function ajouterTuile(g: Grille, rng: Rng = Math.random): Grille {
  const libres = g.flatMap((v, i) => (v ? [] : [i]));
  if (!libres.length) return g;
  const res = [...g];
  res[libres[entier(libres.length, rng)]!] = rng() < 0.9 ? 2 : 4;
  return res;
}

export function nouvelle(rng: Rng = Math.random): Grille {
  return ajouterTuile(ajouterTuile(Array(TAILLE * TAILLE).fill(0), rng), rng);
}

export function peutBouger(g: Grille): boolean {
  return (['gauche', 'droite', 'haut', 'bas'] as Direction[]).some((d) => deplacer(g, d).bouge);
}

export function maximum(g: Grille): number {
  return Math.max(...g);
}

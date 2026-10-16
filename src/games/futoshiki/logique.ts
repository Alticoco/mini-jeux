import { melanger, type Rng } from '../../shared/alea';

/** Relation entre une case et sa voisine de droite (h) ou du dessous (v) : 1 = « < », -1 = « > », 0 = aucune. */
export interface Puzzle {
  n: number;
  donnees: number[]; // valeurs imposées (0 = vide)
  h: number[]; // n × (n-1), relation entre (l,c) et (l,c+1)
  v: number[]; // (n-1) × n, relation entre (l,c) et (l+1,c)
}

const ih = (n: number, l: number, c: number) => l * (n - 1) + c;
const iv = (n: number, l: number, c: number) => l * n + c;

/** La valeur v en i est-elle compatible avec les cases déjà remplies ? */
function compatible(p: Puzzle, g: number[], i: number, v: number): boolean {
  const { n } = p;
  const l = Math.floor(i / n);
  const c = i % n;
  for (let k = 0; k < n; k++) {
    if (k !== c && g[l * n + k] === v) return false;
    if (k !== l && g[k * n + c] === v) return false;
  }
  const test = (rel: number, autre: number, aGauche: boolean) => {
    if (!rel || !autre) return true;
    // rel = 1 : case de gauche/haut < case de droite/bas
    const a = aGauche ? v : autre;
    const b = aGauche ? autre : v;
    return rel === 1 ? a < b : a > b;
  };
  if (c < n - 1 && !test(p.h[ih(n, l, c)]!, g[i + 1]!, true)) return false;
  if (c > 0 && !test(p.h[ih(n, l, c - 1)]!, g[i - 1]!, false)) return false;
  if (l < n - 1 && !test(p.v[iv(n, l, c)]!, g[i + n]!, true)) return false;
  if (l > 0 && !test(p.v[iv(n, l - 1, c)]!, g[i - n]!, false)) return false;
  return true;
}

/** Compte les solutions (jusqu'à limite) ; la grille g contient les valeurs de départ. */
export function compter(p: Puzzle, g: number[], limite = 2): number {
  const i = g.indexOf(0);
  if (i < 0) return 1;
  let total = 0;
  for (let v = 1; v <= p.n; v++) {
    if (!compatible(p, g, i, v)) continue;
    g[i] = v;
    total += compter(p, g, limite - total);
    g[i] = 0;
    if (total >= limite) break;
  }
  return total;
}

function carreLatin(n: number, rng: Rng): number[] {
  const g = Array<number>(n * n).fill(0);
  const vide: Puzzle = { n, donnees: g, h: Array<number>(n * (n - 1)).fill(0), v: Array<number>(n * (n - 1)).fill(0) };
  const remplir = (): boolean => {
    const i = g.indexOf(0);
    if (i < 0) return true;
    for (const v of melanger(Array.from({ length: n }, (_, k) => k + 1), rng)) {
      if (!compatible(vide, g, i, v)) continue;
      g[i] = v;
      if (remplir()) return true;
      g[i] = 0;
    }
    return false;
  };
  remplir();
  return g;
}

/** Génère un puzzle à solution unique. `densite` : part des relations affichées ; `indices` : nombre de cases données au minimum. */
export function generer(n: number, densite: number, indices: number, rng: Rng = Math.random): { puzzle: Puzzle; solution: number[] } {
  const solution = carreLatin(n, rng);
  const h = Array<number>(n * (n - 1)).fill(0);
  const v = Array<number>(n * (n - 1)).fill(0);
  for (let l = 0; l < n; l++)
    for (let c = 0; c < n; c++) {
      if (c < n - 1 && rng() < densite) h[ih(n, l, c)] = solution[l * n + c]! < solution[l * n + c + 1]! ? 1 : -1;
      if (l < n - 1 && rng() < densite) v[iv(n, l, c)] = solution[l * n + c]! < solution[(l + 1) * n + c]! ? 1 : -1;
    }
  const donnees = Array<number>(n * n).fill(0);
  const ordre = melanger(Array.from({ length: n * n }, (_, i) => i), rng);
  let k = 0;
  for (; k < indices; k++) donnees[ordre[k]!] = solution[ordre[k]!]!;
  const puzzle: Puzzle = { n, donnees, h, v };
  while (compter(puzzle, [...donnees]) !== 1 && k < n * n) {
    donnees[ordre[k]!] = solution[ordre[k]!]!;
    k++;
  }
  return { puzzle, solution };
}

/** Cases en infraction : doublons ou inégalités non respectées (entre cases remplies). */
export function conflits(p: Puzzle, g: readonly number[]): Set<number> {
  const { n } = p;
  const res = new Set<number>();
  for (let l = 0; l < n; l++)
    for (let c = 0; c < n; c++) {
      const i = l * n + c;
      const v = g[i]!;
      if (!v) continue;
      for (let k = 0; k < n; k++) {
        if (k !== c && g[l * n + k] === v) { res.add(i); res.add(l * n + k); }
        if (k !== l && g[k * n + c] === v) { res.add(i); res.add(k * n + c); }
      }
      const r = c < n - 1 ? p.h[ih(n, l, c)]! : 0;
      const b = g[i + 1]!;
      if (r && b && (r === 1 ? v >= b : v <= b)) { res.add(i); res.add(i + 1); }
      const r2 = l < n - 1 ? p.v[iv(n, l, c)]! : 0;
      const b2 = g[i + n]!;
      if (r2 && b2 && (r2 === 1 ? v >= b2 : v <= b2)) { res.add(i); res.add(i + n); }
    }
  return res;
}

export function resolu(p: Puzzle, g: readonly number[]): boolean {
  return g.every((v) => v > 0) && conflits(p, g).size === 0;
}

export { ih, iv };

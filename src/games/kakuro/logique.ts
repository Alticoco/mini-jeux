import { melanger, type Rng } from '../../shared/alea';

export interface Serie {
  cases: number[];
  somme: number;
  horizontale: boolean;
}

export interface Puzzle {
  n: number;
  blanche: boolean[]; // case à remplir ?
  series: Serie[];
  indiceDroite: number[]; // somme de la série horizontale qui commence à droite de cette case noire (0 = aucune)
  indiceBas: number[]; // somme de la série verticale qui commence sous cette case noire
  donnees: number[]; // chiffres donnés au départ (0 = vide)
}

/** Séries (≥ 2 cases blanches consécutives) d'une grille de cases blanches. */
function trouverSeries(n: number, blanche: readonly boolean[]): Array<{ cases: number[]; horizontale: boolean }> {
  const res: Array<{ cases: number[]; horizontale: boolean }> = [];
  for (const horizontale of [true, false]) {
    for (let a = 0; a < n; a++) {
      let cur: number[] = [];
      for (let b = 0; b <= n; b++) {
        const i = b < n ? (horizontale ? a * n + b : b * n + a) : -1;
        if (i >= 0 && blanche[i]) cur.push(i);
        else {
          if (cur.length >= 1) res.push({ cases: cur, horizontale });
          cur = [];
        }
      }
    }
  }
  return res;
}

function disposition(n: number, rng: Rng, densiteNoire: number): boolean[] {
  const blanche = Array.from({ length: n * n }, (_, i) => Math.floor(i / n) > 0 && i % n > 0 && rng() > densiteNoire);
  // supprime les séries d'une seule case ou plus longues que 9
  for (let passe = 0; passe < 20; passe++) {
    let change = false;
    for (const s of trouverSeries(n, blanche)) {
      if (s.cases.length === 1) { blanche[s.cases[0]!] = false; change = true; }
      else if (s.cases.length > 9) { blanche[s.cases[4]!] = false; change = true; }
    }
    if (!change) break;
  }
  return blanche;
}

function remplir(n: number, blanche: readonly boolean[], rng: Rng): number[] | null {
  const valeurs = Array<number>(n * n).fill(0);
  const series = trouverSeries(n, blanche);
  const parCase = new Map<number, Array<{ cases: number[] }>>();
  for (const s of series) for (const c of s.cases) parCase.set(c, [...(parCase.get(c) ?? []), s]);
  const cases = Array.from({ length: n * n }, (_, i) => i).filter((i) => blanche[i]);
  let essais = 0;
  const rec = (k: number): boolean => {
    if (k === cases.length) return true;
    if (++essais > 20000) return false;
    const i = cases[k]!;
    for (const v of melanger([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
      if ((parCase.get(i) ?? []).some((s) => s.cases.some((c) => valeurs[c] === v))) continue;
      valeurs[i] = v;
      if (rec(k + 1)) return true;
      valeurs[i] = 0;
    }
    return false;
  };
  return rec(0) ? valeurs : null;
}

export function generer(n: number, densiteNoire: number, partDonnees: number, rng: Rng = Math.random): { puzzle: Puzzle; solution: number[] } {
  for (;;) {
    const blanche = disposition(n, rng, densiteNoire);
    if (blanche.filter(Boolean).length < n * 2) continue;
    const solution = remplir(n, blanche, rng);
    if (!solution) continue;
    const series: Serie[] = trouverSeries(n, blanche).filter((s) => s.cases.length >= 2).map((s) => ({ ...s, somme: s.cases.reduce((t, c) => t + solution[c]!, 0) }));
    // toute case blanche doit appartenir à une série horizontale ET verticale d'au moins 2 cases
    const couvert = (i: number, h: boolean) => series.some((s) => s.horizontale === h && s.cases.includes(i));
    if (!blanche.every((b, i) => !b || (couvert(i, true) && couvert(i, false)))) continue;
    const indiceDroite = Array<number>(n * n).fill(0);
    const indiceBas = Array<number>(n * n).fill(0);
    for (const s of series) {
      const premiere = s.cases[0]!;
      if (s.horizontale) indiceDroite[premiere - 1] = s.somme;
      else indiceBas[premiere - n] = s.somme;
    }
    const donnees = Array<number>(n * n).fill(0);
    const blanches = melanger(Array.from({ length: n * n }, (_, i) => i).filter((i) => blanche[i]), rng);
    for (const i of blanches.slice(0, Math.round(blanches.length * partDonnees))) donnees[i] = solution[i]!;
    return { puzzle: { n, blanche, series, indiceDroite, indiceBas, donnees }, solution };
  }
}

/** Cases d'une série comportant un doublon, ou dont la somme est complète mais fausse. */
export function conflits(p: Puzzle, g: readonly number[]): Set<number> {
  const res = new Set<number>();
  for (const s of p.series) {
    const vals = s.cases.map((c) => g[c]!);
    const remplies = vals.filter(Boolean);
    const doublon = new Set(remplies).size !== remplies.length;
    const complete = remplies.length === vals.length;
    const faux = complete && vals.reduce((a, b) => a + b, 0) !== s.somme;
    const trop = remplies.reduce((a, b) => a + b, 0) > s.somme;
    if (doublon || faux || trop) for (const c of s.cases) if (g[c]) res.add(c);
  }
  return res;
}

export function resolu(p: Puzzle, g: readonly number[]): boolean {
  return p.blanche.every((b, i) => !b || g[i]! > 0) && p.series.every((s) => {
    const vals = s.cases.map((c) => g[c]!);
    return new Set(vals).size === vals.length && vals.reduce((a, b) => a + b, 0) === s.somme;
  });
}

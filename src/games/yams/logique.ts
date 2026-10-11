export const CATEGORIES = ['As', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Brelan', 'Carré', 'Full', 'Petite suite', 'Grande suite', 'Yams', 'Chance'] as const;

function comptes(d: readonly number[]): number[] {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const v of d) c[v]!++;
  return c;
}

const somme = (d: readonly number[]) => d.reduce((a, b) => a + b, 0);

function suite(d: readonly number[], longueur: number): boolean {
  const c = comptes(d);
  for (let s = 1; s + longueur - 1 <= 6; s++) {
    if (Array.from({ length: longueur }, (_, k) => c[s + k]).every((n) => n! > 0)) return true;
  }
  return false;
}

/** Points d'une catégorie (index de CATEGORIES) pour les 5 dés donnés. */
export function points(cat: number, d: readonly number[]): number {
  const c = comptes(d);
  const max = Math.max(...c);
  if (cat <= 5) return c[cat + 1]! * (cat + 1);
  switch (cat) {
    case 6: return max >= 3 ? somme(d) : 0;
    case 7: return max >= 4 ? somme(d) : 0;
    case 8: return c.includes(3) && c.includes(2) || max === 5 ? 25 : 0;
    case 9: return suite(d, 4) ? 30 : 0;
    case 10: return suite(d, 5) ? 40 : 0;
    case 11: return max === 5 ? 50 : 0;
    default: return somme(d);
  }
}

export function sousTotalHaut(scores: ReadonlyArray<number | null>): number {
  return scores.slice(0, 6).reduce<number>((a, b) => a + (b ?? 0), 0);
}

export function bonus(scores: ReadonlyArray<number | null>): number {
  return sousTotalHaut(scores) >= 63 ? 35 : 0;
}

export function total(scores: ReadonlyArray<number | null>): number {
  return scores.reduce<number>((a, b) => a + (b ?? 0), 0) + bonus(scores);
}

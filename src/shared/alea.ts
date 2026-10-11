/** Utilitaires aléatoires (Math.random par défaut, rng injectable pour les tests). */
export type Rng = () => number;

export function entier(max: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * max);
}

export function melanger<T>(tab: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...tab];
  for (let i = a.length - 1; i > 0; i--) {
    const j = entier(i + 1, rng);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function choisir<T>(tab: readonly T[], rng: Rng = Math.random): T {
  return tab[entier(tab.length, rng)]!;
}

/** Générateur déterministe pour les tests. */
export function graine(s: number): Rng {
  let x = s >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

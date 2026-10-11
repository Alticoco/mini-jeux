/** Points d'un ensemble de dés dont TOUS doivent compter ; 0 si la sélection est invalide. */
export function scoreSelection(des: readonly number[]): number {
  if (des.length === 0) return 0;
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const d of des) c[d]!++;
  if (des.length === 6 && c.slice(1).every((n) => n === 1)) return 1500;
  if (des.length === 6 && c.slice(1).filter((n) => n === 2).length === 3) return 750;
  let total = 0;
  for (let f = 1; f <= 6; f++) {
    const n = c[f]!;
    if (n === 0) continue;
    if (n >= 3) {
      const base = f === 1 ? 1000 : f * 100;
      total += n === 3 ? base : n === 4 ? 1000 : n === 5 ? 2000 : 3000;
    } else if (f === 1) total += n * 100;
    else if (f === 5) total += n * 50;
    else return 0; // dé qui ne compte pas
  }
  return total;
}

/** Le lancer contient-il au moins une combinaison qui marque ? */
export function peutMarquer(des: readonly number[]): boolean {
  return meilleureSelection(des).score > 0;
}

/** Sous-ensemble (indices) de plus haut score ; à score égal, le plus petit. */
export function meilleureSelection(des: readonly number[]): { indices: number[]; score: number } {
  let meilleur = { indices: [] as number[], score: 0 };
  for (let masque = 1; masque < 1 << des.length; masque++) {
    const indices = des.map((_, i) => i).filter((i) => masque & (1 << i));
    const s = scoreSelection(indices.map((i) => des[i]!));
    if (s > meilleur.score || (s === meilleur.score && s > 0 && indices.length < meilleur.indices.length)) meilleur = { indices, score: s };
  }
  return meilleur;
}

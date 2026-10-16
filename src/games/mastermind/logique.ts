import { entier, melanger, type Rng } from '../../shared/alea';

export interface Reglage { positions: number; couleurs: number; doublons: boolean; essais: number }

export const REGLAGES: Record<'facile' | 'moyen' | 'difficile', Reglage> = {
  facile: { positions: 4, couleurs: 6, doublons: false, essais: 12 },
  moyen: { positions: 4, couleurs: 6, doublons: true, essais: 10 },
  difficile: { positions: 5, couleurs: 8, doublons: true, essais: 12 },
};

export function codeSecret(r: Reglage, rng: Rng = Math.random): number[] {
  if (!r.doublons) return melanger(Array.from({ length: r.couleurs }, (_, i) => i), rng).slice(0, r.positions);
  return Array.from({ length: r.positions }, () => entier(r.couleurs, rng));
}

/** noirs = bonne couleur bien placée ; blancs = bonne couleur mal placée. */
export function evaluer(secret: readonly number[], essai: readonly number[]): { noirs: number; blancs: number } {
  let noirs = 0;
  const resteS = new Map<number, number>();
  const resteE = new Map<number, number>();
  secret.forEach((s, i) => {
    if (s === essai[i]) noirs++;
    else {
      resteS.set(s, (resteS.get(s) ?? 0) + 1);
      resteE.set(essai[i]!, (resteE.get(essai[i]!) ?? 0) + 1);
    }
  });
  let blancs = 0;
  for (const [c, n] of resteE) blancs += Math.min(n, resteS.get(c) ?? 0);
  return { noirs, blancs };
}

export const gagne = (r: { noirs: number }, positions: number): boolean => r.noirs === positions;

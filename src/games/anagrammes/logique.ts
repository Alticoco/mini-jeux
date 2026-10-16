import { choisir, melanger, type Rng } from '../../shared/alea';
import { MOTS, estMot } from '../../shared/dictionnaire';

export const MANCHES = 5;

/** Lettres mélangées, différentes de l'ordre d'origine (si le mot le permet). */
export function melangerMot(mot: string, rng: Rng = Math.random): string {
  const lettres = [...mot];
  if (new Set(lettres).size === 1) return mot;
  let m = melanger(lettres, rng).join('');
  for (let k = 0; k < 20 && m === mot; k++) m = melanger(lettres, rng).join('');
  return m;
}

const tri = (s: string) => [...s.toLowerCase()].sort().join('');

/** Une proposition est valable si elle utilise exactement les mêmes lettres et est un mot du dictionnaire. */
export function valider(proposition: string, lettres: string): boolean {
  const p = proposition.toLowerCase();
  return p.length === lettres.length && tri(p) === tri(lettres) && estMot(p);
}

/** Tous les mots du dictionnaire qui sont des anagrammes des lettres données. */
export function solutions(lettres: string): string[] {
  const t = tri(lettres);
  return MOTS.filter((m) => m.length === lettres.length && tri(m) === t);
}

export const BORNES = { facile: [4, 5], moyen: [6, 7], difficile: [8, 12] } as const;

export function tirerMots(niveau: keyof typeof BORNES, rng: Rng = Math.random): string[] {
  const [min, max] = BORNES[niveau];
  const candidats = MOTS.filter((m) => m.length >= min && m.length <= max);
  const res: string[] = [];
  while (res.length < MANCHES && candidats.length > res.length) {
    const m = choisir(candidats, rng);
    if (!res.includes(m)) res.push(m);
  }
  return res;
}

export function pointsManche(indices: number, erreurs: number): number {
  return Math.max(10, 100 - indices * 25 - erreurs * 5);
}

import { choisir, melanger, type Rng } from '../../shared/alea';
import { MOTS, estMot, peutConstruire } from '../../shared/dictionnaire';

export const MANCHES = 3;
const VOYELLES = 'EEEEAAAIIOOUY';
const CONSONNES = 'RRSSTTNNLLDCMPBGFHV';

/** Tirage de lettres contenant au moins un mot de 6 à 9 lettres. */
export function tirage(taille = 10, rng: Rng = Math.random): string {
  const base = choisir(MOTS.filter((m) => m.length >= 6 && m.length <= Math.min(9, taille - 1)), rng).toUpperCase();
  const lettres = [...base];
  while (lettres.length < taille) lettres.push(choisir([...(lettres.length % 2 ? VOYELLES : CONSONNES)], rng));
  return melanger(lettres, rng).join('');
}

/** Plus long(s) mot(s) du dictionnaire que l'on peut former avec ces lettres. */
export function meilleursMots(lettres: string): string[] {
  const possibles = MOTS.filter((m) => m.length <= lettres.length && peutConstruire(m, lettres));
  const max = Math.max(0, ...possibles.map((m) => m.length));
  return possibles.filter((m) => m.length === max);
}

export function evaluer(proposition: string, lettres: string): { ok: boolean; points: number; raison: string } {
  const p = proposition.toLowerCase();
  if (p.length < 3) return { ok: false, points: 0, raison: 'Mot trop court.' };
  if (!peutConstruire(p, lettres)) return { ok: false, points: 0, raison: 'Vous utilisez des lettres que vous n\'avez pas.' };
  if (!estMot(p)) return { ok: false, points: 0, raison: 'Mot inconnu du dictionnaire.' };
  return { ok: true, points: p.length * p.length, raison: '' };
}

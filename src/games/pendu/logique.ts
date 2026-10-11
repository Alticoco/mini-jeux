import type { Difficulte } from '../../core/types';
import { choisir, type Rng } from '../../shared/alea';

export const ERREURS_MAX: Record<Difficulte, number> = { facile: 9, moyen: 7, difficile: 6 };

/** Minuscule sans accent : « É » et « e » comptent pour la même lettre. */
export function normaliser(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').toLowerCase();
}

export interface EtatPendu {
  mot: string;
  essais: string[]; // lettres normalisées proposées
  max: number;
}

export function choisirMot(dico: readonly string[], niveau: Difficulte, rng: Rng = Math.random): string {
  const ok = (m: string) => (niveau === 'facile' ? m.length <= 6 : niveau === 'moyen' ? m.length >= 7 && m.length <= 8 : m.length >= 9);
  const candidats = dico.filter(ok);
  return choisir(candidats.length ? candidats : dico, rng);
}

export function nouvelle(mot: string, niveau: Difficulte): EtatPendu {
  return { mot, essais: [], max: ERREURS_MAX[niveau] };
}

export function proposer(e: EtatPendu, lettre: string): EtatPendu {
  const l = normaliser(lettre);
  if (!/^[a-z]$/.test(l) || e.essais.includes(l)) return e;
  return { ...e, essais: [...e.essais, l] };
}

export function erreurs(e: EtatPendu): number {
  const m = normaliser(e.mot);
  return e.essais.filter((l) => !m.includes(l)).length;
}

export function gagne(e: EtatPendu): boolean {
  return [...normaliser(e.mot)].every((l) => e.essais.includes(l));
}

export function perdu(e: EtatPendu): boolean {
  return erreurs(e) >= e.max;
}

/** Mot à afficher : lettres trouvées (avec leurs accents), « _ » sinon. */
export function motAffiche(e: EtatPendu, reveler = false): string[] {
  return [...e.mot].map((c) => (reveler || e.essais.includes(normaliser(c)) ? c : '_'));
}

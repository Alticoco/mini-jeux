import { melanger, type Rng } from '../../shared/alea';
import { paquetMelange, type Carte } from '../../shared/cartes';

export interface EtatBataille {
  joueur: Carte[]; // index 0 = dessus de la pile
  ordi: Carte[];
  manches: number;
}

export interface ResultatManche {
  /** Cartes retournées lors de la dernière confrontation. */
  carteJoueur: Carte | null;
  carteOrdi: Carte | null;
  gagnant: 'joueur' | 'ordi';
  /** Nombre de « batailles » (égalités) enchaînées. */
  batailles: number;
  /** Cartes gagnées par le vainqueur de la manche. */
  gain: number;
}

export const MANCHES_MAX = 2000;

export function nouvelle(rng: Rng = Math.random): EtatBataille {
  const p = paquetMelange(rng);
  return { joueur: p.slice(0, 26), ordi: p.slice(26), manches: 0 };
}

/** L'as est la plus forte carte. */
export function valeur(c: Carte): number {
  return c.rang === 1 ? 14 : c.rang;
}

export function fini(e: EtatBataille): boolean {
  return e.joueur.length === 0 || e.ordi.length === 0 || e.manches >= MANCHES_MAX;
}

/** Vainqueur de la partie (à la limite de manches : celui qui a le plus de cartes). */
export function vainqueur(e: EtatBataille): 'joueur' | 'ordi' | null {
  if (!fini(e)) return null;
  return e.joueur.length >= e.ordi.length ? 'joueur' : 'ordi';
}

/** Joue une manche (avec batailles). Modifie l'état. */
export function jouerManche(e: EtatBataille, rng: Rng = Math.random): ResultatManche | null {
  if (fini(e)) return null;
  const pot: Carte[] = [];
  let batailles = 0;
  let cj: Carte | null = null;
  let co: Carte | null = null;
  for (;;) {
    cj = e.joueur.shift() ?? null;
    co = e.ordi.shift() ?? null;
    if (cj) pot.push(cj);
    if (co) pot.push(co);
    if (!cj || !co) break; // plus de cartes pour poursuivre une bataille : l'autre gagne
    if (valeur(cj) !== valeur(co)) break;
    batailles++;
    // bataille : chacun pose une carte face cachée, puis on rejoue (s'il lui en reste)
    const cacheJ = e.joueur.length > 1 ? e.joueur.shift() : undefined;
    const cacheO = e.ordi.length > 1 ? e.ordi.shift() : undefined;
    if (cacheJ) pot.push(cacheJ);
    if (cacheO) pot.push(cacheO);
  }
  const gagnant: 'joueur' | 'ordi' = !cj ? 'ordi' : !co ? 'joueur' : valeur(cj) > valeur(co) ? 'joueur' : 'ordi';
  // Ordre aléatoire sous la pile du vainqueur : évite les parties infinies.
  (gagnant === 'joueur' ? e.joueur : e.ordi).push(...melanger(pot, rng));
  e.manches++;
  return { carteJoueur: cj, carteOrdi: co, gagnant, batailles, gain: pot.length };
}

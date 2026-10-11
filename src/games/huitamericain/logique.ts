import { choisir, melanger, type Rng } from '../../shared/alea';
import { COULEURS, paquetMelange, type Carte, type Couleur } from '../../shared/cartes';

export interface Etat {
  mains: [Carte[], Carte[]]; // 0 = joueur, 1 = ordinateur
  pioche: Carte[];
  defausse: Carte[]; // dessus = dernier
  couleur: Couleur; // couleur à jouer (change après un 8)
  tour: 0 | 1;
  gagnant: 0 | 1 | null;
}

export function nouvelle(rng: Rng = Math.random): Etat {
  const p = paquetMelange(rng);
  const mains: [Carte[], Carte[]] = [p.splice(0, 7), p.splice(0, 7)];
  // la carte de départ n'est jamais un 8
  let k = p.findIndex((c) => c.rang !== 8);
  if (k < 0) k = 0;
  const depart = p.splice(k, 1)[0]!;
  return { mains, pioche: p, defausse: [depart], couleur: depart.couleur, tour: 0, gagnant: null };
}

export const dessus = (e: Etat): Carte => e.defausse[e.defausse.length - 1]!;

export function jouable(e: Etat, c: Carte): boolean {
  return c.rang === 8 || c.couleur === e.couleur || c.rang === dessus(e).rang;
}

export function cartesJouables(e: Etat, j: 0 | 1): number[] {
  return e.mains[j].flatMap((c, i) => (jouable(e, c) ? [i] : []));
}

/** Joue la carte i de la main de j ; `couleur` est requise pour un 8. */
export function jouerCarte(e: Etat, j: 0 | 1, i: number, couleur?: Couleur): boolean {
  const c = e.mains[j][i];
  if (!c || e.tour !== j || e.gagnant !== null || !jouable(e, c)) return false;
  e.mains[j].splice(i, 1);
  e.defausse.push(c);
  e.couleur = c.rang === 8 ? couleur ?? c.couleur : c.couleur;
  if (e.mains[j].length === 0) e.gagnant = j;
  else e.tour = j === 0 ? 1 : 0;
  return true;
}

/** Pioche une carte (reforme la pioche si besoin). Renvoie la carte ou null si plus rien à piocher. */
export function piocher(e: Etat, j: 0 | 1, rng: Rng = Math.random): Carte | null {
  if (!e.pioche.length && e.defausse.length > 1) {
    const haut = e.defausse.pop()!;
    e.pioche = melanger(e.defausse, rng);
    e.defausse = [haut];
  }
  const c = e.pioche.pop();
  if (!c) return null;
  e.mains[j].push(c);
  return c;
}

export function passer(e: Etat, j: 0 | 1): void {
  if (e.tour === j) e.tour = j === 0 ? 1 : 0;
}

export function peutPiocher(e: Etat): boolean {
  return e.pioche.length > 0 || e.defausse.length > 1;
}

/** Couleur la plus présente dans la main (pour choisir après un 8). */
export function couleurPreferee(main: readonly Carte[], rng: Rng = Math.random): Couleur {
  const n = (col: Couleur) => main.filter((c) => c.couleur === col && c.rang !== 8).length;
  const max = Math.max(...COULEURS.map(n));
  return choisir(COULEURS.filter((c) => n(c) === max), rng);
}

/** Tour complet de l'ordinateur ; renvoie un résumé pour l'affichage. */
export function tourOrdi(e: Etat, rng: Rng = Math.random): string {
  let pioches = 0;
  for (;;) {
    const jou = cartesJouables(e, 1);
    if (jou.length) {
      const normales = jou.filter((i) => e.mains[1][i]!.rang !== 8);
      const i = normales.length ? choisir(normales, rng) : jou[0]!;
      const carte = e.mains[1][i]!;
      const reste = e.mains[1].filter((_, k) => k !== i);
      const couleur = carte.rang === 8 ? couleurPreferee(reste, rng) : undefined;
      jouerCarte(e, 1, i, couleur);
      const piocheTxt = pioches ? ` après avoir pioché ${pioches} carte${pioches > 1 ? 's' : ''}` : '';
      return `L'ordinateur joue${piocheTxt}${couleur ? ` un 8 et choisit ${couleur === 'coeur' ? '♥' : couleur === 'carreau' ? '♦' : couleur === 'pique' ? '♠' : '♣'}` : ''}.`;
    }
    if (!piocher(e, 1, rng)) {
      passer(e, 1);
      return 'L\'ordinateur passe son tour (plus de pioche).';
    }
    pioches++;
  }
}

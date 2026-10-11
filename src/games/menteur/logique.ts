import { entier, type Rng } from '../../shared/alea';
import { paquetMelange, type Carte } from '../../shared/cartes';

export interface Annonce {
  par: 0 | 1;
  rang: number;
  cartes: Carte[]; // cartes réellement posées (cachées)
}

export interface Etat {
  mains: [Carte[], Carte[]]; // 0 = joueur, 1 = ordinateur
  tas: Carte[];
  rang: number; // rang à annoncer au prochain tour (1 à 13)
  tour: 0 | 1;
  annonce: Annonce | null;
  gagnant: 0 | 1 | null;
}

export function nouvelle(rng: Rng = Math.random): Etat {
  const p = paquetMelange(rng);
  return { mains: [p.slice(0, 26), p.slice(26)], tas: [], rang: 1, tour: 0, annonce: null, gagnant: null };
}

/** Le joueur j pose les cartes d'indices donnés (1 à 4), en annonçant le rang demandé. */
export function poser(e: Etat, j: 0 | 1, indices: number[]): boolean {
  if (e.tour !== j || e.annonce || e.gagnant !== null || indices.length < 1 || indices.length > 4) return false;
  const tri = [...new Set(indices)].sort((a, b) => b - a);
  if (tri.length !== indices.length || tri.some((i) => i < 0 || i >= e.mains[j].length)) return false;
  const cartes = tri.map((i) => e.mains[j].splice(i, 1)[0]!);
  e.annonce = { par: j, rang: e.rang, cartes };
  return true;
}

export function honnete(a: Annonce): boolean {
  return a.cartes.every((c) => c.rang === a.rang);
}

/** Le répondant conteste (ou non) l'annonce en cours. Renvoie qui ramasse le tas (ou null). */
export function repondre(e: Etat, conteste: boolean): { ramasse: 0 | 1 | null; honnete: boolean } {
  const a = e.annonce!;
  const repondant: 0 | 1 = a.par === 0 ? 1 : 0;
  const hon = honnete(a);
  e.tas.push(...a.cartes);
  let ramasse: 0 | 1 | null = null;
  if (conteste) {
    ramasse = hon ? repondant : a.par;
    e.mains[ramasse].push(...e.tas);
    e.tas = [];
  }
  e.annonce = null;
  e.rang = (e.rang % 13) + 1;
  if (e.mains[a.par].length === 0) e.gagnant = a.par;
  else e.tour = repondant; // celui qui répond joue ensuite
  return { ramasse, honnete: hon };
}

/** Choix de l'ordinateur : cartes honnêtes si possible, parfois un bluff. */
export function choisirJeu(e: Etat, j: 0 | 1, rng: Rng = Math.random): number[] {
  const main = e.mains[j];
  const vraies = main.flatMap((c, i) => (c.rang === e.rang ? [i] : []));
  const autres = main.flatMap((c, i) => (c.rang !== e.rang ? [i] : []));
  if (vraies.length && (rng() > 0.3 || !autres.length)) {
    // parfois on glisse une fausse carte avec les vraies
    if (autres.length && vraies.length < 4 && rng() < 0.15) return [...vraies, autres[entier(autres.length, rng)]!];
    return vraies;
  }
  if (main.length <= 2) return main.map((_, i) => i);
  const nb = rng() < 0.7 ? 1 : 2;
  const idx = new Set<number>();
  while (idx.size < Math.min(nb, autres.length)) idx.add(autres[entier(autres.length, rng)]!);
  return [...idx];
}

/** L'ordinateur (répondant r) conteste-t-il ? */
export function veutContester(e: Etat, r: 0 | 1, rng: Rng = Math.random): boolean {
  const a = e.annonce!;
  const mesCartes = e.mains[r].filter((c) => c.rang === a.rang).length;
  if (a.cartes.length + mesCartes > 4) return true; // impossible : il ment forcément
  if (e.mains[a.par].length === 0) return rng() < 0.85; // dernière carte : gros enjeu
  const p = 0.2 + 0.1 * a.cartes.length + (e.tas.length > 8 ? -0.05 : 0.1);
  return rng() < p;
}

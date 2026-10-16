import { choisir, type Rng } from '../../shared/alea';
import { estRouge, paquetMelange, type Carte } from '../../shared/cartes';
import type { Difficulte } from '../../core/types';

/**
 * Crapette (Russian Bank) simplifiée à deux joueurs, chacun avec son jeu de 52 cartes.
 * Chaque joueur a une réserve de 13 cartes, une pioche et une défausse. 8 colonnes communes (descendantes, couleurs alternées)
 * et 8 fondations communes (même couleur, de l'as au roi). On peut aussi jouer sur la réserve ou la défausse de l'adversaire
 * (même couleur, valeur ±1). Le premier qui vide sa réserve gagne.
 */
export type Joueur = 0 | 1;

export interface Cote { reserve: Carte[]; pioche: Carte[]; defausse: Carte[] }

export interface Etat {
  cotes: [Cote, Cote];
  colonnes: Carte[][]; // 8
  fondations: Carte[][]; // 8
  tour: Joueur;
  aTire: boolean;
  tours: number;
  fini: boolean;
  gagnant: Joueur | null;
}

export type Source = { t: 'reserve' } | { t: 'defausse' } | { t: 'colonne'; i: number };
export type Destination = { t: 'fondation' } | { t: 'colonne'; i: number } | { t: 'adverse'; pile: 'reserve' | 'defausse' };

export function nouvelle(rng: Rng = Math.random): Etat {
  const jeux = [paquetMelange(rng), paquetMelange(rng)];
  const cotes = jeux.map((p) => ({ reserve: p.splice(0, 13), pioche: [] as Carte[], defausse: [] as Carte[] })) as [Cote, Cote];
  const colonnes: Carte[][] = [];
  for (let k = 0; k < 4; k++) colonnes.push([jeux[0]!.pop()!]);
  for (let k = 0; k < 4; k++) colonnes.push([jeux[1]!.pop()!]);
  cotes[0].pioche = jeux[0]!;
  cotes[1].pioche = jeux[1]!;
  return { cotes, colonnes, fondations: Array.from({ length: 8 }, () => []), tour: 0, aTire: false, tours: 0, fini: false, gagnant: null };
}

const sommet = (p: readonly Carte[]): Carte | undefined => p[p.length - 1];

export function carteSource(e: Etat, j: Joueur, s: Source): Carte | undefined {
  return s.t === 'reserve' ? sommet(e.cotes[j].reserve) : s.t === 'defausse' ? sommet(e.cotes[j].defausse) : sommet(e.colonnes[s.i] ?? []);
}

export function indexFondation(e: Etat, c: Carte): number {
  const i = e.fondations.findIndex((f) => f.length && sommet(f)!.couleur === c.couleur && sommet(f)!.rang + 1 === c.rang);
  if (i >= 0) return i;
  return c.rang === 1 ? e.fondations.findIndex((f) => !f.length) : -1;
}

export function peutJouer(e: Etat, j: Joueur, s: Source, d: Destination): boolean {
  if (e.fini || e.tour !== j) return false;
  const c = carteSource(e, j, s);
  if (!c) return false;
  if (d.t === 'fondation') return indexFondation(e, c) >= 0;
  if (d.t === 'colonne') {
    if (s.t === 'colonne' && s.i === d.i) return false;
    const col = e.colonnes[d.i]!;
    const t = sommet(col);
    if (!t) return s.t !== 'colonne'; // une colonne vide ne se remplit que depuis la réserve ou la défausse
    return estRouge(t.couleur) !== estRouge(c.couleur) && t.rang === c.rang + 1;
  }
  const adv = e.cotes[j === 0 ? 1 : 0];
  const t = sommet(adv[d.pile]);
  return !!t && t.couleur === c.couleur && Math.abs(t.rang - c.rang) === 1;
}

function retirer(e: Etat, j: Joueur, s: Source): Carte {
  if (s.t === 'reserve') return e.cotes[j].reserve.pop()!;
  if (s.t === 'defausse') return e.cotes[j].defausse.pop()!;
  return e.colonnes[s.i]!.pop()!;
}

export function jouer(e: Etat, j: Joueur, s: Source, d: Destination): boolean {
  if (!peutJouer(e, j, s, d)) return false;
  const c = retirer(e, j, s);
  if (d.t === 'fondation') e.fondations[indexFondation(e, c) >= 0 ? indexFondation(e, c) : 0]!.push(c);
  else if (d.t === 'colonne') e.colonnes[d.i]!.push(c);
  else e.cotes[j === 0 ? 1 : 0][d.pile].push(c);
  if (!e.cotes[j].reserve.length) { e.fini = true; e.gagnant = j; }
  return true;
}

/** Retourne la carte du dessus de la pioche sur la défausse (la défausse est retournée si la pioche est vide). */
export function tirer(e: Etat, j: Joueur): boolean {
  if (e.fini || e.tour !== j || e.aTire) return false;
  const c = e.cotes[j];
  if (!c.pioche.length) {
    if (c.defausse.length < 2) { e.aTire = true; return true; } // rien à tirer : on peut finir son tour
    c.pioche = c.defausse.reverse();
    c.defausse = [];
  }
  c.defausse.push(c.pioche.pop()!);
  e.aTire = true;
  return true;
}

export function finDuTour(e: Etat, j: Joueur): boolean {
  if (e.fini || e.tour !== j || !e.aTire) return false;
  e.tour = j === 0 ? 1 : 0;
  e.aTire = false;
  e.tours++;
  if (e.tours > 600) { // partie interminable : moins de cartes en réserve gagne
    e.fini = true;
    const [a, b] = [e.cotes[0].reserve.length, e.cotes[1].reserve.length];
    e.gagnant = a === b ? null : a < b ? 0 : 1;
  }
  return true;
}

export function coupsPossibles(e: Etat, j: Joueur): Array<{ s: Source; d: Destination; v: number }> {
  const res: Array<{ s: Source; d: Destination; v: number }> = [];
  const sources: Source[] = [{ t: 'reserve' }, { t: 'defausse' }, ...e.colonnes.map((_, i) => ({ t: 'colonne' as const, i }))];
  for (const s of sources) {
    const destinations: Destination[] = [{ t: 'fondation' }, ...e.colonnes.map((_, i) => ({ t: 'colonne' as const, i })), { t: 'adverse', pile: 'reserve' }, { t: 'adverse', pile: 'defausse' }];
    for (const d of destinations) if (peutJouer(e, j, s, d)) res.push({ s, d, v: valeurCoup(e, s, d) });
  }
  return res;
}

function valeurCoup(e: Etat, s: Source, d: Destination): number {
  const base = s.t === 'reserve' ? 60 : s.t === 'defausse' ? 30 : 10;
  if (d.t === 'fondation') return base + 40;
  if (d.t === 'adverse') return s.t === 'colonne' ? 5 : base + 12;
  // colonne : on évite de déplacer sans raison une carte de colonne vers une autre
  if (s.t === 'colonne') {
    const col = e.colonnes[s.i]!;
    return col.length === 1 && e.colonnes[d.i]!.length > 0 ? 25 : -1;
  }
  return base + 20 + (e.colonnes[d.i]!.length === 0 ? -8 : 0);
}

/** Tour complet de l'ordinateur ; renvoie le nombre de cartes jouées. */
export function tourOrdi(e: Etat, j: Joueur, niveau: Difficulte, rng: Rng = Math.random): number {
  let jouees = 0;
  for (let garde = 0; garde < 150 && !e.fini; garde++) {
    let coups = coupsPossibles(e, j).filter((c) => c.v > 0);
    if (niveau === 'facile') coups = coups.filter((c) => c.s.t !== 'colonne' || rng() < 0.5);
    if (coups.length) {
      const max = Math.max(...coups.map((c) => c.v));
      const c = choisir(coups.filter((x) => x.v >= max - (niveau === 'difficile' ? 0 : 15)), rng);
      jouer(e, j, c.s, c.d);
      jouees++;
      continue;
    }
    if (!e.aTire) { tirer(e, j); continue; }
    break;
  }
  if (!e.fini) { if (!e.aTire) tirer(e, j); finDuTour(e, j); }
  return jouees;
}

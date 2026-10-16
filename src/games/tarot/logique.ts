import { choisir, melanger, type Rng } from '../../shared/alea';
import { COULEURS, type Couleur } from '../../shared/cartes';
import type { Difficulte } from '../../core/types';

/**
 * Tarot français à 4 joueurs : un preneur contre trois défenseurs.
 * 78 cartes : 21 atouts, l'Excuse, et 4 couleurs de 14 cartes (1-10, valet 11, cavalier 12, dame 13, roi 14).
 * Version simplifiée : ni poignée ni chelem ; l'Excuse reste à son camp ; petit au bout compté.
 */
export type CarteT = { t: 'a'; n: number } | { t: 'c'; couleur: Couleur; n: number } | { t: 'e' };
export const NB = 4;

export const estAtout = (c: CarteT): c is { t: 'a'; n: number } => c.t === 'a';
export const estExcuse = (c: CarteT): boolean => c.t === 'e';
export const estOudler = (c: CarteT): boolean => c.t === 'e' || (c.t === 'a' && (c.n === 1 || c.n === 21));
export const estRoi = (c: CarteT): boolean => c.t === 'c' && c.n === 14;

export function valeur(c: CarteT): number {
  if (estOudler(c)) return 4.5;
  if (c.t === 'c') return c.n === 14 ? 4.5 : c.n === 13 ? 3.5 : c.n === 12 ? 2.5 : c.n === 11 ? 1.5 : 0.5;
  return 0.5;
}

export function paquet78(): CarteT[] {
  const res: CarteT[] = [{ t: 'e' }];
  for (let n = 1; n <= 21; n++) res.push({ t: 'a', n });
  for (const couleur of COULEURS) for (let n = 1; n <= 14; n++) res.push({ t: 'c', couleur, n });
  return res;
}

export type Contrat = 0 | 1 | 2 | 4 | 6; // passe, petite, garde, garde sans, garde contre
export const NOM_CONTRAT: Record<Contrat, string> = { 0: 'Passe', 1: 'Petite', 2: 'Garde', 4: 'Garde sans', 6: 'Garde contre' };
export const CONTRATS: Contrat[] = [1, 2, 4, 6];

export interface Etat {
  phase: 'encheres' | 'chien' | 'jeu' | 'fini' | 'redonne';
  donneur: number;
  mains: CarteT[][];
  chien: CarteT[];
  encheres: Array<{ joueur: number; contrat: Contrat }>;
  preneur: number;
  contrat: Contrat;
  tour: number;
  pli: Array<{ joueur: number; carte: CarteT }>;
  piles: [CarteT[], CarteT[]]; // 0 = preneur, 1 = défenseurs
  nbPlis: number;
  petitAuBout: number | null; // camp (0/1) ayant remporté le dernier pli contenant le petit
  scores: number[]; // cumul par joueur
  resultat: Resultat | null;
}

export interface Resultat { points: number; requis: number; oudlers: number; reussi: boolean; ecart: number; petitAuBout: number | null; gains: number[] }

export function nouvelleDonne(donneur: number, scores: number[] = [0, 0, 0, 0], rng: Rng = Math.random): Etat {
  const p = melanger(paquet78(), rng);
  const chien = p.splice(0, 6);
  const mains = Array.from({ length: NB }, () => p.splice(0, 18));
  for (const m of mains) trierMain(m);
  return { phase: 'encheres', donneur, mains, chien, encheres: [], preneur: -1, contrat: 0, tour: (donneur + 1) % NB, pli: [], piles: [[], []], nbPlis: 0, petitAuBout: null, scores, resultat: null };
}

const ordreCouleur: Record<string, number> = { pique: 1, coeur: 2, trefle: 3, carreau: 4 };
export function trierMain(m: CarteT[]): void {
  const cle = (c: CarteT) => (c.t === 'e' ? 0 : c.t === 'a' ? 100 + c.n : ordreCouleur[c.couleur]! * 20 - 0 + c.n - 300);
  m.sort((a, b) => cle(a) - cle(b));
}

export function meilleurContrat(e: Etat): Contrat {
  return Math.max(0, ...e.encheres.map((x) => x.contrat)) as Contrat;
}

/** Enchère du joueur au tour : doit être une passe ou dépasser la meilleure. */
export function encherir(e: Etat, j: number, contrat: Contrat): boolean {
  if (e.phase !== 'encheres' || e.tour !== j) return false;
  if (contrat !== 0 && contrat <= meilleurContrat(e)) return false;
  e.encheres.push({ joueur: j, contrat });
  if (e.encheres.length === NB) {
    const meilleur = e.encheres.reduce((m, x) => (x.contrat > m.contrat ? x : m));
    if (meilleur.contrat === 0) { e.phase = 'redonne'; return true; }
    e.preneur = meilleur.joueur;
    e.contrat = meilleur.contrat;
    if (e.contrat <= 2) {
      e.mains[e.preneur]!.push(...e.chien);
      trierMain(e.mains[e.preneur]!);
      e.phase = 'chien';
    } else {
      (e.contrat === 4 ? e.piles[0] : e.piles[1]).push(...e.chien);
      e.phase = 'jeu';
    }
    if (e.phase === 'jeu') e.tour = (e.donneur + 1) % NB;
    return true;
  }
  e.tour = (e.tour + 1) % NB;
  return true;
}

/** Écart : le preneur met 6 cartes de côté (ni rois ni bouts ; atouts seulement par nécessité). */
export function ecartValide(e: Etat, cartes: readonly CarteT[]): boolean {
  const main = e.mains[e.preneur]!;
  if (cartes.length !== 6 || new Set(cartes).size !== 6 || !cartes.every((c) => main.includes(c))) return false;
  if (cartes.some((c) => estRoi(c) || estOudler(c))) return false;
  const autres = main.filter((c) => !estRoi(c) && !estOudler(c) && c.t !== 'a').length;
  const atoutsEcartes = cartes.filter((c) => c.t === 'a').length;
  return atoutsEcartes === 0 || autres < 6;
}

export function ecarter(e: Etat, cartes: readonly CarteT[]): boolean {
  if (e.phase !== 'chien' || !ecartValide(e, cartes)) return false;
  e.mains[e.preneur] = e.mains[e.preneur]!.filter((c) => !cartes.includes(c));
  e.piles[0].push(...cartes);
  e.chien = [];
  e.phase = 'jeu';
  e.tour = (e.donneur + 1) % NB;
  return true;
}

function coucheDemandee(e: Etat): CarteT | null {
  return e.pli.map((p) => p.carte).find((c) => !estExcuse(c)) ?? null;
}

const plusHautAtout = (cartes: readonly CarteT[]): number => Math.max(0, ...cartes.filter(estAtout).map((c) => c.n));

export function cartesJouables(e: Etat, j: number): CarteT[] {
  const main = e.mains[j]!;
  const demande = coucheDemandee(e);
  if (!demande) return [...main];
  const excuse = main.filter(estExcuse);
  const dejaJoue = e.pli.map((p) => p.carte);
  if (estAtout(demande)) {
    const atouts = main.filter(estAtout);
    if (!atouts.length) return [...main];
    const haut = plusHautAtout(dejaJoue);
    const plusFortes = atouts.filter((c) => c.n > haut);
    return [...(plusFortes.length ? plusFortes : atouts), ...excuse];
  }
  const couleur = main.filter((c) => c.t === 'c' && c.couleur === (demande as { couleur: Couleur }).couleur);
  if (couleur.length) return [...couleur, ...excuse];
  const atouts = main.filter(estAtout);
  if (atouts.length) {
    const haut = plusHautAtout(dejaJoue);
    const plusFortes = atouts.filter((c) => c.n > haut);
    return [...(plusFortes.length ? plusFortes : atouts), ...excuse];
  }
  return [...main];
}

export function gagnantDuPli(pli: ReadonlyArray<{ joueur: number; carte: CarteT }>): number {
  const jouees = pli.filter((p) => !estExcuse(p.carte));
  if (!jouees.length) return pli[0]!.joueur;
  const atouts = jouees.filter((p) => estAtout(p.carte));
  if (atouts.length) return atouts.reduce((m, p) => ((p.carte as { n: number }).n > (m.carte as { n: number }).n ? p : m)).joueur;
  const demande = jouees[0]!.carte as { couleur: Couleur };
  return jouees.filter((p) => p.carte.t === 'c' && p.carte.couleur === demande.couleur).reduce((m, p) => ((p.carte as { n: number }).n > (m.carte as { n: number }).n ? p : m)).joueur;
}

const camp = (e: Etat, j: number): 0 | 1 => (j === e.preneur ? 0 : 1);

export function jouerCarte(e: Etat, j: number, carte: CarteT): { pliFini?: { gagnant: number; points: number; cartes: Array<{ joueur: number; carte: CarteT }> }; donneFinie?: boolean } | null {
  if (e.phase !== 'jeu' || e.tour !== j || !cartesJouables(e, j).includes(carte)) return null;
  e.mains[j] = e.mains[j]!.filter((c) => c !== carte);
  e.pli.push({ joueur: j, carte });
  if (e.pli.length < NB) { e.tour = (j + 1) % NB; return {}; }
  const gagnant = gagnantDuPli(e.pli);
  const cartes = [...e.pli];
  let pts = 0;
  for (const p of e.pli) {
    pts += valeur(p.carte);
    // l'Excuse retourne toujours dans le camp de son propriétaire
    e.piles[estExcuse(p.carte) ? camp(e, p.joueur) : camp(e, gagnant)].push(p.carte);
  }
  e.nbPlis++;
  if (e.nbPlis === 18 && cartes.some((p) => estAtout(p.carte) && p.carte.n === 1)) e.petitAuBout = camp(e, gagnant);
  e.pli = [];
  e.tour = gagnant;
  const info = { gagnant, points: pts, cartes };
  if (e.nbPlis === 18) { terminer(e); return { pliFini: info, donneFinie: true }; }
  return { pliFini: info };
}

const REQUIS = [56, 51, 41, 36];

function terminer(e: Etat): void {
  const pile = e.piles[0];
  const points = pile.reduce((s, c) => s + valeur(c), 0);
  const oudlers = pile.filter(estOudler).length;
  const requis = REQUIS[oudlers]!;
  const ecart = Math.round((points - requis) * 2) / 2;
  const reussi = ecart >= 0;
  const mult = e.contrat;
  let base = (25 + Math.abs(Math.round(ecart))) * mult;
  if (e.petitAuBout !== null) base += (e.petitAuBout === 0 ? 1 : -1) * 10 * mult;
  const valeurDonne = reussi ? base : -(25 + Math.abs(Math.round(ecart))) * mult + (e.petitAuBout !== null ? (e.petitAuBout === 0 ? 1 : -1) * 10 * mult : 0);
  const gains = Array<number>(NB).fill(-valeurDonne);
  gains[e.preneur] = 3 * valeurDonne;
  e.scores = e.scores.map((s, i) => s + gains[i]!);
  e.resultat = { points, requis, oudlers, reussi, ecart, petitAuBout: e.petitAuBout, gains };
  e.phase = 'fini';
}

/* --------------------------------------------- Intelligence artificielle --------------------------------------------- */

export function forceMain(main: readonly CarteT[]): number {
  const atouts = main.filter(estAtout);
  return main.filter(estOudler).length * 7 + atouts.length * 1.4 + atouts.filter((c) => c.n >= 15).length * 2.5 + main.filter(estRoi).length * 3.2
    + main.filter((c) => c.t === 'c' && c.n === 13).length * 1.4;
}

const SEUILS: Record<Difficulte, number[]> = { facile: [30, 36, 48, 60], moyen: [26, 32, 42, 54], difficile: [24, 30, 40, 52] };

export function choixEnchere(e: Etat, j: number, niveau: Difficulte): Contrat {
  const f = forceMain(e.mains[j]!);
  const s = SEUILS[niveau];
  let voulu: Contrat = 0;
  CONTRATS.forEach((c, i) => { if (f >= s[i]!) voulu = c; });
  return voulu > meilleurContrat(e) ? voulu : 0;
}

/** Écart de l'ordinateur : cartes sans valeur, en raccourcissant les couleurs les plus courtes. */
export function ecartIA(e: Etat): CarteT[] {
  const main = e.mains[e.preneur]!;
  const eligibles = main.filter((c) => c.t === 'c' && !estRoi(c));
  const longueur = (c: CarteT) => (c.t === 'c' ? main.filter((x) => x.t === 'c' && x.couleur === c.couleur).length : 99);
  const tri = [...eligibles].sort((a, b) => valeur(a) - valeur(b) || longueur(a) - longueur(b) || (a as { n: number }).n - (b as { n: number }).n);
  const res = tri.slice(0, 6);
  if (res.length < 6) {
    const atouts = main.filter((c) => estAtout(c) && !estOudler(c)).sort((a, b) => (a as { n: number }).n - (b as { n: number }).n);
    res.push(...atouts.slice(0, 6 - res.length));
  }
  return res;
}

export function choixCarte(e: Etat, j: number, niveau: Difficulte, rng: Rng = Math.random): CarteT {
  const jouables = cartesJouables(e, j);
  if (jouables.length === 1) return jouables[0]!;
  if (niveau === 'facile') return choisir(jouables.filter((c) => !estExcuse(c)).length ? jouables.filter((c) => !estExcuse(c)) : jouables, rng);
  const main = e.mains[j]!;
  const sansExcuse = jouables.filter((c) => !estExcuse(c));
  const numero = (c: CarteT) => (c as { n: number }).n;
  const faible = (cs: CarteT[]) => [...cs].sort((a, b) => valeur(a) - valeur(b) || (a.t === 'a' ? 100 + numero(a) : numero(a)) - (b.t === 'a' ? 100 + numero(b) : numero(b)))[0]!;
  const monCamp = camp(e, j);
  if (!e.pli.length) {
    const atouts = sansExcuse.filter(estAtout);
    const rois = sansExcuse.filter(estRoi);
    const excuseEntame = jouables.find(estExcuse);
    if (excuseEntame && e.nbPlis === 0 && j !== e.preneur) return excuseEntame;
    if (monCamp === 0) {
      if (atouts.length >= 7 && atouts.length) return [...atouts].sort((a, b) => numero(b) - numero(a))[0]!;
      if (rois.length) return rois[0]!;
    } else if (rois.length) return rois[0]!;
    const couleurs = sansExcuse.filter((c) => c.t === 'c');
    if (couleurs.length) return faible(couleurs);
    return faible(sansExcuse.length ? sansExcuse : jouables);
  }
  const gagnantActuel = gagnantDuPli(e.pli);
  const allie = monCamp === 1 && camp(e, gagnantActuel) === 1;
  const dernier = e.pli.length === NB - 1;
  const pointsPli = e.pli.reduce((s, p) => s + valeur(p.carte), 0);
  const gagnantes = sansExcuse.filter((c) => gagnantDuPli([...e.pli, { joueur: j, carte: c }]) === j);
  if (allie && (dernier || estAtout(e.pli.find((p) => p.joueur === gagnantActuel)!.carte))) {
    // on donne des points au partenaire
    const ordre = [...sansExcuse].filter((c) => !estOudler(c)).sort((a, b) => valeur(b) - valeur(a));
    if (ordre.length) return ordre[0]!;
  }
  if (!allie && gagnantes.length && (pointsPli >= 2 || dernier || monCamp === 0)) {
    // gagner au moindre coût
    return [...gagnantes].sort((a, b) => (a.t === 'a' ? 100 + numero(a) : numero(a)) - (b.t === 'a' ? 100 + numero(b) : numero(b)))[0]!;
  }
  const excuse = jouables.find(estExcuse);
  if (excuse && (e.nbPlis === 0 || (!allie && !gagnantes.length && pointsPli >= 4)) && main.length > 1) return excuse;
  return faible(sansExcuse.length ? sansExcuse : jouables);
}

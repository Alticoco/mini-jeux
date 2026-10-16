import { choisir, melanger, type Rng } from '../../shared/alea';
import { COULEURS, type Carte, type Couleur } from '../../shared/cartes';
import type { Difficulte } from '../../core/types';

/**
 * Belote à 4 joueurs (2 équipes). Joueurs 0 (vous), 1, 2 (votre partenaire), 3, dans le sens des aiguilles d'une montre.
 * Rangs : 1 = as, 7 à 10, 11 = valet, 12 = dame, 13 = roi.
 */
export const equipe = (j: number): number => j % 2;
export const OBJECTIF = 501;

const RANGS = [7, 8, 9, 10, 11, 12, 13, 1];
export const paquet32 = (): Carte[] => COULEURS.flatMap((couleur) => RANGS.map((rang) => ({ rang, couleur })));

const POINTS_ATOUT: Record<number, number> = { 11: 20, 9: 14, 1: 11, 10: 10, 13: 4, 12: 3, 8: 0, 7: 0 };
const POINTS_NORMAL: Record<number, number> = { 1: 11, 10: 10, 13: 4, 12: 3, 11: 2, 9: 0, 8: 0, 7: 0 };
const ORDRE_ATOUT = [11, 9, 1, 10, 13, 12, 8, 7];
const ORDRE_NORMAL = [1, 10, 13, 12, 11, 9, 8, 7];

export const points = (c: Carte, atout: Couleur): number => (c.couleur === atout ? POINTS_ATOUT[c.rang]! : POINTS_NORMAL[c.rang]!);
/** Force pour remporter un pli (plus grand = plus fort). */
export const force = (c: Carte, atout: Couleur): number => (c.couleur === atout ? 100 - ORDRE_ATOUT.indexOf(c.rang) : 50 - ORDRE_NORMAL.indexOf(c.rang));

export type Phase = 'enchere1' | 'enchere2' | 'jeu' | 'donneFinie' | 'redonne';

export interface Resultat { points: [number, number]; belote: number | null; preneur: number; reussi: boolean; capot: boolean; marque: [number, number] }

export interface Etat {
  phase: Phase;
  donneur: number;
  mains: Carte[][];
  retournee: Carte;
  pioche: Carte[];
  atout: Couleur | null;
  preneur: number;
  tour: number;
  pli: Array<{ joueur: number; carte: Carte }>;
  plis: Array<{ gagnant: number; points: number }>;
  jouees: Carte[];
  belote: { joueur: number; vue: number } | null; // joueur détenant roi + dame d'atout
  scores: [number, number]; // total de la partie
  resultat: Resultat | null;
  passes: number;
}

export function nouvelleDonne(donneur: number, scores: [number, number] = [0, 0], rng: Rng = Math.random): Etat {
  const p = melanger(paquet32(), rng);
  const mains = Array.from({ length: 4 }, () => p.splice(0, 5));
  const retournee = p.pop()!;
  return {
    phase: 'enchere1', donneur, mains, retournee, pioche: p, atout: null, preneur: -1, tour: (donneur + 1) % 4,
    pli: [], plis: [], jouees: [], belote: null, scores, resultat: null, passes: 0,
  };
}

function prendreAvecCouleur(e: Etat, j: number, couleur: Couleur): void {
  e.atout = couleur;
  e.preneur = j;
  e.mains[j]!.push(e.retournee);
  for (let k = 0; k < 4; k++) {
    const n = k === j ? 2 : 3;
    e.mains[k]!.push(...e.pioche.splice(0, n));
  }
  for (const m of e.mains) m.sort((a, b) => a.couleur.localeCompare(b.couleur) || force(b, couleur) - force(a, couleur));
  const roiDame = e.mains.findIndex((m) => m.some((c) => c.couleur === couleur && c.rang === 13) && m.some((c) => c.couleur === couleur && c.rang === 12));
  e.belote = roiDame >= 0 ? { joueur: roiDame, vue: 0 } : null;
  e.phase = 'jeu';
  e.tour = (e.donneur + 1) % 4;
  e.passes = 0;
}

export function prendre(e: Etat, j: number, couleur?: Couleur): boolean {
  if (e.tour !== j) return false;
  if (e.phase === 'enchere1') { prendreAvecCouleur(e, j, e.retournee.couleur); return true; }
  if (e.phase === 'enchere2' && couleur && couleur !== e.retournee.couleur) { prendreAvecCouleur(e, j, couleur); return true; }
  return false;
}

export function passer(e: Etat, j: number): boolean {
  if (e.tour !== j || (e.phase !== 'enchere1' && e.phase !== 'enchere2')) return false;
  e.passes++;
  e.tour = (e.tour + 1) % 4;
  if (e.passes >= 4) {
    e.passes = 0;
    if (e.phase === 'enchere1') e.phase = 'enchere2';
    else e.phase = 'redonne';
  }
  return true;
}

/** Cartes que le joueur a le droit de jouer (fournir, couper, surcouper, monter). */
export function cartesJouables(e: Etat, j: number): Carte[] {
  const main = e.mains[j]!;
  const atout = e.atout!;
  if (!e.pli.length) return [...main];
  const demande = e.pli[0]!.carte.couleur;
  const maitreActuel = pliGagnantActuel(e);
  const memeCouleur = main.filter((c) => c.couleur === demande);
  const meilleurAtout = Math.max(0, ...e.pli.filter((p) => p.carte.couleur === atout).map((p) => force(p.carte, atout)));
  if (demande === atout) {
    if (!memeCouleur.length) return [...main];
    const plusFortes = memeCouleur.filter((c) => force(c, atout) > meilleurAtout);
    return plusFortes.length ? plusFortes : memeCouleur;
  }
  if (memeCouleur.length) return memeCouleur;
  // ne peut pas fournir : on coupe sauf si le partenaire est maître
  if (equipe(maitreActuel) === equipe(j)) return [...main];
  const atouts = main.filter((c) => c.couleur === atout);
  if (!atouts.length) return [...main];
  const surcoupes = atouts.filter((c) => force(c, atout) > meilleurAtout);
  return surcoupes.length ? surcoupes : atouts;
}

export function pliGagnantActuel(e: Etat): number {
  const atout = e.atout!;
  const demande = e.pli[0]!.carte.couleur;
  const atouts = e.pli.filter((p) => p.carte.couleur === atout);
  const candidats = atouts.length ? atouts : e.pli.filter((p) => p.carte.couleur === demande);
  return candidats.reduce((m, p) => (force(p.carte, atout) > force(m.carte, atout) ? p : m)).joueur;
}

/** Joue une carte. Renvoie des annonces éventuelles. */
export function jouerCarte(e: Etat, j: number, carte: Carte): { annonce?: string; pliFini?: { gagnant: number; points: number; cartes: Array<{ joueur: number; carte: Carte }> }; donneFinie?: boolean } | null {
  if (e.phase !== 'jeu' || e.tour !== j) return null;
  if (!cartesJouables(e, j).includes(carte)) return null;
  const atout = e.atout!;
  e.mains[j] = e.mains[j]!.filter((c) => c !== carte);
  e.pli.push({ joueur: j, carte });
  e.jouees.push(carte);
  let annonce: string | undefined;
  if (e.belote && e.belote.joueur === j && carte.couleur === atout && (carte.rang === 13 || carte.rang === 12)) {
    e.belote.vue++;
    if (e.belote.vue === 1) annonce = 'Belote !';
    else if (e.belote.vue === 2) annonce = 'Rebelote !';
  }
  if (e.pli.length < 4) { e.tour = (j + 1) % 4; return { annonce }; }
  // pli complet
  const gagnant = pliGagnantActuel(e);
  let pts = e.pli.reduce((s, p) => s + points(p.carte, atout), 0);
  const dernier = e.plis.length === 7;
  if (dernier) pts += 10;
  const info = { gagnant, points: pts, cartes: [...e.pli] };
  e.plis.push({ gagnant, points: pts });
  e.pli = [];
  e.tour = gagnant;
  if (dernier) { terminerDonne(e); return { annonce, pliFini: info, donneFinie: true }; }
  return { annonce, pliFini: info };
}

function terminerDonne(e: Etat): void {
  const pts: [number, number] = [0, 0];
  const nbPlis: [number, number] = [0, 0];
  for (const p of e.plis) { pts[equipe(p.gagnant)] += p.points; nbPlis[equipe(p.gagnant)]++; }
  const eq = equipe(e.preneur);
  const adv = 1 - eq;
  const beloteEq = e.belote && e.belote.vue >= 2 ? equipe(e.belote.joueur) : null;
  if (beloteEq !== null) pts[beloteEq] += 20;
  const capot = nbPlis[eq] === 8 || nbPlis[adv] === 8;
  if (nbPlis[eq] === 8) pts[eq] += 90;
  if (nbPlis[adv] === 8) pts[adv] += 90;
  const reussi = pts[eq] >= 82 || nbPlis[eq] === 8;
  const marque: [number, number] = [0, 0];
  if (reussi) { marque[eq] = pts[eq]; marque[adv] = pts[adv]; }
  else { marque[adv] = 162 + (beloteEq === adv ? 20 : 0); marque[eq] = beloteEq === eq ? 20 : 0; if (nbPlis[adv] === 8) marque[adv] += 90; }
  e.scores = [e.scores[0] + marque[0], e.scores[1] + marque[1]];
  e.resultat = { points: pts, belote: beloteEq, preneur: e.preneur, reussi, capot, marque };
  e.phase = 'donneFinie';
}

export function partieFinie(e: Etat): number | null {
  const [a, b] = e.scores;
  if (a >= OBJECTIF || b >= OBJECTIF) return a === b ? null : a > b ? 0 : 1;
  return null;
}

/* ------------------------------------------- Intelligence artificielle ------------------------------------------- */

function forceMain(main: readonly Carte[], atout: Couleur): number {
  const atouts = main.filter((c) => c.couleur === atout);
  let s = atouts.reduce((t, c) => t + POINTS_ATOUT[c.rang]!, 0) + atouts.length * 8;
  if (atouts.some((c) => c.rang === 11) && atouts.some((c) => c.rang === 9)) s += 15;
  s += main.filter((c) => c.couleur !== atout && c.rang === 1).length * 8;
  if (atouts.some((c) => c.rang === 13) && atouts.some((c) => c.rang === 12)) s += 8;
  return s;
}

const SEUIL: Record<Difficulte, number> = { facile: 78, moyen: 66, difficile: 60 };

/** Décision d'enchère : renvoie la couleur choisie ou null pour passer. */
export function choixEnchere(e: Etat, j: number, niveau: Difficulte): Couleur | null {
  const seuil = SEUIL[niveau];
  if (e.phase === 'enchere1') {
    const main = [...e.mains[j]!, ...(j === e.tour ? [e.retournee] : [])];
    return forceMain(main, e.retournee.couleur) >= seuil ? e.retournee.couleur : null;
  }
  let meilleur: Couleur | null = null;
  let v = seuil - 8;
  for (const c of COULEURS) {
    if (c === e.retournee.couleur) continue;
    const f = forceMain(e.mains[j]!, c);
    if (f > v) { v = f; meilleur = c; }
  }
  return meilleur;
}

/** Le carte est-elle la plus forte restante de sa couleur ? */
function estMaitre(e: Etat, c: Carte): boolean {
  const atout = e.atout!;
  const restantes = paquet32().filter((x) => x.couleur === c.couleur && !e.jouees.includes(x) && !e.pli.some((p) => p.carte === x) && !e.mains[e.tour]!.includes(x));
  return restantes.every((x) => force(x, atout) < force(c, atout));
}

export function choixCarte(e: Etat, j: number, niveau: Difficulte, rng: Rng = Math.random): Carte {
  const atout = e.atout!;
  const jouables = cartesJouables(e, j);
  if (jouables.length === 1) return jouables[0]!;
  if (niveau === 'facile') return choisir(jouables, rng);
  const parForce = (a: Carte, b: Carte) => force(a, atout) - force(b, atout);
  const plusFaible = (cs: Carte[]) => [...cs].sort((a, b) => points(a, atout) - points(b, atout) || parForce(a, b))[0]!;
  const nous = equipe(j);
  if (!e.pli.length) {
    // entame
    const preneurNous = equipe(e.preneur) === nous;
    const atouts = jouables.filter((c) => c.couleur === atout);
    const maitres = jouables.filter((c) => estMaitre(e, c));
    if (preneurNous && atouts.length >= 2) {
      const gros = atouts.filter((c) => estMaitre(e, c));
      if (gros.length) return gros[0]!;
      if (j === e.preneur && atouts.some((c) => c.rang === 11 || c.rang === 9)) return [...atouts].sort(parForce).reverse()[0]!;
    }
    const maitresNonAtout = maitres.filter((c) => c.couleur !== atout);
    if (maitresNonAtout.length) return maitresNonAtout[0]!;
    if (maitres.length) return maitres[0]!;
    const nonAtout = jouables.filter((c) => c.couleur !== atout);
    return plusFaible(nonAtout.length ? nonAtout : jouables);
  }
  const gagnantActuel = pliGagnantActuel(e);
  const partenaireMaitre = equipe(gagnantActuel) === nous;
  const meilleurCarte = e.pli.find((p) => p.joueur === gagnantActuel)!.carte;
  const gagnantes = jouables.filter((c) => (c.couleur === atout && meilleurCarte.couleur !== atout) || (c.couleur === meilleurCarte.couleur && force(c, atout) > force(meilleurCarte, atout)));
  const dernierJoueur = e.pli.length === 3;
  if (partenaireMaitre) {
    // on charge si le partenaire est sûr de gagner (dernier à jouer ou carte maîtresse)
    const sur = dernierJoueur || estMaitre(e, meilleurCarte);
    if (sur) return [...jouables].sort((a, b) => points(b, atout) - points(a, atout))[0]!;
    return plusFaible(jouables);
  }
  if (gagnantes.length) {
    // gagner au moindre coût
    return [...gagnantes].sort(parForce)[0]!;
  }
  return plusFaible(jouables);
}

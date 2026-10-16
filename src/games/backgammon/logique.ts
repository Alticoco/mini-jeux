import { choisir, entier, type Rng } from '../../shared/alea';
import type { Difficulte } from '../../core/types';

/**
 * Backgammon. 24 points (index 0 à 23). Camp 0 = joueur : pions positifs, avance de 23 vers 0, maison = 0 à 5.
 * Camp 1 = ordinateur : pions négatifs, avance de 0 vers 23, maison = 18 à 23.
 */
export type Camp = 0 | 1;

export interface Etat {
  points: number[];
  barre: [number, number];
  hors: [number, number];
  des: number[]; // dés restant à jouer
  tour: Camp;
}

export interface Coup { de: number | 'barre'; vers: number | 'hors'; de_: number }

export function depart(): Etat {
  const p = Array<number>(24).fill(0);
  p[23] = 2; p[12] = 5; p[7] = 3; p[5] = 5;
  p[0] = -2; p[11] = -5; p[16] = -3; p[18] = -5;
  return { points: p, barre: [0, 0], hors: [0, 0], des: [], tour: 0 };
}

export const signe = (c: Camp): 1 | -1 => (c === 0 ? 1 : -1);
const propre = (e: Etat, c: Camp, i: number): number => e.points[i]! * signe(c);
export const adverse = (c: Camp): Camp => (c === 0 ? 1 : 0);

export function lancerDes(rng: Rng = Math.random): number[] {
  const a = entier(6, rng) + 1;
  const b = entier(6, rng) + 1;
  return a === b ? [a, a, a, a] : [a, b];
}

function toutesALaMaison(e: Etat, c: Camp): boolean {
  if (e.barre[c] > 0) return false;
  for (let i = 0; i < 24; i++) {
    if (propre(e, c, i) > 0 && (c === 0 ? i > 5 : i < 18)) return false;
  }
  return true;
}

/** Coups possibles avec un dé donné. */
export function coupsAvecDe(e: Etat, c: Camp, de_: number): Coup[] {
  const res: Coup[] = [];
  const dir = c === 0 ? -1 : 1;
  if (e.barre[c] > 0) {
    const t = c === 0 ? 24 - de_ : de_ - 1;
    if (propre(e, c, t) >= -1) res.push({ de: 'barre', vers: t, de_ });
    return res;
  }
  const maison = toutesALaMaison(e, c);
  for (let i = 0; i < 24; i++) {
    if (propre(e, c, i) <= 0) continue;
    const t = i + dir * de_;
    if (t >= 0 && t <= 23) {
      if (propre(e, c, t) >= -1) res.push({ de: i, vers: t, de_ });
    } else if (maison) {
      const dist = c === 0 ? i + 1 : 24 - i;
      if (de_ === dist) res.push({ de: i, vers: 'hors', de_ });
      else if (de_ > dist) {
        let plusLoin = false;
        for (let j = 0; j < 24; j++) if (propre(e, c, j) > 0 && (c === 0 ? j > i : j < i)) plusLoin = true;
        if (!plusLoin) res.push({ de: i, vers: 'hors', de_ });
      }
    }
  }
  return res;
}

export function appliquer(e: Etat, c: Camp, coup: Coup): Etat {
  const n: Etat = { points: [...e.points], barre: [...e.barre], hors: [...e.hors], des: [...e.des], tour: e.tour };
  const s = signe(c);
  if (coup.de === 'barre') n.barre[c]--;
  else n.points[coup.de] = n.points[coup.de]! - s;
  if (coup.vers === 'hors') n.hors[c]++;
  else {
    if (n.points[coup.vers]! * s === -1) {
      n.points[coup.vers] = 0;
      n.barre[adverse(c)]++;
    }
    n.points[coup.vers] = n.points[coup.vers]! + s;
  }
  const k = n.des.indexOf(coup.de_);
  if (k >= 0) n.des.splice(k, 1);
  return n;
}

function cle(e: Etat): string {
  return `${e.points.join(',')}|${e.barre}|${e.hors}|${[...e.des].sort().join('')}`;
}

function premiersCoups(e: Etat, c: Camp): Array<{ coup: Coup; etat: Etat }> {
  const res: Array<{ coup: Coup; etat: Etat }> = [];
  for (const d of new Set(e.des)) for (const coup of coupsAvecDe(e, c, d)) res.push({ coup, etat: appliquer(e, c, coup) });
  return res;
}

/** Nombre maximal de dés jouables depuis cette position. */
export function profondeurMax(e: Etat, c: Camp, memo?: Map<string, number>): number {
  const k0 = memo ? cle(e) : '';
  const connu = memo?.get(k0);
  if (connu !== undefined) return connu;
  const r = calculerProfondeur(e, c);
  memo?.set(k0, r);
  return r;
}

function calculerProfondeur(e: Etat, c: Camp): number {
  let niveau = new Map<string, Etat>([[cle(e), e]]);
  let prof = 0;
  for (;;) {
    const suivant = new Map<string, Etat>();
    for (const s of niveau.values()) for (const { etat } of premiersCoups(s, c)) suivant.set(cle(etat), etat);
    if (!suivant.size) return prof;
    prof++;
    niveau = suivant;
  }
}

/** Coups autorisés maintenant (règle : jouer le maximum de dés ; si un seul dé jouable, le plus fort). */
export function coupsAutorises(e: Etat, c: Camp, memo = new Map<string, number>()): Coup[] {
  const tous = premiersCoups(e, c);
  if (!tous.length) return [];
  const D = profondeurMax(e, c, memo);
  let ok = tous.filter(({ etat }) => profondeurMax(etat, c, memo) === D - 1);
  if (D === 1 && new Set(e.des).size === 2) {
    const fort = Math.max(...e.des);
    if (ok.some((x) => x.coup.de_ === fort)) ok = ok.filter((x) => x.coup.de_ === fort);
  }
  return ok.map((x) => x.coup);
}

export const fini = (e: Etat): Camp | null => (e.hors[0] === 15 ? 0 : e.hors[1] === 15 ? 1 : null);

/** Tous les états finaux atteignables avec la séquence de coups (règles complètes). */
export function sequences(e: Etat, c: Camp): Array<{ coups: Coup[]; etat: Etat }> {
  const finaux = new Map<string, { coups: Coup[]; etat: Etat }>();
  const memo = new Map<string, number>();
  const rec = (s: Etat, chemin: Coup[]): void => {
    const autorises = coupsAutorises(s, c, memo);
    if (!autorises.length) { finaux.set(cle(s), { coups: chemin, etat: s }); return; }
    const vus = new Set<string>();
    for (const coup of autorises) {
      const n = appliquer(s, c, coup);
      const k = cle(n);
      if (vus.has(k)) continue;
      vus.add(k);
      rec(n, [...chemin, coup]);
    }
  };
  rec(e, []);
  return [...finaux.values()];
}

export function pips(e: Etat, c: Camp): number {
  let p = e.barre[c] * 25;
  for (let i = 0; i < 24; i++) if (propre(e, c, i) > 0) p += propre(e, c, i) * (c === 0 ? i + 1 : 24 - i);
  return p;
}

/** Évaluation du point de vue de l'ordinateur (camp 1) : plus grand = meilleur pour lui. */
export function evaluer(e: Etat, poidsRisque = 1): number {
  let s = pips(e, 0) - pips(e, 1);
  s += (e.hors[1] - e.hors[0]) * 12 + (e.barre[0] - e.barre[1]) * 14;
  for (let i = 0; i < 24; i++) {
    const n = propre(e, 1, i);
    if (n >= 2) s += 4;
    if (n === 1) {
      // blot : exposé si un pion adverse est « derrière » à portée directe
      let expose = e.barre[0] > 0;
      for (let j = 0; j < 24 && !expose; j++) if (propre(e, 0, j) > 0 && j > i && j - i <= 6) expose = true;
      if (expose) s -= 9 * poidsRisque;
    }
  }
  return s;
}

export function choisirSequence(e: Etat, niveau: Difficulte, rng: Rng = Math.random): Coup[] {
  const seqs = sequences(e, 1);
  if (!seqs.length) return [];
  if (niveau === 'facile') return choisir(seqs, rng).coups;
  const poids = niveau === 'difficile' ? 1.6 : 0.8;
  let meilleur = -Infinity;
  let choix: Coup[][] = [];
  for (const s of seqs) {
    const v = evaluer(s.etat, poids) + (niveau === 'moyen' ? entier(6, rng) : 0);
    if (v > meilleur) { meilleur = v; choix = [s.coups]; } else if (v === meilleur) choix.push(s.coups);
  }
  return choisir(choix, rng);
}

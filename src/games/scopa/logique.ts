import { choisir, melanger, type Rng } from '../../shared/alea';
import { COULEURS, type Carte } from '../../shared/cartes';

/** Scopa : paquet de 40 cartes (valeurs 1-7, valet = 8, dame = 9, roi = 10). Les carreaux jouent le rôle des « denari ». */
export type Joueur = 0 | 1;

export interface Etat {
  table: Carte[];
  mains: [Carte[], Carte[]];
  pioche: Carte[];
  prises: [Carte[], Carte[]];
  scope: [number, number];
  dernier: Joueur | null; // dernier à avoir capturé
  tour: Joueur;
  fini: boolean; // manche terminée
}

export const valeur = (c: Carte): number => (c.rang <= 7 ? c.rang : c.rang - 3);
export const estSettebello = (c: Carte): boolean => c.rang === 7 && c.couleur === 'carreau';

export function paquet40(): Carte[] {
  const rangs = [1, 2, 3, 4, 5, 6, 7, 11, 12, 13];
  return COULEURS.flatMap((couleur) => rangs.map((rang) => ({ rang, couleur })));
}

export function nouvelleManche(premier: Joueur = 0, rng: Rng = Math.random): Etat {
  const p = melanger(paquet40(), rng);
  const e: Etat = { table: p.splice(0, 4), mains: [[], []], pioche: p, prises: [[], []], scope: [0, 0], dernier: null, tour: premier, fini: false };
  distribuer(e);
  return e;
}

export function distribuer(e: Etat): boolean {
  if (e.mains[0].length || e.mains[1].length || e.pioche.length < 6) return false;
  e.mains = [e.pioche.splice(0, 3), e.pioche.splice(0, 3)];
  return true;
}

/** Choix de prise possibles pour la carte jouée. Liste vide : la carte est simplement posée. */
export function captures(table: readonly Carte[], carte: Carte): Carte[][] {
  const identiques = table.filter((c) => c.rang === carte.rang);
  if (identiques.length) return identiques.map((c) => [c]);
  const res: Carte[][] = [];
  const v = valeur(carte);
  const rec = (i: number, reste: number, choix: Carte[]): void => {
    if (reste === 0) { res.push([...choix]); return; }
    for (let k = i; k < table.length; k++) {
      const w = valeur(table[k]!);
      if (w <= reste) { choix.push(table[k]!); rec(k + 1, reste - w, choix); choix.pop(); }
    }
  };
  rec(0, v, []);
  return res;
}

/** Joue la carte d'indice `i` de la main de j ; `prise` doit faire partie des options si elles existent. */
export function jouer(e: Etat, j: Joueur, i: number, prise?: Carte[]): { scopa: boolean; capture: Carte[] } | null {
  if (e.tour !== j || e.fini) return null;
  const carte = e.mains[j][i];
  if (!carte) return null;
  const options = captures(e.table, carte);
  let capture: Carte[] = [];
  if (options.length) {
    capture = prise && options.some((o) => o.length === prise.length && o.every((c) => prise.includes(c))) ? prise : options[0]!;
  }
  e.mains[j].splice(i, 1);
  let scopa = false;
  if (capture.length) {
    e.table = e.table.filter((c) => !capture.includes(c));
    e.prises[j].push(carte, ...capture);
    e.dernier = j;
    const derniereCarte = !e.mains[0].length && !e.mains[1].length && !e.pioche.length;
    if (!e.table.length && !derniereCarte) { e.scope[j]++; scopa = true; }
  } else e.table.push(carte);
  e.tour = j === 0 ? 1 : 0;
  if (!e.mains[0].length && !e.mains[1].length) {
    if (!distribuer(e)) {
      // fin de manche : les cartes restantes vont au dernier preneur
      if (e.dernier !== null) e.prises[e.dernier].push(...e.table);
      e.table = [];
      e.fini = true;
    }
  }
  return { scopa, capture };
}

const PRIMIERA = [0, 16, 12, 13, 14, 15, 18, 21, 10, 10, 10, 10, 10, 10];

function primiera(cartes: readonly Carte[]): number {
  let total = 0;
  for (const couleur of COULEURS) {
    const dans = cartes.filter((c) => c.couleur === couleur);
    if (!dans.length) return 0;
    total += Math.max(...dans.map((c) => (c.rang <= 7 ? PRIMIERA[c.rang]! : 10)));
  }
  return total;
}

export interface Detail { cartes: number; carreaux: number; settebello: boolean; primiera: number; scope: number; points: number }

/** Points d'une manche. Les égalités ne rapportent rien. */
export function pointsManche(e: Etat): [Detail, Detail] {
  const d = ([0, 1] as const).map((j) => ({
    cartes: e.prises[j].length,
    carreaux: e.prises[j].filter((c) => c.couleur === 'carreau').length,
    settebello: e.prises[j].some(estSettebello),
    primiera: primiera(e.prises[j]),
    scope: e.scope[j],
    points: 0,
  })) as [Detail, Detail];
  const gagnant = (a: number, b: number): Joueur | null => (a > b ? 0 : b > a ? 1 : null);
  for (const g of [gagnant(d[0].cartes, d[1].cartes), gagnant(d[0].carreaux, d[1].carreaux), gagnant(d[0].primiera, d[1].primiera), d[0].settebello ? 0 : d[1].settebello ? 1 : null]) {
    if (g !== null) d[g].points++;
  }
  d[0].points += d[0].scope;
  d[1].points += d[1].scope;
  return d;
}

function valeurPrise(e: Etat, carte: Carte, capture: Carte[]): number {
  const toutes = [carte, ...capture];
  let v = toutes.length * 6;
  for (const c of toutes) {
    if (estSettebello(c)) v += 60;
    if (c.couleur === 'carreau') v += 9;
    if (c.rang === 7) v += 12; else if (c.rang === 6 || c.rang === 1) v += 6;
  }
  if (capture.length === e.table.length && (e.mains[0].length + e.mains[1].length > 1 || e.pioche.length)) v += 120; // scopa
  return v;
}

/** Choix de l'ordinateur : renvoie l'indice de carte et la prise. */
export function choixOrdi(e: Etat, j: Joueur, rng: Rng = Math.random, niveau: 'facile' | 'moyen' | 'difficile' = 'moyen'): { i: number; prise: Carte[] } {
  const main = e.mains[j];
  let meilleur = -Infinity;
  let choix: Array<{ i: number; prise: Carte[] }> = [];
  main.forEach((carte, i) => {
    const options = captures(e.table, carte);
    const candidats = options.length ? options : [[]];
    for (const prise of candidats) {
      let v: number;
      if (niveau === 'facile') v = rng() * 10 + (prise.length ? 30 : 0);
      else if (prise.length) v = valeurPrise(e, carte, prise);
      else {
        // pose : éviter de laisser une table facile à vider, ne pas donner de bonnes cartes
        const somme = e.table.reduce((s, c) => s + valeur(c), 0) + valeur(carte);
        v = -valeur(carte) * 2 - (estSettebello(carte) ? 100 : 0) - (carte.couleur === 'carreau' ? 12 : 0) - (somme <= 10 && niveau === 'difficile' ? 60 : 0);
        if (niveau === 'difficile' && e.table.some((t) => t.rang === carte.rang)) v += 0;
      }
      v += rng() * (niveau === 'difficile' ? 0.1 : 1.5);
      if (v > meilleur + 1e-9) { meilleur = v; choix = [{ i, prise }]; } else if (Math.abs(v - meilleur) <= 1e-9) choix.push({ i, prise });
    }
  });
  return choisir(choix, rng);
}

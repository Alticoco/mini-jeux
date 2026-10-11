import { COULEURS, estRouge, paquetMelange, type Carte } from '../../shared/cartes';
import type { Rng } from '../../shared/alea';

export interface CarteK extends Carte {
  visible: boolean;
}

export interface EtatKlondike {
  colonnes: CarteK[][]; // 7 colonnes, dernier élément = carte du dessus
  fondations: Carte[][]; // 4 piles, une par couleur (ordre COULEURS)
  pioche: Carte[]; // dessus = dernier élément
  defausse: Carte[]; // dessus = dernier élément
  tirage: 1 | 3;
  score: number;
  coups: number;
}

export type Source =
  | { type: 'defausse' }
  | { type: 'colonne'; col: number; index: number }
  | { type: 'fondation'; f: number };
export type Destination = { type: 'colonne'; col: number } | { type: 'fondation' };

export function nouvelle(tirage: 1 | 3, rng: Rng = Math.random): EtatKlondike {
  const p = paquetMelange(rng);
  const colonnes: CarteK[][] = [];
  let k = 0;
  for (let c = 0; c < 7; c++) {
    colonnes.push(p.slice(k, k + c + 1).map((carte, i) => ({ ...carte, visible: i === c })));
    k += c + 1;
  }
  return { colonnes, fondations: [[], [], [], []], pioche: p.slice(k), defausse: [], tirage, score: 0, coups: 0 };
}

export function cloner(e: EtatKlondike): EtatKlondike {
  return structuredClone(e);
}

export function indexFondation(c: Carte): number {
  return COULEURS.indexOf(c.couleur);
}

export function cartesSource(e: EtatKlondike, s: Source): CarteK[] | null {
  if (s.type === 'defausse') {
    const c = e.defausse[e.defausse.length - 1];
    return c ? [{ ...c, visible: true }] : null;
  }
  if (s.type === 'fondation') {
    const c = e.fondations[s.f]?.at(-1);
    return c ? [{ ...c, visible: true }] : null;
  }
  const col = e.colonnes[s.col];
  const reste = col?.slice(s.index);
  if (!reste?.length || !reste[0]!.visible) return null;
  return reste;
}

function peutSurColonne(cartes: CarteK[], col: CarteK[]): boolean {
  const base = cartes[0]!;
  const dessus = col[col.length - 1];
  if (!dessus) return base.rang === 13;
  return dessus.visible && estRouge(dessus.couleur) !== estRouge(base.couleur) && dessus.rang === base.rang + 1;
}

export function peutDeplacer(e: EtatKlondike, s: Source, d: Destination): boolean {
  const cartes = cartesSource(e, s);
  if (!cartes) return false;
  if (d.type === 'fondation') {
    if (cartes.length !== 1) return false;
    const c = cartes[0]!;
    return e.fondations[indexFondation(c)]!.length + 1 === c.rang;
  }
  if (s.type === 'colonne' && s.col === d.col) return false;
  return peutSurColonne(cartes, e.colonnes[d.col]!);
}

/** Exécute le déplacement s'il est légal. Renvoie false sinon. */
export function deplacer(e: EtatKlondike, s: Source, d: Destination): boolean {
  if (!peutDeplacer(e, s, d)) return false;
  const cartes = cartesSource(e, s)!;
  // retrait de la source
  if (s.type === 'defausse') e.defausse.pop();
  else if (s.type === 'fondation') e.fondations[s.f]!.pop();
  else {
    e.colonnes[s.col]!.splice(s.index);
    const col = e.colonnes[s.col]!;
    const dessus = col[col.length - 1];
    if (dessus && !dessus.visible) {
      dessus.visible = true;
      e.score += 5;
    }
  }
  // dépôt
  if (d.type === 'fondation') {
    const { visible: _v, ...c } = cartes[0]!;
    e.fondations[indexFondation(c)]!.push(c);
    e.score += s.type === 'fondation' ? 0 : 10;
  } else {
    e.colonnes[d.col]!.push(...cartes.map((c) => ({ ...c, visible: true })));
    if (s.type === 'defausse') e.score += 5;
    else if (s.type === 'fondation') e.score = Math.max(0, e.score - 15);
  }
  e.coups++;
  return true;
}

/** Tire de la pioche, ou la reforme depuis la défausse. Renvoie false s'il n'y a plus rien à tirer. */
export function tirer(e: EtatKlondike): boolean {
  if (e.pioche.length) {
    for (let i = 0; i < e.tirage && e.pioche.length; i++) e.defausse.push(e.pioche.pop()!);
  } else if (e.defausse.length) {
    e.pioche = e.defausse.reverse();
    e.defausse = [];
  } else return false;
  e.coups++;
  return true;
}

/** Meilleure destination automatique (double-clic) : fondation d'abord, sinon première colonne possible. */
export function destinationAuto(e: EtatKlondike, s: Source): Destination | null {
  if (peutDeplacer(e, s, { type: 'fondation' })) return { type: 'fondation' };
  if (s.type === 'fondation') return null;
  for (let col = 0; col < 7; col++) {
    const d: Destination = { type: 'colonne', col };
    // éviter de déplacer un roi d'une colonne vide vers une autre colonne vide, ou une pile entière sans bénéfice
    if (s.type === 'colonne' && s.index === 0 && e.colonnes[col]!.length === 0) continue;
    if (peutDeplacer(e, s, d)) return d;
  }
  return null;
}

export function gagne(e: EtatKlondike): boolean {
  return e.fondations.every((f) => f.length === 13);
}

/** Toutes les cartes sont visibles et la pioche est vide : la fin de partie est automatique. */
export function terminable(e: EtatKlondike): boolean {
  return !gagne(e) && e.pioche.length === 0 && e.defausse.length === 0 && e.colonnes.every((c) => c.every((k) => k.visible));
}

/** Un seul pas de fin automatique : envoie une carte à une fondation. */
export function pasAuto(e: EtatKlondike): boolean {
  for (let col = 0; col < 7; col++) {
    const c = e.colonnes[col]!;
    if (c.length && deplacer(e, { type: 'colonne', col, index: c.length - 1 }, { type: 'fondation' })) return true;
  }
  return false;
}

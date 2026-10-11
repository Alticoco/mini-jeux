import { el } from './dom';
import { melanger, type Rng } from './alea';

export type Couleur = 'pique' | 'coeur' | 'carreau' | 'trefle';
export interface Carte {
  rang: number; // 1 (as) à 13 (roi)
  couleur: Couleur;
}

export const COULEURS: Couleur[] = ['pique', 'coeur', 'carreau', 'trefle'];
export const SYMBOLE: Record<Couleur, string> = { pique: '♠', coeur: '♥', carreau: '♦', trefle: '♣' };

export function estRouge(c: Couleur): boolean {
  return c === 'coeur' || c === 'carreau';
}

export function nomRang(r: number): string {
  return r === 1 ? 'A' : r === 11 ? 'V' : r === 12 ? 'D' : r === 13 ? 'R' : String(r);
}

export function nomCarte(c: Carte): string {
  const rangs: Record<number, string> = { 1: 'As', 11: 'Valet', 12: 'Dame', 13: 'Roi' };
  const noms: Record<Couleur, string> = { pique: 'pique', coeur: 'cœur', carreau: 'carreau', trefle: 'trèfle' };
  return `${rangs[c.rang] ?? c.rang} de ${noms[c.couleur]}`;
}

export function paquet52(): Carte[] {
  return COULEURS.flatMap((couleur) => Array.from({ length: 13 }, (_, i) => ({ rang: i + 1, couleur })));
}

export function paquetMelange(rng: Rng = Math.random): Carte[] {
  return melanger(paquet52(), rng);
}

export function identique(a: Carte, b: Carte): boolean {
  return a.rang === b.rang && a.couleur === b.couleur;
}

/** Élément DOM d'une carte (face visible ou dos). Dimensionnée par la variable CSS --zoom-cartes. */
export function elCarte(c: Carte | null, attrs: Record<string, string | number | boolean | EventListener | undefined> = {}): HTMLElement {
  if (!c) return el('div', { class: 'carte dos', 'aria-label': 'Carte face cachée', ...attrs });
  const coin = `${nomRang(c.rang)}${SYMBOLE[c.couleur]}`;
  const { class: extra, ...reste } = attrs;
  return el(
    'div',
    { class: `carte${estRouge(c.couleur) ? ' rouge' : ''}${extra ? ` ${extra}` : ''}`, 'aria-label': nomCarte(c), ...reste },
    el('span', { class: 'haut' }, coin),
    el('span', { class: 'centre' }, SYMBOLE[c.couleur]),
    el('span', { class: 'bas' }, coin),
  );
}

import { melanger, type Rng } from '../../shared/alea';
import { estRouge, paquetMelange, type Carte } from '../../shared/cartes';

export type Variante = 'mistigri' | 'pouilleux';

/**
 * Clé d'appariement : Pouilleux = même valeur ; Mistigri = même valeur ET même couleur (rouge/noir).
 * Le dernier Valet noir (Mistigri) n'a pas de partenaire.
 */
export function cle(c: Carte, v: Variante): string {
  return v === 'pouilleux' ? String(c.rang) : `${c.rang}${estRouge(c.couleur) ? 'R' : 'N'}`;
}

export function paquet(v: Variante, rng: Rng = Math.random): Carte[] {
  const p = paquetMelange(rng);
  if (v === 'pouilleux') return melanger([...p, { rang: 0, couleur: 'pique' as const }], rng);
  // Mistigri : on retire le Valet de trèfle ; le Valet de pique reste seul
  return p.filter((c) => !(c.rang === 11 && c.couleur === 'trefle'));
}

/** Retire toutes les paires de la main ; renvoie la main restante et le nombre de paires retirées. */
export function retirerPaires(main: readonly Carte[], v: Variante): { main: Carte[]; paires: number } {
  const groupes = new Map<string, Carte[]>();
  for (const c of main) {
    const k = cle(c, v);
    groupes.set(k, [...(groupes.get(k) ?? []), c]);
  }
  const reste: Carte[] = [];
  let paires = 0;
  for (const g of groupes.values()) {
    paires += Math.floor(g.length / 2);
    if (g.length % 2) reste.push(g[g.length - 1]!);
  }
  // conserve l'ordre d'origine
  return { main: main.filter((c) => reste.includes(c)), paires };
}

export function distribuer(v: Variante, rng: Rng = Math.random): { mains: [Carte[], Carte[]]; paires: number } {
  const p = paquet(v, rng);
  const a: Carte[] = [];
  const b: Carte[] = [];
  p.forEach((c, i) => (i % 2 === 0 ? a : b).push(c));
  const ra = retirerPaires(a, v);
  const rb = retirerPaires(b, v);
  return { mains: [ra.main, rb.main], paires: ra.paires + rb.paires };
}

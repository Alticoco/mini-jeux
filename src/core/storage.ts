import type { Donnees, Options } from './types';

const CLE = 'mini-jeux:donnees';

export const optionsParDefaut: Options = { theme: 'auto', son: true, tailleCartes: 100, difficulte: 'moyen' };

function vide(): Donnees {
  return { version: 1, options: { ...optionsParDefaut }, stats: {}, sauvegardes: {}, favoris: [], recents: [] };
}

/** Normalise des données lues (disque ou fichier importé). Renvoie null si inutilisable. */
export function normaliser(brut: unknown): Donnees | null {
  if (!brut || typeof brut !== 'object') return null;
  const b = brut as Partial<Donnees>;
  if (b.version !== 1) return null;
  const d = vide();
  d.options = { ...optionsParDefaut, ...(b.options ?? {}) };
  d.stats = b.stats && typeof b.stats === 'object' ? b.stats : {};
  d.sauvegardes = b.sauvegardes && typeof b.sauvegardes === 'object' ? b.sauvegardes : {};
  d.favoris = Array.isArray(b.favoris) ? b.favoris.filter((x) => typeof x === 'string') : [];
  d.recents = Array.isArray(b.recents) ? b.recents.filter((x) => typeof x === 'string') : [];
  return d;
}

let cache: Donnees | null = null;

export function donnees(): Donnees {
  if (cache) return cache;
  try {
    const txt = localStorage.getItem(CLE);
    cache = (txt && normaliser(JSON.parse(txt))) || vide();
  } catch {
    cache = vide();
  }
  return cache;
}

export function enregistrer(): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(donnees()));
  } catch {
    /* stockage plein ou indisponible : on continue sans sauvegarder */
  }
}

export function remplacerDonnees(d: Donnees): void {
  cache = d;
  enregistrer();
}

export function exporterTexte(): string {
  return JSON.stringify(donnees(), null, 2);
}

export function importerTexte(texte: string): boolean {
  try {
    const d = normaliser(JSON.parse(texte));
    if (!d) return false;
    remplacerDonnees(d);
    return true;
  } catch {
    return false;
  }
}

export function reinitialiserStats(): void {
  donnees().stats = {};
  enregistrer();
}

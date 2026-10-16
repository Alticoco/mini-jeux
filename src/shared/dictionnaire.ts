import liste from '../../assets/mots-fr.json';

/** Mots de validation en minuscules sans accent (généré par scripts/construire-dictionnaire.mjs). */
export const MOTS: readonly string[] = liste as string[];
const ENSEMBLE = new Set(MOTS);

export function estMot(m: string): boolean {
  return ENSEMBLE.has(m.toLowerCase());
}

let prefixes: Set<string> | null = null;
/** Tous les préfixes de mots du dictionnaire (pour les recherches en profondeur). */
export function prefixesMots(): Set<string> {
  if (!prefixes) {
    prefixes = new Set();
    for (const m of MOTS) for (let i = 1; i <= m.length; i++) prefixes.add(m.slice(0, i));
  }
  return prefixes;
}

/** Le mot peut-il être construit avec les lettres données (chaque lettre utilisée au plus autant de fois qu'elle apparaît) ? */
export function peutConstruire(mot: string, lettres: string): boolean {
  const dispo = new Map<string, number>();
  for (const l of lettres.toLowerCase()) dispo.set(l, (dispo.get(l) ?? 0) + 1);
  for (const l of mot.toLowerCase()) {
    const n = dispo.get(l) ?? 0;
    if (!n) return false;
    dispo.set(l, n - 1);
  }
  return true;
}

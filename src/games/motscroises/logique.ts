export interface MotGrille { n: number; dir: 'H' | 'V'; x: number; y: number; mot: string; def: string }
export interface Grille { n: number; grille: string[]; mots: MotGrille[] }
export interface Banque { facile: Grille[]; moyen: Grille[]; difficile: Grille[] }

export const lettre = (g: Grille, x: number, y: number): string => g.grille[y]?.[x] ?? '.';
export const estVide = (g: Grille, x: number, y: number): boolean => lettre(g, x, y) === '.';

export function casesDuMot(m: MotGrille): Array<[number, number]> {
  return Array.from({ length: m.mot.length }, (_, k) => (m.dir === 'H' ? [m.x + k, m.y] : [m.x, m.y + k]) as [number, number]);
}

/** Mot de direction donnée qui passe par la case (x, y). */
export function motEn(g: Grille, x: number, y: number, dir: 'H' | 'V'): MotGrille | undefined {
  return g.mots.find((m) => m.dir === dir && casesDuMot(m).some(([cx, cy]) => cx === x && cy === y));
}

/** Cases (index) remplies mais fausses. */
export function fausses(g: Grille, saisie: readonly string[]): Set<number> {
  const res = new Set<number>();
  for (let y = 0; y < g.n; y++)
    for (let x = 0; x < g.n; x++) {
      const v = saisie[y * g.n + x];
      if (v && !estVide(g, x, y) && v !== lettre(g, x, y)) res.add(y * g.n + x);
    }
  return res;
}

export function complet(g: Grille, saisie: readonly string[]): boolean {
  for (let y = 0; y < g.n; y++) for (let x = 0; x < g.n; x++) if (!estVide(g, x, y) && saisie[y * g.n + x] !== lettre(g, x, y)) return false;
  return true;
}

/** Contrôle de cohérence d'une grille (utilisé par les tests et le script de génération). */
export function grilleCoherente(g: Grille): boolean {
  const lus = new Set<string>();
  for (const dir of ['H', 'V'] as const) {
    for (let a = 0; a < g.n; a++) {
      let mot = '';
      let debut = 0;
      for (let b = 0; b <= g.n; b++) {
        const c = b < g.n ? (dir === 'H' ? lettre(g, b, a) : lettre(g, a, b)) : '.';
        if (c !== '.') { if (!mot) debut = b; mot += c; }
        else { if (mot.length >= 2) lus.add(`${dir}${dir === 'H' ? debut : a},${dir === 'H' ? a : debut}:${mot}`); mot = ''; }
      }
    }
  }
  const places = new Set(g.mots.map((m) => `${m.dir}${m.x},${m.y}:${m.mot}`));
  return lus.size === places.size && [...lus].every((l) => places.has(l)) && g.mots.every((m) => m.def.length > 0);
}

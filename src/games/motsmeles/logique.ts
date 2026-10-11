import { choisir, entier, melanger, type Rng } from '../../shared/alea';
import { normaliser } from '../pendu/logique';

export interface MotPlace {
  mot: string; // majuscules sans accent
  cases: number[];
  trouve: boolean;
}

export interface Config {
  n: number;
  nbMots: number;
  directions: Array<[number, number]>;
}

const DROITE: Array<[number, number]> = [[0, 1], [1, 0]];
const QUATRE: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [0, -1]];
const HUIT: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];

export const CONFIGS = {
  facile: { n: 10, nbMots: 8, directions: DROITE },
  moyen: { n: 12, nbMots: 10, directions: QUATRE },
  difficile: { n: 14, nbMots: 14, directions: HUIT },
} satisfies Record<string, Config>;

export function genererGrille(dico: readonly string[], cfg: Config, rng: Rng = Math.random): { grille: string[]; mots: MotPlace[] } {
  const { n } = cfg;
  const grille: string[] = Array(n * n).fill('');
  const mots: MotPlace[] = [];
  const candidats = melanger(dico.map((m) => normaliser(m).toUpperCase()).filter((m) => m.length >= 4 && m.length <= n), rng);
  for (const mot of candidats) {
    if (mots.length >= cfg.nbMots) break;
    if (mots.some((m) => m.mot === mot)) continue;
    for (let essai = 0; essai < 150; essai++) {
      const [dl, dc] = choisir(cfg.directions, rng);
      const l0 = entier(n, rng);
      const c0 = entier(n, rng);
      const lf = l0 + dl * (mot.length - 1);
      const cf = c0 + dc * (mot.length - 1);
      if (lf < 0 || lf >= n || cf < 0 || cf >= n) continue;
      const cases = Array.from({ length: mot.length }, (_, k) => (l0 + dl * k) * n + c0 + dc * k);
      if (cases.some((c, k) => grille[c] !== '' && grille[c] !== mot[k])) continue;
      cases.forEach((c, k) => { grille[c] = mot[k]!; });
      mots.push({ mot, cases, trouve: false });
      break;
    }
  }
  const lettres = 'AAAEEEIIOOUURRSSTTNNLLCDMPBGFHVJQXYZK';
  for (let i = 0; i < grille.length; i++) if (grille[i] === '') grille[i] = lettres[entier(lettres.length, rng)]!;
  return { grille, mots };
}

/** Cases alignées entre deux cases (incluses), ou null si elles ne sont pas alignées. */
export function segment(n: number, a: number, b: number): number[] | null {
  const la = Math.floor(a / n), ca = a % n, lb = Math.floor(b / n), cb = b % n;
  const dl = lb - la, dc = cb - ca;
  if (dl !== 0 && dc !== 0 && Math.abs(dl) !== Math.abs(dc)) return null;
  const pas = Math.max(Math.abs(dl), Math.abs(dc));
  return Array.from({ length: pas + 1 }, (_, k) => (la + Math.sign(dl) * k) * n + ca + Math.sign(dc) * k);
}

/** Cherche le mot (non trouvé) correspondant à un segment, dans les deux sens. */
export function trouverMot(mots: MotPlace[], seg: number[]): MotPlace | undefined {
  const a = seg.join(',');
  const b = [...seg].reverse().join(',');
  return mots.find((m) => !m.trouve && (m.cases.join(',') === a || m.cases.join(',') === b));
}

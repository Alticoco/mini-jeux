import { entier, melanger, type Rng } from '../../shared/alea';

/** États d'une case : 0 = indéterminée, 1 = noircie, 2 = marquée blanche (cerclée). */
export interface Puzzle { n: number; nombres: number[] }

function voisins(n: number, i: number): number[] {
  const l = Math.floor(i / n);
  const c = i % n;
  return [l > 0 ? i - n : -1, l < n - 1 ? i + n : -1, c > 0 ? i - 1 : -1, c < n - 1 ? i + 1 : -1].filter((k) => k >= 0);
}

/** Les cases non noires forment-elles une seule zone connexe ? */
export function blanchesConnexes(n: number, noires: ReadonlySet<number>): boolean {
  const blanches = Array.from({ length: n * n }, (_, i) => i).filter((i) => !noires.has(i));
  if (!blanches.length) return false;
  const vu = new Set([blanches[0]!]);
  const pile = [blanches[0]!];
  while (pile.length) {
    for (const v of voisins(n, pile.pop()!)) if (!noires.has(v) && !vu.has(v)) { vu.add(v); pile.push(v); }
  }
  return vu.size === blanches.length;
}

/** Génère un puzzle soluble : un carré latin dont on noircit des cases (sans contact ni coupure) qui reçoivent un doublon. */
export function generer(n: number, densite: number, rng: Rng = Math.random): { puzzle: Puzzle; solution: Set<number> } {
  for (;;) {
    // carré latin par décalage + permutations
    const perm = melanger(Array.from({ length: n }, (_, k) => k + 1), rng);
    const lignes = melanger(Array.from({ length: n }, (_, k) => k), rng);
    const cols = melanger(Array.from({ length: n }, (_, k) => k), rng);
    const nombres = Array<number>(n * n).fill(0);
    for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) nombres[l * n + c] = perm[(lignes[l]! + cols[c]!) % n]!;
    const noires = new Set<number>();
    for (const i of melanger(Array.from({ length: n * n }, (_, k) => k), rng)) {
      if (noires.size >= Math.round(n * n * densite)) break;
      if (voisins(n, i).some((v) => noires.has(v))) continue;
      noires.add(i);
      if (!blanchesConnexes(n, noires)) noires.delete(i);
    }
    // chaque case noire reprend la valeur d'une autre case blanche de sa ligne ou colonne
    let ok = true;
    for (const i of noires) {
      const l = Math.floor(i / n);
      const c = i % n;
      const candidats = [
        ...Array.from({ length: n }, (_, k) => l * n + k),
        ...Array.from({ length: n }, (_, k) => k * n + c),
      ].filter((k) => k !== i && !noires.has(k));
      if (!candidats.length) { ok = false; break; }
      nombres[i] = nombres[candidats[entier(candidats.length, rng)]!]!;
    }
    if (ok && noires.size >= 2) return { puzzle: { n, nombres }, solution: noires };
  }
}

export interface Verification {
  doublons: Set<number>; // cases blanches en doublon
  contacts: Set<number>; // cases noires adjacentes
  connexe: boolean;
}

export function verifier(p: Puzzle, etat: readonly number[]): Verification {
  const { n } = p;
  const noires = new Set(etat.flatMap((v, i) => (v === 1 ? [i] : [])));
  const doublons = new Set<number>();
  for (let l = 0; l < n; l++) {
    for (let c = 0; c < n; c++) {
      const i = l * n + c;
      if (noires.has(i)) continue;
      for (let k = c + 1; k < n; k++) if (!noires.has(l * n + k) && p.nombres[l * n + k] === p.nombres[i]) { doublons.add(i); doublons.add(l * n + k); }
      for (let k = l + 1; k < n; k++) if (!noires.has(k * n + c) && p.nombres[k * n + c] === p.nombres[i]) { doublons.add(i); doublons.add(k * n + c); }
    }
  }
  const contacts = new Set<number>();
  for (const i of noires) for (const v of voisins(n, i)) if (noires.has(v)) { contacts.add(i); contacts.add(v); }
  return { doublons, contacts, connexe: blanchesConnexes(n, noires) };
}

export function resolu(p: Puzzle, etat: readonly number[]): boolean {
  const v = verifier(p, etat);
  return v.doublons.size === 0 && v.contacts.size === 0 && v.connexe;
}

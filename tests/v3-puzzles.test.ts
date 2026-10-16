import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import * as fu from '../src/games/futoshiki/logique';
import * as hi from '../src/games/hitori/logique';
import * as nu from '../src/games/nurikabe/logique';
import * as ka from '../src/games/kakuro/logique';

describe('futoshiki', () => {
  it('puzzles à solution unique et solution valide', () => {
    for (const [n, d, i] of [[4, 0.6, 2], [5, 0.5, 1], [6, 0.4, 0]] as const) {
      const { puzzle, solution } = fu.generer(n, d, i, graine(n * 7));
      expect(fu.compter(puzzle, [...puzzle.donnees])).toBe(1);
      expect(fu.resolu(puzzle, solution)).toBe(true);
      puzzle.donnees.forEach((v, k) => v && expect(v).toBe(solution[k]));
    }
  });
  it('détecte doublons et inégalités', () => {
    const p: fu.Puzzle = { n: 4, donnees: Array(16).fill(0), h: Array(12).fill(0), v: Array(12).fill(0) };
    p.h[fu.ih(4, 0, 0)] = 1; // case (0,0) < case (0,1)
    const g = Array<number>(16).fill(0);
    g[0] = 3; g[1] = 2;
    expect([...fu.conflits(p, g)].sort()).toEqual([0, 1]);
    g[1] = 4;
    expect(fu.conflits(p, g).size).toBe(0);
    g[2] = 4;
    expect(fu.conflits(p, g).size).toBe(2);
  });
});

describe('hitori', () => {
  it('la solution générée respecte les règles', () => {
    for (const n of [5, 7, 9]) {
      const { puzzle, solution } = hi.generer(n, 0.3, graine(n));
      const etat = puzzle.nombres.map((_, i) => (solution.has(i) ? 1 : 0));
      expect(hi.resolu(puzzle, etat)).toBe(true);
      // grille tout blanche = non résolue (doublons)
      expect(hi.resolu(puzzle, Array(n * n).fill(0))).toBe(false);
    }
  });
  it('contacts de cases noires et coupure détectés', () => {
    const p: hi.Puzzle = { n: 3, nombres: [1, 2, 3, 2, 3, 1, 3, 1, 2] };
    expect(hi.verifier(p, [1, 1, 0, 0, 0, 0, 0, 0, 0]).contacts.size).toBe(2);
    expect(hi.verifier(p, [0, 1, 0, 1, 0, 0, 0, 0, 0]).connexe).toBe(false);
  });
});

describe('nurikabe', () => {
  it('la solution générée est valide', () => {
    for (const n of [5, 7, 9]) {
      const { puzzle, solution } = nu.generer(n, graine(n + 3));
      const etat = solution.map((m) => (m ? 1 : 0));
      expect(nu.verifier(puzzle, etat).ok).toBe(true);
      expect(nu.verifier(puzzle, Array(n * n).fill(0)).ok).toBe(false);
      expect(puzzle.nombres.filter(Boolean).length).toBeGreaterThanOrEqual(3);
    }
  });
  it('génération robuste (aléatoire réel)', () => {
    for (const n of [5, 7, 9]) for (let k = 0; k < 40; k++) {
      const { puzzle, solution } = nu.generer(n);
      expect(nu.verifier(puzzle, solution.map((m) => (m ? 1 : 0))).ok).toBe(true);
    }
  });
  it('piscine et mer non connexe', () => {
    const mer = [true, true, false, true, true, false, false, false, false];
    expect(nu.mer2x2(3, mer)).toEqual([0]);
    expect(nu.merConnexe(3, [true, false, true, false, false, false, false, false, false])).toBe(false);
  });
});

describe('kakuro', () => {
  it('puzzles cohérents avec leur solution', () => {
    for (const [n, d, g] of [[6, 0.2, 0.3], [8, 0.22, 0.2], [10, 0.24, 0.12]] as const) {
      const { puzzle, solution } = ka.generer(n, d, g, graine(n));
      expect(ka.resolu(puzzle, solution)).toBe(true);
      expect(ka.conflits(puzzle, solution).size).toBe(0);
      for (const s of puzzle.series) {
        expect(s.cases.length).toBeGreaterThanOrEqual(2);
        expect(new Set(s.cases.map((c) => solution[c])).size).toBe(s.cases.length);
        const ind = s.horizontale ? puzzle.indiceDroite[s.cases[0]! - 1] : puzzle.indiceBas[s.cases[0]! - n];
        expect(ind).toBe(s.somme);
      }
      puzzle.donnees.forEach((v, i) => v && expect(v).toBe(solution[i]));
    }
  });
  it('détecte un doublon', () => {
    const { puzzle, solution } = ka.generer(6, 0.2, 0, graine(2));
    const g = Array<number>(36).fill(0);
    const s = puzzle.series[0]!;
    g[s.cases[0]!] = 5;
    g[s.cases[1]!] = 5;
    expect(ka.conflits(puzzle, g).size).toBeGreaterThanOrEqual(2);
    expect(ka.resolu(puzzle, g)).toBe(false);
    expect(solution.length).toBe(36);
  });
});

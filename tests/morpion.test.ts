import { describe, expect, it } from 'vitest';
import { coupOrdi, gagnant, meilleursCoups, plein, type Case } from '../src/games/morpion/logique';

const v = (s: string): Case[] => [...s].map((c) => (c === '.' ? null : (c as 'X' | 'O')));

describe('morpion', () => {
  it('détecte un gagnant et une grille pleine', () => {
    expect(gagnant(v('XXX......'))?.marque).toBe('X');
    expect(gagnant(v('O..O..O..'))?.marque).toBe('O');
    expect(gagnant(v('X...X...X'))?.ligne).toEqual([0, 4, 8]);
    expect(gagnant(v('XOXXOOOXX'))).toBeNull();
    expect(plein(v('XOXXOOOXX'))).toBe(true);
  });

  it('gagne quand il peut', () => {
    expect(coupOrdi(v('OO.XX....'), 'O', 'difficile')).toBe(2);
  });

  it('bloque une menace', () => {
    expect(meilleursCoups(v('XX.O.....'), 'O')).toEqual([2]);
  });

  it("l'ordi parfait ne perd jamais contre des coups aléatoires", () => {
    for (let n = 0; n < 200; n++) {
      const p = Array<Case>(9).fill(null);
      let tour: 'X' | 'O' = 'X';
      while (!gagnant(p) && !plein(p)) {
        const libres = p.flatMap((c, i) => (c ? [] : [i]));
        p[tour === 'O' ? coupOrdi(p, 'O', 'difficile') : libres[Math.floor(Math.random() * libres.length)]!] = tour;
        tour = tour === 'X' ? 'O' : 'X';
      }
      expect(gagnant(p)?.marque).not.toBe('X');
    }
  });
});

import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import type { Carte } from '../src/shared/cartes';
import * as fc from '../src/games/freecell/logique';
import * as sp from '../src/games/spider/logique';
import * as py from '../src/games/pyramide/logique';
import * as mj from '../src/games/mahjong/logique';

const c = (rang: number, couleur: Carte['couleur']): Carte => ({ rang, couleur });

describe('freecell', () => {
  it('distribution : 52 cartes, colonnes 7/7/7/7/6/6/6/6', () => {
    const e = fc.nouvelle(graine(1));
    expect(e.colonnes.map((x) => x.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6]);
  });
  it('capacité de déplacement', () => {
    const e = fc.nouvelle(graine(1));
    expect(fc.capacite(e, false)).toBe(5);
    e.cellules[0] = c(1, 'pique');
    expect(fc.capacite(e, false)).toBe(4);
    e.colonnes[0] = [];
    expect(fc.capacite(e, false)).toBe(8);
    expect(fc.capacite(e, true)).toBe(4);
  });
  it('déplacements, cellules et fondations', () => {
    const e = fc.nouvelle(graine(1));
    e.colonnes = [[c(7, 'pique')], [c(6, 'coeur')], [c(6, 'trefle')], [c(1, 'coeur')], [], [], [], []];
    expect(fc.deplacer(e, { type: 'colonne', col: 1, index: 0 }, { type: 'colonne', col: 0 })).toBe(true);
    expect(fc.deplacer(e, { type: 'colonne', col: 2, index: 0 }, { type: 'colonne', col: 0 })).toBe(false);
    expect(fc.deplacer(e, { type: 'colonne', col: 2, index: 0 }, { type: 'cellule', i: 0 })).toBe(true);
    expect(fc.deplacer(e, { type: 'colonne', col: 3, index: 0 }, { type: 'fondation' })).toBe(true);
    expect(e.fondations[1]).toHaveLength(1);
    expect(fc.deplacer(e, { type: 'colonne', col: 0, index: 0 }, { type: 'colonne', col: 4 })).toBe(true); // suite de 2 vers colonne vide
  });
  it('fin automatique', () => {
    const e = fc.nouvelle(graine(1));
    const col = (couleur: Carte['couleur']) => Array.from({ length: 13 }, (_, i) => c(13 - i, couleur));
    e.colonnes = [col('pique'), col('coeur'), col('carreau'), col('trefle'), [], [], [], []];
    expect(fc.terminable(e)).toBe(true);
    let n = 0;
    while (fc.pasAuto(e)) n++;
    expect(n).toBe(52);
    expect(fc.gagne(e)).toBe(true);
  });
});

describe('spider', () => {
  it('paquets de 104 cartes pour 1, 2 et 4 couleurs', () => {
    for (const n of [1, 2, 4] as const) {
      expect(sp.paquet(n, graine(n))).toHaveLength(104);
      const e = sp.nouvelle(n, graine(n));
      expect(e.colonnes.reduce((s, x) => s + x.length, 0)).toBe(54);
      expect(e.talon).toHaveLength(50);
    }
  });
  it('suite, déplacement et retrait de K→A', () => {
    const e = sp.nouvelle(1, graine(1));
    e.colonnes = Array.from({ length: 10 }, () => []);
    e.colonnes[0] = Array.from({ length: 12 }, (_, i) => ({ ...c(13 - i, 'pique'), visible: true }));
    e.colonnes[1] = [{ ...c(1, 'pique'), visible: true }];
    expect(sp.peutDeplacer(e, 1, 0, 0)).toBe(true);
    const r = sp.deplacer(e, 1, 0, 0);
    expect(r).toEqual({ ok: true, suiteRetiree: true });
    expect(e.suites).toBe(1);
    expect(e.colonnes[0]).toHaveLength(0);
    expect(sp.suiteDepuis(e, 0, 0)).toBeNull();
  });
  it('distribution bloquée si une colonne est vide', () => {
    const e = sp.nouvelle(2, graine(2));
    expect(sp.peutDistribuer(e)).toBe(true);
    e.colonnes[3] = [];
    expect(sp.peutDistribuer(e)).toBe(false);
  });
});

describe('pyramide', () => {
  it('cartes libres et retraits', () => {
    const e = py.nouvelle(graine(4));
    expect(e.pyr.filter(Boolean)).toHaveLength(28);
    expect(py.libre(e, py.idx(6, 0))).toBe(true);
    expect(py.libre(e, 0)).toBe(false);
    e.pyr[py.idx(6, 0)] = c(6, 'pique');
    e.pyr[py.idx(6, 1)] = c(7, 'coeur');
    expect(py.retirerPaire(e, { type: 'pyr', i: py.idx(6, 0) }, { type: 'pyr', i: py.idx(6, 1) })).toBe(true);
    e.pyr[py.idx(6, 2)] = c(13, 'carreau');
    expect(py.retirerRoi(e, { type: 'pyr', i: py.idx(6, 2) })).toBe(true);
    expect(py.ligneColonne(py.idx(4, 3))).toEqual([4, 3]);
  });
  it('talon : 2 reformations puis fin', () => {
    const e = py.nouvelle(graine(4));
    while (e.talon.length) py.piocher(e);
    expect(py.piocher(e)).toBe(true);
    while (e.talon.length) py.piocher(e);
    expect(py.piocher(e)).toBe(true);
    while (e.talon.length) py.piocher(e);
    expect(py.piocher(e)).toBe(false);
  });
});

describe('mahjong', () => {
  it('144 tuiles et donne soluble', () => {
    expect(mj.NB_TUILES).toBe(144);
    for (let s = 1; s <= 3; s++) {
      const e = mj.nouvelle(graine(s));
      expect(e.tuiles.filter((t) => t < 34).length).toBe(136);
      // résolution gloutonne par essais aléatoires : la construction garantit qu'une solution existe
      let ok = false;
      for (let essai = 0; essai < 300 && !ok; essai++) {
        const copie = { tuiles: e.tuiles, retirees: Array<boolean>(144).fill(false) };
        const rng = graine(essai + 1);
        for (;;) {
          const coups = mj.coupsPossibles(copie);
          if (!coups.length) break;
          const [a, b] = coups[Math.floor(rng() * coups.length)]!;
          mj.retirerPaire(copie, a, b);
        }
        ok = mj.gagne(copie);
      }
      expect(ok).toBe(true);
    }
  });
  it('mélange conserve un coup possible', () => {
    const e = mj.nouvelle(graine(9));
    mj.melangerRestantes(e, graine(1));
    expect(mj.coupsPossibles(e).length).toBeGreaterThan(0);
  });
});

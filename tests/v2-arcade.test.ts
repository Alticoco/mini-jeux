import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import * as te from '../src/games/tetris/logique';
import * as cb from '../src/games/cassebriques/logique';
import * as po from '../src/games/pong/logique';

describe('tetris', () => {
  it('7 pièces de 4 cellules, rotations cohérentes', () => {
    for (let t = 0; t < te.NB_PIECES; t++) {
      for (let r = 0; r < 4; r++) {
        const cs = te.cellules({ type: t, rot: r, x: 3, y: 5 });
        expect(cs).toHaveLength(4);
        expect(new Set(cs.map(([x, y]) => `${x},${y}`)).size).toBe(4);
      }
      expect(te.cellules({ type: t, rot: 4, x: 0, y: 0 })).toEqual(te.cellules({ type: t, rot: 0, x: 0, y: 0 }));
    }
  });
  it('mouvements, collisions et lignes', () => {
    const e = te.nouvelle(1, graine(3));
    // murs
    for (let i = 0; i < 12; i++) te.deplacer(e, -1);
    expect(te.cellules(e.piece).every(([x]) => x >= 0)).toBe(true);
    // remplit 3 lignes du bas sauf une colonne puis fixe un I vertical
    for (const y of [17, 18, 19]) for (let x = 0; x < 10; x++) if (x !== 0) e.grille[y]![x] = 1;
    e.piece = { type: 0, rot: 1, x: -2, y: 0 }; // I vertical, colonne x = 1 + ... vérifié ci-dessous
    const colonne = te.cellules(e.piece)[0]![0];
    e.piece = { ...e.piece, x: e.piece.x - colonne };
    expect(te.cellules(e.piece).every(([x]) => x === 0)).toBe(true);
    te.chuteDure(e, graine(1));
    expect(e.lignes).toBe(3);
    expect(e.grille[19]!.filter(Boolean)).toHaveLength(1);
    expect(e.score).toBeGreaterThanOrEqual(500);
  });
  it('fin de partie quand la pile atteint le haut', () => {
    const e = te.nouvelle(1, graine(1));
    for (let y = 0; y < 20; y += 1) for (let x = 0; x < 9; x++) e.grille[y]![x] = 1;
    for (let k = 0; k < 40 && !e.fini; k++) te.chuteDure(e, graine(k));
    expect(e.fini).toBe(true);
  });
  it('délai décroissant', () => {
    expect(te.delai(1)).toBeGreaterThan(te.delai(10));
    expect(te.delai(100)).toBe(70);
  });
});

describe('casse-briques', () => {
  it('rebondit sur les murs et détruit une brique', () => {
    const e = cb.nouvelle();
    e.colle = false;
    e.balle = { x: cb.BW * 3 + 10, y: cb.HAUT_BRIQUES + cb.LIGNES * cb.BH + 12, vx: 0, vy: -300, r: 7 };
    const total = e.briques.filter(Boolean).length;
    let touche = false;
    for (let k = 0; k < 120 && !touche; k++) touche = cb.avancer(e, 1 / 60, 300).brique;
    expect(touche).toBe(true);
    expect(e.briques.filter(Boolean)).toHaveLength(total - 1);
    expect(e.balle.vy).toBeGreaterThan(0);
    expect(e.score).toBeGreaterThan(0);
  });
  it('perd une vie puis la partie', () => {
    const e = cb.nouvelle();
    for (let v = 0; v < 3; v++) {
      e.colle = false;
      e.balle = { x: 20, y: cb.HAUTEUR - 5, vx: 0, vy: 400, r: 7 };
      let perdue = false;
      for (let k = 0; k < 60 && !perdue; k++) perdue = cb.avancer(e, 1 / 60, 300).perdue;
      expect(perdue).toBe(true);
    }
    expect(e.vies).toBe(0);
    expect(e.fini).toBe(true);
  });
  it('la raquette renvoie la balle vers le haut', () => {
    const e = cb.nouvelle();
    e.colle = false;
    e.balle = { x: e.raquette.x, y: cb.RAQ_Y - 10, vx: 0, vy: 300, r: 7 };
    for (let k = 0; k < 10; k++) cb.avancer(e, 1 / 60, 300);
    expect(e.balle.vy).toBeLessThan(0);
  });
});

describe('pong', () => {
  it('service, rebond sur la raquette, point', () => {
    const e = po.nouvelle();
    po.servir(e, 'moyen', () => 0.5);
    expect(e.servir).toBe(false);
    expect(e.balle.vx).toBeGreaterThan(0);
    // balle qui sort à gauche : point pour l'ordi
    e.balle = { x: 30, y: 10, vx: -400, vy: 0 };
    e.joueurY = 300;
    let point: string | null = null;
    for (let k = 0; k < 60 && !point; k++) point = po.avancer(e, 1 / 60, 'moyen').point;
    expect(point).toBe('ordi');
    expect(e.scores).toEqual([0, 1]);
    // renvoi par la raquette
    const f = po.nouvelle();
    f.servir = false;
    f.joueurY = 200;
    f.balle = { x: 60, y: 200, vx: -300, vy: 0 };
    for (let k = 0; k < 10; k++) po.avancer(f, 1 / 60, 'moyen');
    expect(f.balle.vx).toBeGreaterThan(0);
  });
  it('la partie se termine à 7 points', () => {
    const e = po.nouvelle();
    e.scores = [6, 3];
    e.servir = false;
    e.balle = { x: po.L - 5, y: 50, vx: 500, vy: 0 };
    e.ordiY = 350;
    for (let k = 0; k < 60 && !e.fini; k++) po.avancer(e, 1 / 60, 'facile');
    expect(e.fini).toBe(true);
    expect(e.scores[0]).toBe(7);
  });
});

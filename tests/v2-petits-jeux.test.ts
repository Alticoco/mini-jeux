import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import * as han from '../src/games/hanoi/logique';
import * as lo from '../src/games/lightsout/logique';
import * as fl from '../src/games/floodit/logique';
import * as yams from '../src/games/yams/logique';
import * as fk from '../src/games/farkle/logique';
import { arbitrer } from '../src/games/pfc/jeu';

describe('hanoï', () => {
  it('règles et victoire', () => {
    const t = han.initiales(3);
    expect(han.deplacer(t, 0, 1)).toBe(true); // 1
    expect(han.deplacer(t, 0, 1)).toBe(false); // 2 sur 1 interdit
    expect(han.deplacer(t, 0, 2)).toBe(true); // 2
    expect(han.deplacer(t, 1, 2)).toBe(true); // 1 sur 2
    expect(han.deplacer(t, 0, 1)).toBe(true); // 3
    expect(han.deplacer(t, 2, 0)).toBe(true);
    expect(han.deplacer(t, 2, 1)).toBe(true);
    expect(han.deplacer(t, 0, 1)).toBe(true);
    expect(han.deplacer(t, 0, 2)).toBe(false);
    expect(han.minimumCoups(3)).toBe(7);
  });
});

describe('lights out', () => {
  it('mélange non éteint et rejouer les mêmes appuis éteint', () => {
    const g = lo.melanger(8, graine(4));
    expect(lo.eteint(g)).toBe(false);
    const h = Array<boolean>(25).fill(false);
    lo.basculer(h, 12);
    expect(h.filter(Boolean)).toHaveLength(5);
    lo.basculer(h, 12);
    expect(lo.eteint(h)).toBe(true);
    const coin = Array<boolean>(25).fill(false);
    lo.basculer(coin, 0);
    expect(coin.filter(Boolean)).toHaveLength(3);
  });
});

describe('flood-it', () => {
  it('inonde la zone connexe', () => {
    const g = [0, 0, 1, 1, 1, 1, 0, 0, 2];
    expect(fl.inonder(g, 3, 1)).toBe(true);
    expect(g.slice(0, 6)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(fl.inonder(g, 3, 1)).toBe(false);
    expect(fl.uniforme(g)).toBe(false);
  });
});

describe('yams', () => {
  it('calcule les combinaisons', () => {
    expect(yams.points(0, [1, 1, 2, 3, 1])).toBe(3);
    expect(yams.points(5, [6, 6, 2, 3, 6])).toBe(18);
    expect(yams.points(6, [3, 3, 3, 1, 2])).toBe(12);
    expect(yams.points(6, [3, 3, 4, 1, 2])).toBe(0);
    expect(yams.points(7, [4, 4, 4, 4, 1])).toBe(17);
    expect(yams.points(8, [2, 2, 5, 5, 5])).toBe(25);
    expect(yams.points(8, [2, 2, 5, 5, 6])).toBe(0);
    expect(yams.points(9, [1, 2, 3, 4, 6])).toBe(30);
    expect(yams.points(9, [1, 2, 3, 5, 6])).toBe(0);
    expect(yams.points(10, [2, 3, 4, 5, 6])).toBe(40);
    expect(yams.points(11, [4, 4, 4, 4, 4])).toBe(50);
    expect(yams.points(12, [1, 2, 3, 4, 6])).toBe(16);
  });
  it('bonus à 63', () => {
    expect(yams.bonus([3, 6, 9, 12, 15, 18, null, null, null, null, null, null, null])).toBe(35);
    expect(yams.bonus([2, 6, 9, 12, 15, 18, null, null, null, null, null, null, null])).toBe(0);
  });
});

describe('farkle', () => {
  it('score des sélections', () => {
    expect(fk.scoreSelection([1])).toBe(100);
    expect(fk.scoreSelection([5, 5])).toBe(100);
    expect(fk.scoreSelection([2, 2, 2])).toBe(200);
    expect(fk.scoreSelection([1, 1, 1])).toBe(1000);
    expect(fk.scoreSelection([3, 3, 3, 3])).toBe(1000);
    expect(fk.scoreSelection([1, 2, 3, 4, 5, 6])).toBe(1500);
    expect(fk.scoreSelection([2, 2, 3, 3, 4, 4])).toBe(750);
    expect(fk.scoreSelection([2])).toBe(0);
    expect(fk.scoreSelection([1, 2])).toBe(0); // le 2 ne compte pas
    expect(fk.scoreSelection([1, 5, 2, 2, 2])).toBe(350);
  });
  it('détecte un Farkle', () => {
    expect(fk.peutMarquer([2, 3, 4, 6, 2, 3])).toBe(false);
    expect(fk.peutMarquer([2, 3, 4, 6, 2, 5])).toBe(true);
    expect(fk.meilleureSelection([1, 1, 1, 2, 3, 6]).score).toBe(1000);
  });
});

describe('pierre-feuille-ciseaux', () => {
  it('arbitre', () => {
    expect(arbitrer('pierre', 'ciseaux')).toBe('gagne');
    expect(arbitrer('pierre', 'feuille')).toBe('perdu');
    expect(arbitrer('ciseaux', 'ciseaux')).toBe('nul');
  });
});

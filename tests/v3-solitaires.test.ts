import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import type { Carte } from '../src/shared/cartes';
import * as go from '../src/games/golf/logique';
import * as tp from '../src/games/tripeaks/logique';
import * as sc from '../src/games/scorpion/logique';
import * as yu from '../src/games/yukon/logique';

const c = (rang: number, couleur: Carte['couleur']): Carte => ({ rang, couleur });
const v = (rang: number, couleur: Carte['couleur'], visible = true) => ({ ...c(rang, couleur), visible });

describe('golf', () => {
  it('distribution et règles de voisinage', () => {
    const e = go.nouvelle(graine(1));
    expect(e.colonnes.map((x) => x.length)).toEqual([5, 5, 5, 5, 5, 5, 5]);
    expect(e.talon).toHaveLength(16);
    e.defausse = [c(6, 'pique')];
    e.colonnes[0] = [c(2, 'coeur'), c(7, 'coeur')];
    e.colonnes[1] = [c(1, 'pique'), c(13, 'pique')];
    expect(go.jouer(e, 0)).toBe(true);
    expect(e.defausse.at(-1)!.rang).toBe(7);
    e.defausse = [c(13, 'pique')];
    expect(go.peutJouer(e, 1)).toBe(false); // roi sur roi
    e.defausse = [c(1, 'pique')];
    e.colonnes[1] = [c(13, 'coeur')];
    expect(go.peutJouer(e, 1)).toBe(false); // pas de passage roi/as
  });
  it('blocage et victoire', () => {
    const e = go.nouvelle(graine(2));
    e.colonnes = Array.from({ length: 7 }, () => []);
    expect(go.gagne(e)).toBe(true);
    e.colonnes[0] = [c(5, 'coeur')];
    e.talon = [];
    e.defausse = [c(9, 'pique')];
    expect(go.bloque(e)).toBe(true);
  });
});

describe('tri-peaks', () => {
  it('28 cartes, recouvrements cohérents', () => {
    expect(tp.POSITIONS).toHaveLength(28);
    expect(tp.COUVREURS.slice(0, 3).every((x) => x.length === 2)).toBe(true);
    expect(tp.COUVREURS.slice(18).every((x) => x.length === 0)).toBe(true);
    const e = tp.nouvelle(graine(1));
    expect(e.talon).toHaveLength(23);
    expect(tp.libre(e, 27)).toBe(true);
    expect(tp.libre(e, 0)).toBe(false);
  });
  it('jeu et libération', () => {
    const e = tp.nouvelle(graine(1));
    e.defausse = [c(13, 'pique')];
    e.cartes[18] = c(1, 'coeur'); // as sur roi : voisins
    e.cartes[19] = c(5, 'coeur');
    expect(tp.peutJouer(e, 18)).toBe(true);
    expect(tp.jouer(e, 18)).toBe(true);
    expect(e.serie).toBe(1);
    expect(tp.peutJouer(e, 19)).toBe(false);
    tp.piocher(e);
    expect(e.serie).toBe(0);
  });
});

describe('scorpion', () => {
  it('distribution : 7 colonnes de 7, 3 en réserve', () => {
    const e = sc.nouvelle(graine(3));
    expect(e.colonnes.every((x) => x.length === 7)).toBe(true);
    expect(e.talon).toHaveLength(3);
    expect(e.colonnes[0]!.filter((k) => !k.visible)).toHaveLength(3);
    expect(e.colonnes[5]!.every((k) => k.visible)).toBe(true);
  });
  it('déplacement avec pile libre et retrait de suite', () => {
    const e = sc.nouvelle(graine(3));
    e.colonnes = Array.from({ length: 7 }, () => []);
    e.colonnes[0] = Array.from({ length: 12 }, (_, i) => v(13 - i, 'pique'));
    e.colonnes[1] = [v(9, 'coeur'), v(1, 'pique'), v(4, 'trefle')]; // l'as entraîne le 4
    expect(sc.peutDeplacer(e, 1, 1, 0)).toBe(true);
    expect(sc.peutDeplacer(e, 1, 0, 0)).toBe(false);
    e.colonnes[1] = [v(1, 'pique')];
    const r = sc.deplacer(e, 1, 0, 0);
    expect(r).toEqual({ ok: true, suites: 1 });
    expect(e.suites).toBe(1);
    expect(e.colonnes[0]).toHaveLength(0);
    e.colonnes[2] = [v(13, 'coeur'), v(2, 'coeur')];
    expect(sc.peutDeplacer(e, 2, 0, 0)).toBe(true); // roi sur colonne vide
    expect(sc.peutDeplacer(e, 2, 1, 0)).toBe(false);
  });
  it('distribution de la réserve', () => {
    const e = sc.nouvelle(graine(4));
    expect(sc.distribuer(e)).toBe(true);
    expect(e.colonnes.slice(0, 3).every((x) => x.length === 8)).toBe(true);
    expect(sc.distribuer(e)).toBe(false);
  });
});

describe('yukon', () => {
  it('distribution', () => {
    const e = yu.nouvelle(graine(5));
    expect(e.colonnes.map((x) => x.length)).toEqual([1, 6, 7, 8, 9, 10, 11]);
    expect(e.colonnes.map((x) => x.filter((k) => !k.visible).length)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it('couleurs alternées, pile libre, fondation', () => {
    const e = yu.nouvelle(graine(5));
    e.colonnes = [[v(7, 'pique')], [v(9, 'coeur', false), v(6, 'coeur'), v(2, 'trefle')], [v(1, 'carreau')], [], [], [], []];
    expect(yu.peutDeplacer(e, 1, 1, 0)).toBe(true);
    expect(yu.deplacer(e, 1, 1, 0)).toBe(true);
    expect(e.colonnes[0]).toHaveLength(3);
    expect(e.colonnes[1]![0]!.visible).toBe(true);
    expect(yu.versFondation(e, 2)).toBe(true);
    expect(e.fondations[2]).toHaveLength(1);
    expect(yu.peutDeplacer(e, 0, 0, 3)).toBe(false);
  });
});

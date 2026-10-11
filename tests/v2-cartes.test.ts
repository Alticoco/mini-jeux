import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import type { Carte } from '../src/shared/cartes';
import * as rev from '../src/games/reversi/logique';
import * as dm from '../src/games/dames/logique';
import * as h8 from '../src/games/huitamericain/logique';
import * as me from '../src/games/menteur/logique';
import * as pa from '../src/games/paires/logique';

const c = (rang: number, couleur: Carte['couleur']): Carte => ({ rang, couleur });

describe('reversi', () => {
  it('coups de départ et retournement', () => {
    const p = rev.depart();
    expect(rev.coupsLegaux(p, 1).sort((a, b) => a - b)).toEqual([19, 26, 37, 44]);
    const q = rev.jouer(p, 19, 1);
    expect(rev.score(q)).toEqual({ noir: 4, blanc: 1 });
  });
  it('une partie ia contre ia se termine', () => {
    let p = rev.depart();
    let tour: 1 | 2 = 1;
    for (let k = 0; k < 120 && !rev.fini(p); k++) {
      if (rev.coupsLegaux(p, tour).length) p = rev.jouer(p, rev.coupOrdi(p, tour, 'moyen', graine(k)), tour);
      tour = rev.adversaire(tour);
    }
    expect(rev.fini(p)).toBe(true);
  });
});

describe('dames', () => {
  it('position de départ', () => {
    const p = dm.depart();
    expect(p.filter((v) => v === 1)).toHaveLength(12);
    expect(p.filter((v) => v === 3)).toHaveLength(12);
    expect(dm.coupsLegaux(p, 'joueur')).toHaveLength(7);
  });
  it('prise obligatoire et multiple', () => {
    const p = Array<dm.Case>(64).fill(0);
    p[5 * 8 + 0] = 1; // joueur
    p[4 * 8 + 1] = 3;
    p[2 * 8 + 3] = 3; // deux pions à prendre en enchaînement
    const coups = dm.coupsLegaux(p, 'joueur');
    expect(coups).toHaveLength(1);
    expect(coups[0]!.pris.sort()).toEqual([2 * 8 + 3, 4 * 8 + 1].sort());
    expect(coups[0]!.vers).toBe(1 * 8 + 4);
    const q = dm.appliquer(p, coups[0]!);
    expect(q.filter((v) => v === 3)).toHaveLength(0);
  });
  it('dame volante et promotion', () => {
    const p = Array<dm.Case>(64).fill(0);
    p[7 * 8 + 0] = 2;
    p[3 * 8 + 4] = 3; // à prendre de loin
    const coups = dm.coupsLegaux(p, 'joueur');
    expect(coups.every((m) => m.pris.length === 1)).toBe(true);
    expect(coups.map((m) => m.vers).sort((a, b) => a - b)).toEqual([2 * 8 + 5, 1 * 8 + 6, 0 * 8 + 7].sort((a, b) => a - b));
    const pr = Array<dm.Case>(64).fill(0);
    pr[1 * 8 + 2] = 1;
    const m = dm.coupsLegaux(pr, 'joueur').find((x) => x.vers === 1)!;
    expect(dm.appliquer(pr, m)[1]).toBe(2);
  });
  it('ia contre ia sans erreur', () => {
    let p = dm.depart();
    let camp: dm.Camp = 'joueur';
    for (let k = 0; k < 60; k++) {
      const coups = dm.coupsLegaux(p, camp);
      if (!coups.length) break;
      const coup = camp === 'ordi' ? dm.coupOrdi(p, 'moyen', graine(k)) : coups[k % coups.length]!;
      p = dm.appliquer(p, coup);
      camp = dm.adverse(camp);
    }
    expect(p.filter(Boolean).length).toBeGreaterThan(0);
  });
});

describe('8 américain', () => {
  it('règles de jeu', () => {
    const e = h8.nouvelle(graine(5));
    expect(e.mains[0]).toHaveLength(7);
    expect(h8.dessus(e).rang).not.toBe(8);
    e.defausse = [c(5, 'coeur')];
    e.couleur = 'coeur';
    e.mains[0] = [c(9, 'coeur'), c(5, 'pique'), c(8, 'trefle'), c(2, 'pique')];
    expect(h8.cartesJouables(e, 0)).toEqual([0, 1, 2]);
    expect(h8.jouerCarte(e, 0, 3)).toBe(false);
    expect(h8.jouerCarte(e, 0, 2, 'carreau')).toBe(true);
    expect(e.couleur).toBe('carreau');
    expect(e.tour).toBe(1);
  });
  it("l'ordi finit par jouer ou piocher", () => {
    const e = h8.nouvelle(graine(8));
    e.tour = 1;
    const avant = e.mains[1].length;
    h8.tourOrdi(e, graine(2));
    expect(e.mains[1].length).toBeLessThanOrEqual(avant + 30);
    expect((e.tour as number) === 0 || e.gagnant === 1).toBe(true);
  });
});

describe('menteur', () => {
  it('annonce, contestation et ramassage', () => {
    const e = me.nouvelle(graine(1));
    e.mains[0] = [c(1, 'pique'), c(5, 'coeur'), c(9, 'carreau')];
    e.rang = 1;
    expect(me.poser(e, 0, [0])).toBe(true);
    expect(me.honnete(e.annonce!)).toBe(true);
    const r = me.repondre(e, true);
    expect(r.ramasse).toBe(1); // accusation à tort : l'accusateur ramasse
    expect(e.rang).toBe(2);
    expect(e.tour).toBe(1);
    // mensonge
    e.annonce = null;
    e.tour = 0;
    e.rang = 2;
    expect(me.poser(e, 0, [0])).toBe(true);
    expect(me.repondre(e, true).ramasse).toBe(0);
  });
  it('victoire quand la main est vide sans contestation', () => {
    const e = me.nouvelle(graine(1));
    e.mains[0] = [c(1, 'pique')];
    me.poser(e, 0, [0]);
    me.repondre(e, false);
    expect(e.gagnant).toBe(0);
  });
});

describe('mistigri / pouilleux', () => {
  it('paquets et paires', () => {
    expect(pa.paquet('pouilleux')).toHaveLength(53);
    expect(pa.paquet('mistigri')).toHaveLength(51);
    for (const v of ['mistigri', 'pouilleux'] as const) {
      const d = pa.distribuer(v, graine(3));
      const reste = d.mains[0].length + d.mains[1].length;
      expect(reste % 2).toBe(1); // une seule carte sans partenaire
      expect(reste + d.paires * 2).toBe(v === 'mistigri' ? 51 : 53);
    }
  });
  it('retire les paires', () => {
    const r = pa.retirerPaires([c(7, 'coeur'), c(7, 'carreau'), c(7, 'pique'), c(3, 'trefle')], 'mistigri');
    expect(r.paires).toBe(1);
    expect(r.main).toHaveLength(2);
    expect(pa.retirerPaires([c(7, 'coeur'), c(7, 'pique')], 'pouilleux').paires).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import type { Carte } from '../src/shared/cartes';
import * as sc from '../src/games/scopa/logique';
import * as pr from '../src/games/president/logique';

const c = (rang: number, couleur: Carte['couleur']): Carte => ({ rang, couleur });

describe('scopa', () => {
  it('paquet de 40 et distribution', () => {
    expect(sc.paquet40()).toHaveLength(40);
    const e = sc.nouvelleManche(0, graine(1));
    expect(e.table).toHaveLength(4);
    expect(e.mains[0]).toHaveLength(3);
    expect(e.pioche).toHaveLength(40 - 4 - 6);
  });
  it('prises : valeur identique prioritaire, sinon somme', () => {
    const table = [c(3, 'pique'), c(4, 'coeur'), c(7, 'trefle'), c(2, 'carreau')];
    expect(sc.captures(table, c(7, 'pique')).map((o) => o.map((x) => x.rang))).toEqual([[7]]); // le 3+4 est interdit : même valeur d'abord
    const sommes = sc.captures(table, c(6, 'coeur')).map((o) => o.map((x) => x.rang).sort().join('+')).sort();
    expect(sommes).toEqual(['2+4']);
    expect(sc.captures(table, c(1, 'trefle'))).toEqual([]);
    expect(sc.valeur(c(13, 'pique'))).toBe(10);
    // figure : le valet (8) peut prendre 3+... avec la somme
    expect(sc.captures([c(3, 'pique'), c(5, 'coeur')], c(11, 'trefle'))).toHaveLength(1);
  });
  it('scopa et fin de manche', () => {
    const e = sc.nouvelleManche(0, graine(2));
    e.table = [c(5, 'pique')];
    e.mains = [[c(5, 'coeur'), c(1, 'pique'), c(2, 'pique')], [c(3, 'coeur'), c(4, 'coeur'), c(6, 'coeur')]];
    const r = sc.jouer(e, 0, 0)!;
    expect(r.scopa).toBe(true);
    expect(e.scope[0]).toBe(1);
    expect(e.table).toHaveLength(0);
    expect(sc.jouer(e, 0, 0)).toBeNull(); // pas son tour
  });
  it('manches complètes ordi contre ordi', () => {
    for (let s = 1; s <= 5; s++) {
      const rng = graine(s);
      const e = sc.nouvelleManche(0, rng);
      let coups = 0;
      while (!e.fini && coups < 100) {
        const ch = sc.choixOrdi(e, e.tour, rng);
        expect(sc.jouer(e, e.tour, ch.i, ch.prise)).not.toBeNull();
        coups++;
      }
      expect(e.fini).toBe(true);
      expect(e.prises[0].length + e.prises[1].length).toBe(40);
      const d = sc.pointsManche(e);
      expect(d[0].points + d[1].points).toBeLessThanOrEqual(4 + e.scope[0] + e.scope[1]);
    }
  });
  it('primiera et settebello', () => {
    const e = sc.nouvelleManche(0, graine(3));
    e.prises = [[c(7, 'carreau'), c(7, 'pique'), c(6, 'coeur'), c(6, 'trefle')], [c(1, 'pique')]];
    e.scope = [0, 0];
    const d = sc.pointsManche(e);
    expect(d[0].settebello).toBe(true);
    expect(d[0].primiera).toBe(21 + 21 + 18 + 18);
    expect(d[1].primiera).toBe(0); // il manque des couleurs
    expect(d[0].points).toBeGreaterThanOrEqual(3);
  });
});

describe('président', () => {
  it('distribution et ordre des forces', () => {
    const e = pr.nouvelle(graine(1));
    expect(e.mains.every((m) => m.length === 13)).toBe(true);
    expect(pr.force(c(2, 'pique'))).toBeGreaterThan(pr.force(c(1, 'pique')));
    expect(pr.force(c(1, 'pique'))).toBeGreaterThan(pr.force(c(13, 'pique')));
    expect(e.mains[e.tour]!.some((x) => x.rang === 3 && x.couleur === 'trefle')).toBe(true);
  });
  it('règles de pose et de passe', () => {
    const e = pr.nouvelle(graine(2));
    e.tour = 0;
    e.mains[0] = [c(5, 'pique'), c(5, 'coeur'), c(9, 'pique'), c(2, 'coeur')];
    expect(pr.posePossible(e, 0, [e.mains[0]![0]!, e.mains[0]![1]!])).toBe(true);
    expect(pr.posePossible(e, 0, [e.mains[0]![0]!, e.mains[0]![2]!])).toBe(false); // valeurs différentes
    pr.jouer(e, 0, [e.mains[0]![0]!, e.mains[0]![1]!]);
    expect(e.pli!.cartes).toHaveLength(2);
    expect(e.tour).toBe(1);
    e.mains[1] = [c(8, 'pique'), c(9, 'coeur'), c(9, 'carreau'), c(6, 'pique')];
    expect(pr.posePossible(e, 1, [e.mains[1]![0]!])).toBe(false); // un seul alors qu'il faut une paire
    expect(pr.posePossible(e, 1, [e.mains[1]![1]!, e.mains[1]![2]!])).toBe(true);
    pr.passer(e, 1);
    expect(e.tour).toBe(2);
  });
  it('tout le monde passe : la pile est vidée', () => {
    const e = pr.nouvelle(graine(3));
    e.tour = 0; e.dernier = 0;
    e.mains[0] = [c(5, 'pique'), c(9, 'coeur')];
    pr.jouer(e, 0, [e.mains[0]![0]!]);
    pr.passer(e, 1); pr.passer(e, 2); pr.passer(e, 3);
    expect(e.pli).toBeNull();
    expect(e.tour).toBe(0);
  });
  it('un 2 coupe et permet de rejouer', () => {
    const e = pr.nouvelle(graine(4));
    e.tour = 2; e.dernier = 1;
    e.pli = { joueur: 1, cartes: [c(13, 'pique')] };
    e.mains[2] = [c(2, 'pique'), c(4, 'coeur')];
    pr.jouer(e, 2, [e.mains[2]![0]!]);
    expect(e.pli).toBeNull();
    expect(e.tour).toBe(2);
  });
  it('parties ordi contre ordi complètes', () => {
    for (const niveau of ['facile', 'moyen', 'difficile'] as const) {
      for (let s = 1; s <= 4; s++) {
        const rng = graine(s * 11);
        const e = pr.nouvelle(rng);
        let tours = 0;
        while (!pr.fini(e) && tours < 2000) {
          const pose = pr.choixOrdi(e, e.tour, niveau, rng);
          if (pose) expect(pr.jouer(e, e.tour, pose)).toBe(true);
          else expect(e.pli ? pr.passer(e, e.tour) : false).toBe(true);
          tours++;
        }
        expect(pr.fini(e)).toBe(true);
        expect([...e.classement].sort()).toEqual([0, 1, 2, 3]);
      }
    }
  });
});

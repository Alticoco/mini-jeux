import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import type { Carte } from '../src/shared/cartes';
import * as be from '../src/games/belote/logique';

const c = (rang: number, couleur: Carte['couleur']): Carte => ({ rang, couleur });

describe('belote : valeurs et enchères', () => {
  it('valeurs des cartes (total 152 + 10 de der)', () => {
    const jeu = be.paquet32();
    expect(jeu).toHaveLength(32);
    expect(jeu.reduce((s, x) => s + be.points(x, 'coeur'), 0)).toBe(152);
    expect(be.points(c(11, 'coeur'), 'coeur')).toBe(20);
    expect(be.points(c(11, 'pique'), 'coeur')).toBe(2);
    expect(be.force(c(11, 'coeur'), 'coeur')).toBeGreaterThan(be.force(c(9, 'coeur'), 'coeur'));
    expect(be.force(c(1, 'pique'), 'coeur')).toBeGreaterThan(be.force(c(10, 'pique'), 'coeur'));
  });
  it('prise à la retournée et distribution complète', () => {
    const e = be.nouvelleDonne(3, [0, 0], graine(1));
    expect(e.mains.every((m) => m.length === 5)).toBe(true);
    expect(e.tour).toBe(0);
    expect(be.prendre(e, 1)).toBe(false); // pas son tour
    expect(be.prendre(e, 0)).toBe(true);
    expect(e.atout).toBe(e.retournee.couleur);
    expect(e.mains.every((m) => m.length === 8)).toBe(true);
    expect(e.phase).toBe('jeu');
    expect(e.preneur).toBe(0);
  });
  it('2ᵉ tour d\'enchères puis redonne', () => {
    const e = be.nouvelleDonne(0, [0, 0], graine(2));
    for (let k = 0; k < 4; k++) expect(be.passer(e, e.tour)).toBe(true);
    expect(e.phase).toBe('enchere2');
    expect(be.prendre(e, e.tour, e.retournee.couleur)).toBe(false); // couleur interdite
    for (let k = 0; k < 4; k++) be.passer(e, e.tour);
    expect(e.phase).toBe('redonne');
  });
});

describe('belote : obligations de jeu', () => {
  const base = () => {
    const e = be.nouvelleDonne(3, [0, 0], graine(3));
    e.phase = 'jeu';
    e.atout = 'coeur';
    e.preneur = 0;
    e.belote = null;
    return e;
  };
  it('fournir la couleur', () => {
    const e = base();
    e.pli = [{ joueur: 3, carte: c(10, 'pique') }];
    e.tour = 0;
    e.mains[0] = [c(7, 'pique'), c(1, 'pique'), c(9, 'coeur'), c(8, 'carreau')];
    expect(be.cartesJouables(e, 0)).toEqual([e.mains[0]![0], e.mains[0]![1]]);
  });
  it('couper quand on ne peut pas fournir, sauf si le partenaire est maître', () => {
    const e = base();
    e.pli = [{ joueur: 3, carte: c(1, 'pique') }];
    e.tour = 0;
    e.mains[0] = [c(7, 'coeur'), c(8, 'carreau')];
    expect(be.cartesJouables(e, 0)).toEqual([e.mains[0]![0]]); // doit couper
    // partenaire (joueur 2) maître : libre
    e.pli = [{ joueur: 1, carte: c(7, 'pique') }, { joueur: 2, carte: c(1, 'pique') }, { joueur: 3, carte: c(8, 'pique') }];
    expect(be.cartesJouables(e, 0)).toHaveLength(2);
  });
  it('surcouper et monter à l\'atout', () => {
    const e = base();
    e.pli = [{ joueur: 3, carte: c(10, 'coeur') }];
    e.tour = 0;
    e.mains[0] = [c(7, 'coeur'), c(11, 'coeur'), c(8, 'pique')];
    expect(be.cartesJouables(e, 0)).toEqual([e.mains[0]![1]]); // le valet monte sur le 10
    e.mains[0] = [c(7, 'coeur'), c(8, 'coeur'), c(8, 'pique')];
    expect(be.cartesJouables(e, 0)).toHaveLength(2); // ne peut pas monter : n'importe quel atout
    // couper une carte non atout avec surcoupe obligatoire
    e.pli = [{ joueur: 3, carte: c(1, 'pique') }, { joueur: 1, carte: c(9, 'coeur') }];
    e.mains[0] = [c(7, 'coeur'), c(11, 'coeur'), c(8, 'carreau')];
    expect(be.cartesJouables(e, 0)).toEqual([e.mains[0]![1]]);
  });
  it('gagnant du pli', () => {
    const e = base();
    e.pli = [{ joueur: 3, carte: c(1, 'pique') }, { joueur: 0, carte: c(10, 'pique') }, { joueur: 1, carte: c(7, 'coeur') }, { joueur: 2, carte: c(9, 'coeur') }];
    expect(be.pliGagnantActuel(e)).toBe(2);
    e.pli = [{ joueur: 3, carte: c(10, 'pique') }, { joueur: 0, carte: c(1, 'pique') }, { joueur: 1, carte: c(1, 'carreau') }, { joueur: 2, carte: c(9, 'pique') }];
    expect(be.pliGagnantActuel(e)).toBe(0);
  });
});

describe('belote : donnes complètes ordi contre ordi', () => {
  it('chaque donne distribue 162 points (+ belote) et se termine', () => {
    for (const niveau of ['facile', 'moyen', 'difficile'] as const) {
      for (let s = 1; s <= 12; s++) {
        const rng = graine(s * 31);
        const e = be.nouvelleDonne(s % 4, [0, 0], rng);
        let garde = 0;
        while ((e.phase === 'enchere1' || e.phase === 'enchere2') && garde++ < 20) {
          const choix = be.choixEnchere(e, e.tour, niveau);
          if (choix) be.prendre(e, e.tour, choix); else be.passer(e, e.tour);
        }
        if (e.phase === 'redonne') continue;
        expect(e.phase).toBe('jeu');
        garde = 0;
        while (e.phase === 'jeu' && garde++ < 40) {
          const carte = be.choixCarte(e, e.tour, niveau, rng);
          expect(be.jouerCarte(e, e.tour, carte)).not.toBeNull();
        }
        expect(e.phase).toBe('donneFinie');
        const r = e.resultat!;
        const beloteTotal = r.belote !== null ? 20 : 0;
        const capot = r.points[0] === 252 + 0 || r.points[1] === 252 || r.capot;
        expect(r.points[0] + r.points[1]).toBe(162 + beloteTotal + (capot ? 90 : 0));
        expect(e.plis).toHaveLength(8);
        expect(e.mains.every((m) => m.length === 0)).toBe(true);
        expect(r.marque[0] + r.marque[1]).toBeGreaterThanOrEqual(r.reussi ? 162 : 162);
      }
    }
  });
});

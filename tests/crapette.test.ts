import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import type { Carte } from '../src/shared/cartes';
import * as cr from '../src/games/crapette/logique';

const c = (rang: number, couleur: Carte['couleur']): Carte => ({ rang, couleur });
const total = (e: cr.Etat) =>
  e.cotes.reduce((s, k) => s + k.reserve.length + k.pioche.length + k.defausse.length, 0) + e.colonnes.reduce((s, x) => s + x.length, 0) + e.fondations.reduce((s, x) => s + x.length, 0);

describe('crapette', () => {
  it('distribution : 104 cartes', () => {
    const e = cr.nouvelle(graine(1));
    expect(e.cotes[0].reserve).toHaveLength(13);
    expect(e.cotes[1].pioche).toHaveLength(52 - 13 - 4);
    expect(e.colonnes.every((x) => x.length === 1)).toBe(true);
    expect(total(e)).toBe(104);
  });

  it('colonnes : couleurs alternées, valeur inférieure ; colonne vide seulement depuis réserve/défausse', () => {
    const e = cr.nouvelle(graine(2));
    e.colonnes = [[c(9, 'pique')], [], [c(5, 'coeur')], [c(3, 'trefle')], [], [], [], []];
    e.cotes[0].reserve = [c(8, 'coeur')];
    e.cotes[0].defausse = [c(7, 'pique')];
    expect(cr.peutJouer(e, 0, { t: 'reserve' }, { t: 'colonne', i: 0 })).toBe(true); // 8♥ sur 9♠
    expect(cr.peutJouer(e, 0, { t: 'defausse' }, { t: 'colonne', i: 0 })).toBe(false); // 7♠ sur 9♠ : mauvaise valeur
    expect(cr.peutJouer(e, 0, { t: 'colonne', i: 3 }, { t: 'colonne', i: 1 })).toBe(false); // colonne vide : pas depuis une colonne
    expect(cr.peutJouer(e, 0, { t: 'defausse' }, { t: 'colonne', i: 1 })).toBe(true);
    expect(cr.peutJouer(e, 1, { t: 'reserve' }, { t: 'colonne', i: 0 })).toBe(false); // pas son tour
  });

  it('fondations : un as lance une pile, puis même couleur en montant', () => {
    const e = cr.nouvelle(graine(3));
    e.colonnes = [[c(2, 'pique')], [c(1, 'pique')], [c(1, 'coeur')], [], [], [], [], []];
    expect(cr.peutJouer(e, 0, { t: 'colonne', i: 0 }, { t: 'fondation' })).toBe(false);
    expect(cr.jouer(e, 0, { t: 'colonne', i: 1 }, { t: 'fondation' })).toBe(true);
    expect(cr.peutJouer(e, 0, { t: 'colonne', i: 0 }, { t: 'fondation' })).toBe(true);
    cr.jouer(e, 0, { t: 'colonne', i: 0 }, { t: 'fondation' });
    expect(e.fondations.find((f) => f.length === 2)![1]).toEqual(c(2, 'pique'));
    // deux as de pique peuvent ouvrir deux piles (deux jeux)
    e.colonnes[3] = [c(1, 'pique')];
    expect(cr.peutJouer(e, 0, { t: 'colonne', i: 3 }, { t: 'fondation' })).toBe(true);
  });

  it("jouer sur les piles de l'adversaire : même couleur, valeur ±1", () => {
    const e = cr.nouvelle(graine(4));
    e.cotes[1].reserve = [c(10, 'coeur'), c(5, 'carreau')];
    e.cotes[1].defausse = [c(6, 'pique')];
    e.cotes[0].reserve = [c(4, 'carreau'), c(7, 'pique'), c(9, 'coeur')];
    expect(cr.peutJouer(e, 0, { t: 'reserve' }, { t: 'adverse', pile: 'reserve' })).toBe(false); // 9♥ sur 5♦
    e.cotes[0].reserve = [c(9, 'coeur'), c(4, 'carreau')];
    expect(cr.peutJouer(e, 0, { t: 'reserve' }, { t: 'adverse', pile: 'reserve' })).toBe(true); // 4♦ sur 5♦
    e.cotes[0].defausse = [c(7, 'pique')];
    expect(cr.jouer(e, 0, { t: 'defausse' }, { t: 'adverse', pile: 'defausse' })).toBe(true); // 7♠ sur 6♠
    expect(e.cotes[1].defausse).toHaveLength(2);
  });

  it('fin du tour : il faut avoir tiré ; gagnant = réserve vide', () => {
    const e = cr.nouvelle(graine(5));
    expect(cr.finDuTour(e, 0)).toBe(false);
    expect(cr.tirer(e, 0)).toBe(true);
    expect(cr.tirer(e, 0)).toBe(false);
    expect(cr.finDuTour(e, 0)).toBe(true);
    expect(e.tour).toBe(1);
    e.cotes[1].reserve = [c(1, 'coeur')];
    e.colonnes[0] = [];
    expect(cr.jouer(e, 1, { t: 'reserve' }, { t: 'fondation' })).toBe(true);
    expect(e.fini).toBe(true);
    expect(e.gagnant).toBe(1);
  });

  it('parties ordi contre ordi : cartes conservées, partie qui se termine', () => {
    for (const niveau of ['facile', 'moyen', 'difficile'] as const) {
      for (let s = 1; s <= 4; s++) {
        const rng = graine(s * 13);
        const e = cr.nouvelle(rng);
        let tours = 0;
        while (!e.fini && tours < 700) {
          cr.tourOrdi(e, e.tour, niveau, rng);
          expect(total(e)).toBe(104);
          tours++;
        }
        expect(e.fini).toBe(true);
      }
    }
  });
});

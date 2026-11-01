import { describe, expect, it } from 'vitest';
import { OBJECTIF, garder, lancer, nomsParDefaut, nouvelle, nettoyerNoms, valide } from '../src/games/cochon/logique';

/** rng donnant la face voulue (1 à 6). */
const face = (d: number) => () => (d - 1) / 6 + 0.01;

describe('Cochon', () => {
  it('noms par défaut et nettoyage', () => {
    expect(nomsParDefaut(3)).toEqual(['Joueur 1', 'Joueur 2', 'Joueur 3']);
    expect(nettoyerNoms(['  ', ' Zoé '])).toEqual(['Joueur 1', 'Zoé']);
  });
  it('refuse un nombre de joueurs invalide', () => {
    expect(() => nouvelle(['a'])).toThrow();
    expect(() => nouvelle(nomsParDefaut(5))).toThrow();
  });
  it('cumule les dés 2 à 6', () => {
    const e = nouvelle(nomsParDefaut(2));
    expect(lancer(e, face(4))).toBe(4);
    lancer(e, face(6));
    expect(e.cumul).toBe(10);
    expect(e.courant).toBe(0);
  });
  it('un 1 perd le cumul et passe la main', () => {
    const e = nouvelle(nomsParDefaut(3));
    lancer(e, face(5));
    lancer(e, face(1));
    expect(e.cumul).toBe(0);
    expect(e.scores[0]).toBe(0);
    expect(e.courant).toBe(1);
  });
  it('garder banque et passe la main, rien à garder = sans effet', () => {
    const e = nouvelle(nomsParDefaut(2));
    garder(e);
    expect(e.courant).toBe(0);
    lancer(e, face(6));
    garder(e);
    expect(e.scores[0]).toBe(6);
    expect(e.courant).toBe(1);
    expect(e.cumul).toBe(0);
  });
  it('premier à 100 gagne', () => {
    const e = nouvelle(nomsParDefaut(2));
    e.scores[0] = OBJECTIF - 6;
    lancer(e, face(6));
    garder(e);
    expect(e.fini).toBe(true);
    expect(e.gagnant).toBe(0);
    lancer(e, face(3));
    expect(e.scores[0]).toBe(OBJECTIF);
  });
  it('valide la sauvegarde', () => {
    const e = nouvelle(nomsParDefaut(2));
    expect(valide(JSON.parse(JSON.stringify(e)))).toBe(true);
    expect(valide({ ...e, courant: 5 })).toBe(false);
    expect(valide(null)).toBe(false);
  });
});

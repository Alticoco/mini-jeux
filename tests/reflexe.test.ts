import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import { DELAI_MAX, DELAI_MIN, OBJECTIF, appui, delaiAleatoire, gagnantManche, joueurPourTouche, lancerManche, nouvelle, passerAuVert } from '../src/games/reflexe/logique';

describe('Réflexe', () => {
  it('délai aléatoire dans les bornes', () => {
    const r = graine(7);
    for (let i = 0; i < 200; i++) {
      const d = delaiAleatoire(r);
      expect(d).toBeGreaterThanOrEqual(DELAI_MIN);
      expect(d).toBeLessThanOrEqual(DELAI_MAX);
    }
  });
  it('touches distinctes, limitées au nombre de joueurs', () => {
    expect(joueurPourTouche('A', 2)).toBe(0);
    expect(joueurPourTouche('p', 2)).toBe(1);
    expect(joueurPourTouche('ArrowLeft', 2)).toBe(-1);
    expect(joueurPourTouche('ArrowRight', 4)).toBe(3);
    expect(joueurPourTouche('x', 4)).toBe(-1);
  });
  it('appui à vide sans effet', () => {
    const e = nouvelle(2);
    expect(appui(e, 0, 100)).toBeNull();
    expect(e.scores).toEqual([0, 0]);
  });
  it('faux départ : point perdu (min 0), manche arrêtée', () => {
    const e = nouvelle(2);
    e.scores[1] = 2;
    lancerManche(e);
    expect(appui(e, 1, 50)?.type).toBe('faux');
    expect(e.scores).toEqual([0, 1]);
    expect(e.phase).toBe('repos');
    lancerManche(e);
    appui(e, 0, 60);
    expect(e.scores[0]).toBe(0);
  });
  it('le premier appui au vert marque, le second est ignoré', () => {
    const e = nouvelle(3);
    lancerManche(e);
    passerAuVert(e, 1000);
    const r = appui(e, 2, 1230);
    expect(r).toEqual({ type: 'point', joueur: 2, ms: 230 });
    expect(appui(e, 0, 1240)).toBeNull();
    expect(e.scores).toEqual([0, 0, 1]);
  });
  it('premier à 5 gagne', () => {
    const e = nouvelle(2);
    e.scores[0] = OBJECTIF - 1;
    lancerManche(e);
    passerAuVert(e, 0);
    appui(e, 0, 200);
    expect(e.fini).toBe(true);
    expect(e.gagnant).toBe(0);
  });
  it('gagnantManche : plus rapide après le vert', () => {
    expect(gagnantManche(1000, [{ joueur: 0, t: 1300 }, { joueur: 1, t: 1250 }])).toEqual({ joueur: 1, ms: 250 });
    expect(gagnantManche(1000, [{ joueur: 0, t: 900 }])).toBeNull();
  });
  it('nombre de joueurs invalide', () => {
    expect(() => nouvelle(1)).toThrow();
    expect(() => nouvelle(5)).toThrow();
  });
});

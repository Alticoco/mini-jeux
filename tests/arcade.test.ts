import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import * as p4 from '../src/games/puissance4/logique';
import * as snake from '../src/games/snake/logique';
import * as dem from '../src/games/demineur/logique';
import * as g2048 from '../src/games/g2048/logique';
import * as taq from '../src/games/taquin/logique';

describe('puissance 4', () => {
  it('détecte les alignements', () => {
    const g = p4.grilleVide();
    for (let c = 0; c < 4; c++) p4.poser(g, c, 1);
    expect(p4.gagnant(g)?.joueur).toBe(1);
    const v = p4.grilleVide();
    for (let i = 0; i < 4; i++) p4.poser(v, 2, 2);
    expect(p4.gagnant(v)?.joueur).toBe(2);
    const d = p4.grilleVide();
    p4.poser(d, 0, 1);
    p4.poser(d, 1, 2); p4.poser(d, 1, 1);
    p4.poser(d, 2, 2); p4.poser(d, 2, 2); p4.poser(d, 2, 1);
    p4.poser(d, 3, 2); p4.poser(d, 3, 2); p4.poser(d, 3, 2); p4.poser(d, 3, 1);
    expect(p4.gagnant(d)?.joueur).toBe(1);
  });
  it('colonne pleine refusée', () => {
    const g = p4.grilleVide();
    for (let i = 0; i < 6; i++) expect(p4.poser(g, 0, 1)).toBeGreaterThanOrEqual(0);
    expect(p4.poser(g, 0, 1)).toBe(-1);
  });
  it("l'ordi gagne en un coup et bloque", () => {
    const g = p4.grilleVide();
    p4.poser(g, 0, 2); p4.poser(g, 1, 2); p4.poser(g, 2, 2);
    expect(p4.coupOrdi(g, 2, 'moyen')).toBe(3);
    const h = p4.grilleVide();
    p4.poser(h, 0, 1); p4.poser(h, 1, 1); p4.poser(h, 2, 1);
    expect(p4.coupOrdi(h, 2, 'difficile')).toBe(3);
  });
});

describe('snake', () => {
  it('avance, mange, meurt contre un mur', () => {
    let e = snake.nouveau(10, 10, graine(1));
    const tete = e.serpent[0]!;
    e = { ...e, nourriture: { x: tete.x + 1, y: tete.y } };
    e = snake.pas(e, 'droite', graine(2));
    expect(e.score).toBe(1);
    expect(e.serpent).toHaveLength(4);
    for (let i = 0; i < 20; i++) e = snake.pas(e, 'droite', graine(3));
    expect(e.vivant).toBe(false);
  });
  it('ne fait pas demi-tour', () => {
    const e = snake.nouveau(10, 10, graine(1));
    expect(snake.pas(e, 'gauche').dir).toBe('droite');
  });
});

describe('démineur', () => {
  it('premier clic sûr et nombre de mines correct', () => {
    for (let s = 1; s < 30; s++) {
      const p = dem.creer(9, 9, 10);
      expect(dem.ouvrir(p, 40, graine(s))).toBe(true);
      expect(p.cases.filter((c) => c.mine)).toHaveLength(10);
      expect(p.cases[40]!.mine).toBe(false);
    }
  });
  it('victoire quand toutes les cases sûres sont ouvertes', () => {
    const p = dem.creer(5, 5, 3);
    dem.ouvrir(p, 12, graine(5));
    p.cases.forEach((c, i) => { if (!c.mine) dem.ouvrir(p, i); });
    expect(dem.gagne(p)).toBe(true);
  });
  it('mine = défaite', () => {
    const p = dem.creer(5, 5, 3);
    dem.ouvrir(p, 12, graine(5));
    const m = p.cases.findIndex((c) => c.mine);
    expect(dem.ouvrir(p, m)).toBe(false);
    expect(p.perdu).toBe(true);
  });
});

describe('2048', () => {
  it('fusionne correctement', () => {
    expect(g2048.glisserLigne([2, 2, 2, 2])).toEqual({ ligne: [4, 4, 0, 0], gain: 8 });
    expect(g2048.glisserLigne([2, 2, 4, 0])).toEqual({ ligne: [4, 4, 0, 0], gain: 4 });
    expect(g2048.glisserLigne([0, 2, 0, 2])).toEqual({ ligne: [4, 0, 0, 0], gain: 4 });
    expect(g2048.glisserLigne([4, 2, 2, 4]).ligne).toEqual([4, 4, 4, 0]);
  });
  it('déplace dans les 4 directions', () => {
    const g = Array(16).fill(0);
    g[5] = 2;
    expect(g2048.deplacer(g, 'gauche').grille[4]).toBe(2);
    expect(g2048.deplacer(g, 'droite').grille[7]).toBe(2);
    expect(g2048.deplacer(g, 'haut').grille[1]).toBe(2);
    expect(g2048.deplacer(g, 'bas').grille[13]).toBe(2);
  });
  it('détecte la fin de partie', () => {
    const g = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
    expect(g2048.peutBouger(g)).toBe(false);
    expect(g2048.peutBouger([...g.slice(0, 15), 0])).toBe(true);
  });
});

describe('taquin', () => {
  it('mélange soluble et non résolu', () => {
    for (let n = 3; n <= 5; n++) {
      const t = taq.melanger(n, graine(n));
      expect(taq.estResolu(t)).toBe(false);
      expect([...t].sort((a, b) => a - b)).toEqual(taq.resolu(n).sort((a, b) => a - b));
    }
  });
  it('déplace plusieurs tuiles', () => {
    const t = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    expect(taq.cliquer(t, 3, 0)).toBe(0); // pas alignée avec la case vide
    expect(taq.cliquer(t, 3, 8)).toBe(0); // la case vide elle-même
    const u = [1, 2, 3, 4, 5, 6, 0, 7, 8];
    expect(taq.cliquer(u, 3, 8)).toBe(2);
    expect(u).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(taq.estResolu(u)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import * as bin from '../src/games/binairo/logique';
import * as pic from '../src/games/picross/logique';
import * as sok from '../src/games/sokoban/logique';
import * as mm from '../src/games/motsmeles/logique';
import * as mo from '../src/games/motus/logique';
import dico from '../assets/dictionnaire-fr.json';

describe('binairo', () => {
  it('génère des puzzles à solution unique', () => {
    for (const [n, garde] of [[6, 0.55], [8, 0.42], [10, 0.34]] as const) {
      const { puzzle, solution } = bin.generer(n, garde, graine(n));
      expect(bin.resolue(solution, n)).toBe(true);
      expect(bin.compter([...puzzle], n)).toBe(1);
      puzzle.forEach((v, i) => v && expect(v).toBe(solution[i]));
    }
  });
  it('détecte trois à la suite', () => {
    const g = Array<number>(36).fill(0);
    g[0] = g[1] = g[2] = 1;
    expect([...bin.conflits(g, 6)].sort()).toEqual([0, 1, 2]);
    expect(bin.peutPlacer(g, 6, 3, 2)).toBe(true);
    expect(bin.peutPlacer(g, 6, 3, 1)).toBe(false);
  });
});

describe('picross', () => {
  it('indices et victoire', () => {
    expect(pic.indices([true, true, false, true])).toEqual([2, 1]);
    expect(pic.indices([false, false])).toEqual([0]);
    const motif = pic.genererMotif(5, 0.6, graine(2));
    const cl = pic.cluesLignes(motif, 5);
    const cc = pic.cluesColonnes(motif, 5);
    expect(pic.gagne(motif, 5, cl, cc)).toBe(true);
    const faux = [...motif];
    faux[0] = !faux[0];
    expect(pic.gagne(faux, 5, cl, cc)).toBe(false);
  });
});

describe('sokoban', () => {
  it('niveaux valides, non résolus et déterministes', () => {
    for (const num of [1, 2, 5, 12, 20, 40]) {
      const n = sok.genererNiveau(num);
      expect(sok.gagne(n, n.boites)).toBe(false);
      expect(n.boites).toHaveLength(Math.min(5, 1 + Math.floor((num - 1) / 3)));
      expect(n.boites.every((b) => !n.murs[b])).toBe(true);
      expect(n.murs[n.joueur]).toBe(false);
      expect(sok.genererNiveau(num).boites).toEqual(n.boites);
    }
  });
  it('pousse une caisse mais pas deux', () => {
    const murs = Array.from({ length: 15 }, (_, i) => i < 5 || i >= 10 || i % 5 === 0 || i % 5 === 4);
    const niv: sok.Niveau = { l: 5, h: 3, murs, objectifs: [8], boites: [7, 8], joueur: 6 };
    expect(sok.deplacer(niv, niv.boites, 6, 'droite')).toBeNull();
    const r = sok.deplacer(niv, [7], 6, 'droite')!;
    expect(r.pousse).toBe(true);
    expect(r.boites).toEqual([8]);
    expect(sok.gagne(niv, r.boites)).toBe(true);
    expect(sok.deplacer(niv, [8], 7, 'droite')).toBeNull();
  });
});

describe('mots mêlés', () => {
  it('place les mots et les retrouve', () => {
    for (const cfg of Object.values(mm.CONFIGS)) {
      const { grille, mots } = mm.genererGrille(dico, cfg, graine(9));
      expect(mots.length).toBe(cfg.nbMots);
      for (const m of mots) {
        expect(m.cases.map((c) => grille[c]).join('')).toBe(m.mot);
        const seg = mm.segment(cfg.n, m.cases[0]!, m.cases.at(-1)!)!;
        expect(seg).toEqual(m.cases);
        expect(mm.trouverMot(mots, [...seg].reverse())).toBe(m);
      }
    }
  });
  it('segments non alignés refusés', () => {
    expect(mm.segment(10, 0, 21)).toBeNull();
  });
});

describe('motus', () => {
  it('gère les doublons comme Wordle', () => {
    expect(mo.evaluer('ABCDE', 'ABCDE')).toEqual(['bien', 'bien', 'bien', 'bien', 'bien']);
    expect(mo.evaluer('LLAMA', 'ALLEE')).toEqual(['mal', 'bien', 'mal', 'absent', 'absent']);
    expect(mo.evaluer('été', 'ETE')).toEqual(['bien', 'bien', 'bien']);
    expect(mo.evaluer('EEEXX', 'ABEXY')).toEqual(['absent', 'absent', 'bien', 'bien', 'absent']);
  });
});

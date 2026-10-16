import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import { MOTS, estMot, peutConstruire } from '../src/shared/dictionnaire';
import * as bo from '../src/games/boggle/logique';
import * as an from '../src/games/anagrammes/logique';
import * as ml from '../src/games/motlong/logique';
import * as mc from '../src/games/motscroises/logique';
import banque from '../assets/grilles-mots-croises.json';

describe('dictionnaire', () => {
  it('contient des mots courants, sans accent', () => {
    expect(MOTS.length).toBeGreaterThan(1000);
    expect(estMot('maison')).toBe(true);
    expect(estMot('ZZZZ')).toBe(false);
    expect(MOTS.every((m) => /^[a-z]{3,12}$/.test(m))).toBe(true);
    expect(peutConstruire('chat', 'tachee')).toBe(true);
    expect(peutConstruire('chatt', 'tachee')).toBe(false);
  });
});

describe('boggle', () => {
  it('chemins dans la grille', () => {
    const g = 'CHAT.....'.padEnd(16, 'X').split('').map((c) => (c === '.' ? 'X' : c));
    expect(bo.existeChemin(g, 'chat')).toBe(true);
    expect(bo.existeChemin(g, 'tah')).toBe(true);
    expect(bo.existeChemin(g, 'chac')).toBe(false); // réutilise la même case
    expect(bo.existeChemin(g, 'cat')).toBe(false); // non voisin dans cet ordre (C-A non adjacents)
  });
  it('grille générée avec des mots', () => {
    const { grille, mots } = bo.genererGrille(20, graine(4));
    expect(grille).toHaveLength(16);
    expect(mots.size).toBeGreaterThanOrEqual(8);
    for (const m of mots) expect(bo.existeChemin(grille, m)).toBe(true);
    expect(bo.points('abc')).toBe(1);
    expect(bo.points('abcdefgh')).toBe(11);
  });
});

describe('anagrammes', () => {
  it('mélange, validation et solutions', () => {
    const m = an.melangerMot('maison', graine(1));
    expect(m).not.toBe('maison');
    expect(m.split('').sort().join('')).toBe('aimnos');
    expect(an.valider('maison', m)).toBe(true);
    expect(an.valider('maisonn', m)).toBe(false);
    expect(an.valider('zzzzzz', m)).toBe(false);
    expect(an.solutions(m)).toContain('maison');
    expect(an.tirerMots('moyen')).toHaveLength(an.MANCHES);
    expect(an.pointsManche(0, 0)).toBe(100);
    expect(an.pointsManche(4, 10)).toBe(10);
  });
});

describe('le mot le plus long', () => {
  it('tirage avec solution et évaluation', () => {
    for (let k = 0; k < 20; k++) {
      const t = ml.tirage(10, graine(k + 1));
      expect(t).toHaveLength(10);
      const meilleurs = ml.meilleursMots(t);
      expect(meilleurs[0]!.length).toBeGreaterThanOrEqual(6);
      expect(ml.evaluer(meilleurs[0]!, t).ok).toBe(true);
    }
    expect(ml.evaluer('zz', 'ABC').ok).toBe(false);
    expect(ml.evaluer('chat', 'CHATXXXXXX').points).toBe(16);
    expect(ml.evaluer('chaton', 'CHATXXXXXX').ok).toBe(false);
  });
});

describe('mots croisés', () => {
  it('toutes les grilles embarquées sont cohérentes', () => {
    const b = banque as unknown as mc.Banque;
    for (const niveau of ['facile', 'moyen', 'difficile'] as const) {
      expect(b[niveau].length).toBeGreaterThanOrEqual(30);
      for (const g of b[niveau]) {
        expect(g.grille).toHaveLength(g.n);
        expect(mc.grilleCoherente(g)).toBe(true);
        for (const m of g.mots) {
          expect(m.def.length).toBeGreaterThan(3);
          expect(mc.casesDuMot(m).map(([x, y]) => mc.lettre(g, x, y)).join('')).toBe(m.mot);
        }
      }
    }
  });
  it('saisie : fausses lettres et complétion', () => {
    const g = (banque as unknown as mc.Banque).facile[0]!;
    const saisie = Array<string>(g.n * g.n).fill('');
    expect(mc.complet(g, saisie)).toBe(false);
    for (let y = 0; y < g.n; y++) for (let x = 0; x < g.n; x++) if (!mc.estVide(g, x, y)) saisie[y * g.n + x] = mc.lettre(g, x, y);
    expect(mc.complet(g, saisie)).toBe(true);
    const m = g.mots[0]!;
    saisie[m.y * g.n + m.x] = m.mot[0] === 'Z' ? 'Y' : 'Z';
    expect(mc.fausses(g, saisie).size).toBe(1);
    expect(mc.motEn(g, m.x, m.y, m.dir)).toBe(m);
  });
});

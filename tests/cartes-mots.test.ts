import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import { paquet52 } from '../src/shared/cartes';
import * as bat from '../src/games/bataille/logique';
import * as kl from '../src/games/klondike/logique';
import * as pen from '../src/games/pendu/logique';
import * as sud from '../src/games/sudoku/logique';
import dico from '../assets/dictionnaire-fr.json';

describe('paquet', () => {
  it('52 cartes uniques', () => {
    const p = paquet52();
    expect(new Set(p.map((c) => `${c.couleur}${c.rang}`)).size).toBe(52);
  });
});

describe('bataille', () => {
  it('conserve 52 cartes et se termine', () => {
    for (let s = 1; s <= 5; s++) {
      const rng = graine(s);
      const e = bat.nouvelle(rng);
      while (!bat.fini(e)) {
        bat.jouerManche(e, rng);
        expect(e.joueur.length + e.ordi.length).toBe(52);
      }
      expect(bat.vainqueur(e)).not.toBeNull();
    }
  });
  it("l'as bat le roi et la bataille se règle", () => {
    const e: bat.EtatBataille = {
      joueur: [{ rang: 1, couleur: 'pique' }, { rang: 2, couleur: 'pique' }],
      ordi: [{ rang: 13, couleur: 'coeur' }, { rang: 3, couleur: 'coeur' }],
      manches: 0,
    };
    const r = bat.jouerManche(e)!;
    expect(r.gagnant).toBe('joueur');
    expect(e.joueur).toHaveLength(3);
    const f: bat.EtatBataille = {
      joueur: [{ rang: 5, couleur: 'pique' }, { rang: 2, couleur: 'pique' }, { rang: 9, couleur: 'pique' }],
      ordi: [{ rang: 5, couleur: 'coeur' }, { rang: 3, couleur: 'coeur' }, { rang: 4, couleur: 'coeur' }],
      manches: 0,
    };
    const rb = bat.jouerManche(f)!;
    expect(rb.batailles).toBe(1);
    expect(rb.gagnant).toBe('joueur');
    expect(rb.gain).toBe(6);
  });
});

describe('klondike', () => {
  it('distribution correcte', () => {
    const e = kl.nouvelle(3, graine(7));
    expect(e.colonnes.map((c) => c.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(e.pioche).toHaveLength(24);
    expect(e.colonnes.every((c) => c[c.length - 1]!.visible && c.slice(0, -1).every((k) => !k.visible))).toBe(true);
  });
  it('règles de déplacement', () => {
    const e = kl.nouvelle(1, graine(3));
    e.colonnes = [[{ rang: 7, couleur: 'pique', visible: true }], [{ rang: 6, couleur: 'coeur', visible: true }], [{ rang: 6, couleur: 'trefle', visible: true }], [], [], [], []];
    expect(kl.peutDeplacer(e, { type: 'colonne', col: 1, index: 0 }, { type: 'colonne', col: 0 })).toBe(true);
    expect(kl.peutDeplacer(e, { type: 'colonne', col: 2, index: 0 }, { type: 'colonne', col: 0 })).toBe(false);
    expect(kl.peutDeplacer(e, { type: 'colonne', col: 0, index: 0 }, { type: 'colonne', col: 3 })).toBe(false); // seul un roi va en colonne vide
    expect(kl.deplacer(e, { type: 'colonne', col: 1, index: 0 }, { type: 'colonne', col: 0 })).toBe(true);
    expect(e.colonnes[0]).toHaveLength(2);
  });
  it('fondations et retournement de carte', () => {
    const e = kl.nouvelle(1, graine(3));
    e.colonnes = [[{ rang: 5, couleur: 'carreau', visible: false }, { rang: 1, couleur: 'pique', visible: true }], [], [], [], [], [], []];
    expect(kl.deplacer(e, { type: 'colonne', col: 0, index: 1 }, { type: 'fondation' })).toBe(true);
    expect(e.colonnes[0]![0]!.visible).toBe(true);
    expect(e.fondations[0]).toHaveLength(1);
    expect(e.score).toBe(15);
  });
  it('pioche : tirage puis recyclage', () => {
    const e = kl.nouvelle(3, graine(3));
    kl.tirer(e);
    expect(e.defausse).toHaveLength(3);
    while (e.pioche.length) kl.tirer(e);
    expect(kl.tirer(e)).toBe(true);
    expect(e.pioche).toHaveLength(24);
    expect(e.defausse).toHaveLength(0);
  });
  it('fin automatique', () => {
    const e = kl.nouvelle(1, graine(3));
    e.pioche = []; e.defausse = []; e.fondations = [[], [], [], []];
    e.colonnes = [[], [], [], [], [], [], []];
    const cartes = paquet52();
    // 4 colonnes triées du roi à l'as, une par couleur
    ['pique', 'coeur', 'carreau', 'trefle'].forEach((couleur, i) => {
      e.colonnes[i] = cartes.filter((c) => c.couleur === couleur).reverse().map((c) => ({ ...c, visible: true }));
    });
    expect(kl.terminable(e)).toBe(true);
    let n = 0;
    while (kl.pasAuto(e)) n++;
    expect(n).toBe(52);
    expect(kl.gagne(e)).toBe(true);
  });
});

describe('pendu', () => {
  it('gère les accents', () => {
    let e = pen.nouvelle('été', 'moyen');
    e = pen.proposer(e, 'E');
    expect(pen.motAffiche(e).join('')).toBe('é_é');
    e = pen.proposer(e, 't');
    expect(pen.gagne(e)).toBe(true);
  });
  it('perd après trop d\'erreurs', () => {
    let e = pen.nouvelle('chat', 'difficile');
    for (const l of 'zxqwvb') e = pen.proposer(e, l);
    expect(pen.perdu(e)).toBe(true);
  });
  it('dictionnaire valide', () => {
    expect(dico.length).toBeGreaterThan(300);
    for (const n of ['facile', 'moyen', 'difficile'] as const) expect(pen.choisirMot(dico, n).length).toBeGreaterThan(3);
  });
});

describe('sudoku', () => {
  it('génère une grille à solution unique, cohérente', () => {
    for (const niveau of sud.NIVEAUX_SUDOKU) {
      const t = performance.now();
      const { puzzle, solution } = sud.generer(niveau, graine(11));
      expect(sud.compterSolutions([...puzzle])).toBe(1);
      expect(sud.conflits(solution).size).toBe(0);
      expect(solution.every((v) => v >= 1 && v <= 9)).toBe(true);
      puzzle.forEach((v, i) => v && expect(v).toBe(solution[i]));
      const indices = puzzle.filter(Boolean).length;
      expect(indices).toBeGreaterThanOrEqual(sud.INDICES[niveau]);
      expect(indices).toBeLessThanOrEqual(sud.INDICES[niveau] + 6);
      expect(performance.now() - t).toBeLessThan(5000);
    }
  });
  it('détecte les conflits', () => {
    const g = Array(81).fill(0);
    g[0] = 5; g[1] = 5;
    expect([...sud.conflits(g)].sort()).toEqual([0, 1]);
  });
});

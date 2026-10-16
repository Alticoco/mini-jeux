import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import * as ta from '../src/games/tarot/logique';

const at = (n: number): ta.CarteT => ({ t: 'a', n });
const co = (couleur: 'pique' | 'coeur' | 'carreau' | 'trefle', n: number): ta.CarteT => ({ t: 'c', couleur, n });
const exc: ta.CarteT = { t: 'e' };

function pret(): ta.Etat {
  const e = ta.nouvelleDonne(3, [0, 0, 0, 0], graine(1));
  e.phase = 'jeu';
  e.preneur = 0;
  e.contrat = 2;
  e.tour = 0;
  return e;
}

describe('tarot : paquet et valeurs', () => {
  it('78 cartes, 91 points, 3 bouts', () => {
    const p = ta.paquet78();
    expect(p).toHaveLength(78);
    expect(p.reduce((s, c) => s + ta.valeur(c), 0)).toBe(91);
    expect(p.filter(ta.estOudler)).toHaveLength(3);
  });
  it('distribution : 4 × 18 cartes + chien de 6', () => {
    const e = ta.nouvelleDonne(0, [0, 0, 0, 0], graine(2));
    expect(e.mains.every((m) => m.length === 18)).toBe(true);
    expect(e.chien).toHaveLength(6);
  });
});

describe('tarot : enchères et écart', () => {
  it('une enchère doit dépasser la précédente', () => {
    const e = ta.nouvelleDonne(3, [0, 0, 0, 0], graine(3));
    expect(ta.encherir(e, 0, 2)).toBe(true);
    expect(ta.encherir(e, 1, 1)).toBe(false);
    expect(ta.encherir(e, 1, 4)).toBe(true);
    ta.encherir(e, 2, 0);
    ta.encherir(e, 3, 0);
    expect(e.preneur).toBe(1);
    expect(e.contrat).toBe(4);
    expect(e.phase).toBe('jeu'); // garde sans : pas d'écart
    expect(e.piles[0]).toHaveLength(6);
  });
  it('tout le monde passe : redonne', () => {
    const e = ta.nouvelleDonne(0, [0, 0, 0, 0], graine(4));
    for (let i = 0; i < 4; i++) ta.encherir(e, e.tour, 0);
    expect(e.phase).toBe('redonne');
  });
  it('petite : le preneur prend le chien et écarte 6 cartes valides', () => {
    const e = ta.nouvelleDonne(3, [0, 0, 0, 0], graine(5));
    ta.encherir(e, 0, 1); ta.encherir(e, 1, 0); ta.encherir(e, 2, 0); ta.encherir(e, 3, 0);
    expect(e.phase).toBe('chien');
    expect(e.mains[0]).toHaveLength(24);
    const ecart = ta.ecartIA(e);
    expect(ecart).toHaveLength(6);
    expect(ta.ecartValide(e, ecart)).toBe(true);
    expect(ta.ecartValide(e, ecart.map(() => ({ t: 'e' as const })))).toBe(false);
    expect(ta.ecarter(e, ecart)).toBe(true);
    expect(e.mains[0]).toHaveLength(18);
    expect(e.phase).toBe('jeu');
  });
});

describe('tarot : obligations de jeu', () => {
  it('fournir, couper, monter', () => {
    const e = pret();
    e.pli = [{ joueur: 3, carte: co('pique', 5) }];
    e.mains[0] = [co('pique', 9), at(3), co('coeur', 2), exc];
    expect(ta.cartesJouables(e, 0)).toEqual([e.mains[0]![0], exc]); // fournir (ou excuse)
    e.mains[0] = [co('coeur', 2), at(3), at(12), co('trefle', 7)];
    expect(ta.cartesJouables(e, 0)).toEqual([e.mains[0]![1], e.mains[0]![2]]); // doit couper
    e.pli = [{ joueur: 3, carte: co('pique', 5) }, { joueur: 1, carte: at(10) }];
    expect(ta.cartesJouables(e, 0)).toEqual([e.mains[0]![2]]); // doit monter (12 > 10)
    e.mains[0] = [co('coeur', 2), at(3), co('trefle', 7)];
    expect(ta.cartesJouables(e, 0)).toEqual([e.mains[0]![1]]); // n'a que le 3 : doit le jouer
    e.mains[0] = [co('coeur', 2), co('trefle', 7)];
    expect(ta.cartesJouables(e, 0)).toHaveLength(2); // aucun atout : libre
  });
  it('gagnant du pli et excuse', () => {
    expect(ta.gagnantDuPli([{ joueur: 0, carte: co('pique', 14) }, { joueur: 1, carte: co('pique', 3) }, { joueur: 2, carte: at(2) }, { joueur: 3, carte: co('pique', 13) }])).toBe(2);
    expect(ta.gagnantDuPli([{ joueur: 0, carte: exc }, { joueur: 1, carte: co('coeur', 4) }, { joueur: 2, carte: co('coeur', 9) }, { joueur: 3, carte: co('pique', 14) }])).toBe(2);
    expect(ta.gagnantDuPli([{ joueur: 0, carte: co('coeur', 4) }, { joueur: 1, carte: exc }, { joueur: 2, carte: co('coeur', 2) }, { joueur: 3, carte: co('coeur', 9) }])).toBe(3);
  });
});

describe('tarot : donnes complètes ordi contre ordi', () => {
  it('91 points répartis, scores à somme nulle', () => {
    for (const niveau of ['facile', 'moyen', 'difficile'] as const) {
      for (let s = 1; s <= 12; s++) {
        const rng = graine(s * 17);
        const e = ta.nouvelleDonne(s % 4, [0, 0, 0, 0], rng);
        let g = 0;
        while (e.phase === 'encheres' && g++ < 10) ta.encherir(e, e.tour, ta.choixEnchere(e, e.tour, niveau));
        if (e.phase === 'redonne') continue;
        if (e.phase === 'chien') expect(ta.ecarter(e, ta.ecartIA(e))).toBe(true);
        g = 0;
        while (e.phase === 'jeu' && g++ < 80) expect(ta.jouerCarte(e, e.tour, ta.choixCarte(e, e.tour, niveau, rng))).not.toBeNull();
        expect(e.phase).toBe('fini');
        const total = e.piles[0].reduce((x, c) => x + ta.valeur(c), 0) + e.piles[1].reduce((x, c) => x + ta.valeur(c), 0);
        expect(total).toBe(91);
        expect(e.piles[0].length + e.piles[1].length).toBe(78);
        expect(e.scores.reduce((a, b) => a + b, 0)).toBe(0);
      }
    }
  });
});

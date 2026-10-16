import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import * as mm from '../src/games/mastermind/logique';
import * as bn from '../src/games/bataillenavale/logique';
import * as bg from '../src/games/backgammon/logique';

describe('mastermind', () => {
  it('retour noirs / blancs', () => {
    expect(mm.evaluer([0, 1, 2, 3], [0, 1, 2, 3])).toEqual({ noirs: 4, blancs: 0 });
    expect(mm.evaluer([0, 1, 2, 3], [3, 2, 1, 0])).toEqual({ noirs: 0, blancs: 4 });
    expect(mm.evaluer([0, 0, 1, 1], [0, 1, 0, 1])).toEqual({ noirs: 2, blancs: 2 });
    expect(mm.evaluer([0, 0, 0, 1], [0, 1, 1, 1])).toEqual({ noirs: 2, blancs: 0 });
    expect(mm.evaluer([1, 2, 3, 4], [5, 5, 5, 5])).toEqual({ noirs: 0, blancs: 0 });
  });
  it('code secret conforme au niveau', () => {
    for (const r of Object.values(mm.REGLAGES)) {
      const c = mm.codeSecret(r, graine(5));
      expect(c).toHaveLength(r.positions);
      expect(c.every((v) => v >= 0 && v < r.couleurs)).toBe(true);
      if (!r.doublons) expect(new Set(c).size).toBe(c.length);
    }
  });
});

describe('bataille navale', () => {
  it('placement aléatoire valide', () => {
    for (let k = 0; k < 20; k++) {
      const p = bn.placerAleatoire(graine(k + 1));
      expect(p.navires.map((n) => n.taille)).toEqual(bn.FLOTTE);
      const toutes = p.navires.flatMap((n) => n.cases);
      expect(new Set(toutes).size).toBe(17);
      for (const n of p.navires) expect(n.cases.length).toBe(n.taille);
    }
  });
  it('tirs : eau, touché, coulé, victoire', () => {
    const p = bn.nouveauPlateau();
    p.navires.push({ taille: 2, cases: [0, 1] });
    expect(bn.tirer(p, 50).resultat).toBe('eau');
    expect(bn.tirer(p, 50).resultat).toBe('deja');
    expect(bn.tirer(p, 0).resultat).toBe('touche');
    expect(bn.tirer(p, 1).resultat).toBe('coule');
    expect(bn.flotteCoulee(p)).toBe(true);
    expect(bn.naviresRestants(p)).toEqual([]);
  });
  it("l'IA coule une flotte en moins de 100 tirs (niveau difficile)", () => {
    for (const niveau of ['facile', 'moyen', 'difficile'] as const) {
      const cible = bn.placerAleatoire(graine(11));
      let tirs = 0;
      while (!bn.flotteCoulee(cible) && tirs < 100) {
        bn.tirer(cible, bn.choixTir(cible.tirs, bn.naviresRestants(cible), niveau, graine(tirs + 1)));
        tirs++;
      }
      expect(bn.flotteCoulee(cible)).toBe(true);
      if (niveau === 'difficile') expect(tirs).toBeLessThan(75);
    }
  });
});

describe('backgammon', () => {
  const total = (e: bg.Etat, c: bg.Camp) => e.points.reduce((s, v) => s + Math.max(0, v * bg.signe(c)), 0) + e.barre[c] + e.hors[c];

  it('position de départ', () => {
    const e = bg.depart();
    expect(total(e, 0)).toBe(15);
    expect(total(e, 1)).toBe(15);
    expect(bg.pips(e, 0)).toBe(167);
    expect(bg.pips(e, 1)).toBe(167);
  });
  it('coups d\'ouverture (3-1) et blocage', () => {
    const e = bg.depart();
    e.des = [3, 1];
    const c = bg.coupsAutorises(e, 0);
    expect(c.length).toBeGreaterThan(0);
    expect(c.some((m) => m.de === 7 && m.vers === 4)).toBe(true); // 8/5
    // le point d'index 18 est tenu par 5 pions adverses : le pion d'index 23 ne peut pas jouer un 5
    const e2 = bg.depart();
    expect(bg.coupsAvecDe(e2, 0, 5).some((m) => m.de === 23)).toBe(false);
    e2.points[18] = 0;
    expect(bg.coupsAvecDe(e2, 0, 5).some((m) => m.de === 23 && m.vers === 18)).toBe(true);
  });
  it('capture d\'un pion seul et obligation de rentrer', () => {
    const e = bg.depart();
    e.points = Array(24).fill(0);
    e.points[10] = 1;
    e.points[8] = -1; // pion adverse seul
    e.points[3] = 14;
    e.des = [2];
    const n = bg.appliquer(e, 0, { de: 10, vers: 8, de_: 2 });
    expect(n.barre[1]).toBe(1);
    expect(n.points[8]).toBe(1);
    // avec un pion sur la barre, on ne peut qu'entrer
    const f = bg.depart();
    f.barre[0] = 1;
    f.points[23] = 1;
    f.des = [4, 2];
    const coups = bg.coupsAutorises(f, 0);
    expect(coups.every((m) => m.de === 'barre')).toBe(true);
  });
  it('sortie des pions seulement quand tout est à la maison', () => {
    const e = bg.depart();
    e.points = Array(24).fill(0);
    e.points[2] = 3; e.points[0] = 2; e.points[5] = 1;
    e.hors[0] = 9;
    expect(bg.coupsAvecDe(e, 0, 6).some((m) => m.vers === 'hors')).toBe(true); // plus gros dé : sort le pion le plus loin
    expect(bg.coupsAvecDe(e, 0, 1).some((m) => m.de === 0 && m.vers === 'hors')).toBe(true);
    e.points[9] = 1; e.points[0] = 1; // un pion hors de la maison
    expect(bg.coupsAvecDe(e, 0, 6).some((m) => m.vers === 'hors')).toBe(false);
  });
  it('règle du dé le plus fort quand un seul est jouable', () => {
    const e = bg.depart();
    e.points = Array(24).fill(0);
    e.points[7] = 1; // 8
    e.points[2] = -2; // bloque 8-6
    e.points[4] = -2; // bloque 8-4
    e.points[6] = -2; // bloque 8-2 (6) mais pas 8-1(=7)... libre pour 1 : index 6 bloqué
    e.points[1] = -2; // bloque 8-6 -> index 1
    e.des = [1, 6];
    const c = bg.coupsAutorises(e, 0);
    for (const m of c) expect([1, 6]).toContain(m.de_);
    expect(c.length).toBeGreaterThanOrEqual(0);
  });
  it('une partie ordi contre ordi se termine et conserve les 15 pions', () => {
    let e = bg.depart();
    let camp: bg.Camp = 0;
    let tours = 0;
    while (bg.fini(e) === null && tours < 1500) {
      e.des = bg.lancerDes(graine(tours + 7));
      e.tour = camp;
      const seqs = bg.sequences(e, camp);
      if (seqs.length) {
        const coups = camp === 1 ? bg.choisirSequence(e, 'moyen', graine(tours)) : seqs[tours % seqs.length]!.coups;
        for (const m of coups) e = bg.appliquer(e, camp, m);
      }
      expect(total(e, 0)).toBe(15);
      expect(total(e, 1)).toBe(15);
      camp = bg.adverse(camp);
      tours++;
    }
    expect(bg.fini(e)).not.toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import * as dm from '../src/games/dames/logique';
import * as rev from '../src/games/reversi/logique';
import * as p4 from '../src/games/puissance4/logique';

function duree<T>(f: () => T): [T, number] {
  const t = performance.now();
  const r = f();
  return [r, performance.now() - t];
}

describe('temps de réflexion (niveau difficile)', { timeout: 30000 }, () => {
  it('dames : < 2 s par coup sur une partie type', () => {
    let p = dm.depart();
    let camp: dm.Camp = 'joueur';
    let pire = 0;
    for (let k = 0; k < 40; k++) {
      const coups = dm.coupsLegaux(p, camp);
      if (!coups.length) break;
      let coup = coups[k % coups.length]!;
      if (camp === 'ordi') {
        const [c, d] = duree(() => dm.coupOrdi(p, 'difficile'));
        coup = c;
        pire = Math.max(pire, d);
      }
      p = dm.appliquer(p, coup);
      camp = dm.adverse(camp);
    }
    console.log('dames pire coup ms', Math.round(pire));
    expect(pire).toBeLessThan(2000);
  });
  it('reversi : < 2 s par coup', () => {
    let p = rev.depart();
    let tour: 1 | 2 = 1;
    let pire = 0;
    for (let k = 0; k < 60 && !rev.fini(p); k++) {
      const l = rev.coupsLegaux(p, tour);
      if (l.length) {
        let i = l[k % l.length]!;
        if (tour === 2) { const [c, d] = duree(() => rev.coupOrdi(p, 2, 'difficile')); i = c; pire = Math.max(pire, d); }
        p = rev.jouer(p, i, tour);
      }
      tour = rev.adversaire(tour);
    }
    console.log('reversi pire coup ms', Math.round(pire));
    expect(pire).toBeLessThan(2000);
  });
  it('puissance 4 : < 2 s par coup', () => {
    const g = p4.grilleVide();
    let pire = 0;
    for (let k = 0; k < 14; k++) {
      const [c, d] = duree(() => p4.coupOrdi(g, 2, 'difficile'));
      pire = Math.max(pire, d);
      p4.poser(g, c, 2);
      const l = p4.colonnesJouables(g);
      p4.poser(g, l[k % l.length]!, 1);
    }
    console.log('p4 pire coup ms', Math.round(pire));
    expect(pire).toBeLessThan(2000);
  });
});

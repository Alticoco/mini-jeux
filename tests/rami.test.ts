import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import type { Carte } from '../src/shared/cartes';
import * as ra from '../src/games/rami/logique';

const c = (rang: number, couleur: Carte['couleur']): Carte => ({ rang, couleur });
const joker: Carte = { rang: 0, couleur: 'pique' };

describe('rami : combinaisons', () => {
  it('brelans et carrés', () => {
    expect(ra.analyser([c(7, 'pique'), c(7, 'coeur'), c(7, 'trefle')])?.points).toBe(21);
    expect(ra.analyser([c(7, 'pique'), c(7, 'coeur'), c(7, 'trefle'), c(7, 'carreau')])?.type).toBe('brelan');
    expect(ra.analyser([c(7, 'pique'), c(7, 'pique'), c(7, 'trefle')])).toBeNull();
    expect(ra.analyser([c(7, 'pique'), c(8, 'coeur'), c(7, 'trefle')])).toBeNull();
    expect(ra.analyser([c(13, 'pique'), joker, c(13, 'trefle')])?.points).toBe(30);
    expect(ra.analyser([c(1, 'pique'), c(1, 'coeur'), c(1, 'trefle')])?.points).toBe(33);
  });
  it('suites, as bas et haut, jokers', () => {
    expect(ra.analyser([c(5, 'coeur'), c(6, 'coeur'), c(7, 'coeur')])?.points).toBe(18);
    expect(ra.analyser([c(7, 'coeur'), c(5, 'coeur'), c(6, 'coeur')])?.type).toBe('suite');
    expect(ra.analyser([c(1, 'coeur'), c(2, 'coeur'), c(3, 'coeur')])?.points).toBe(1 + 2 + 3);
    expect(ra.analyser([c(12, 'coeur'), c(13, 'coeur'), c(1, 'coeur')])?.points).toBe(10 + 10 + 11);
    expect(ra.analyser([c(13, 'coeur'), c(1, 'coeur'), c(2, 'coeur')])).toBeNull();
    expect(ra.analyser([c(5, 'coeur'), joker, c(7, 'coeur')])?.points).toBe(18);
    expect(ra.analyser([c(5, 'coeur'), c(6, 'pique'), c(7, 'coeur')])).toBeNull();
    expect(ra.analyser([c(5, 'coeur'), c(5, 'coeur'), c(6, 'coeur')])).toBeNull();
    expect(ra.analyser([c(5, 'coeur'), c(6, 'coeur')])).toBeNull();
    expect(ra.analyser([joker, joker, c(5, 'coeur')])).toBeNull();
  });
  it('compléter une combinaison', () => {
    const p: ra.Pose = { ...ra.analyser([c(5, 'coeur'), c(6, 'coeur'), c(7, 'coeur')])!, proprio: 0 };
    expect(ra.ajouter(p, c(8, 'coeur'))?.cartes).toHaveLength(4);
    expect(ra.ajouter(p, c(4, 'coeur'))?.cartes).toHaveLength(4);
    expect(ra.ajouter(p, c(9, 'coeur'))).toBeNull();
    const b: ra.Pose = { ...ra.analyser([c(9, 'pique'), c(9, 'coeur'), c(9, 'trefle')])!, proprio: 0 };
    expect(ra.ajouter(b, c(9, 'carreau'))?.cartes).toHaveLength(4);
    expect(ra.ajouter(b, c(9, 'pique'))).toBeNull();
  });
  it('meilleure pose : combinaisons disjointes de points maximum', () => {
    const main = [c(10, 'pique'), c(10, 'coeur'), c(10, 'trefle'), c(11, 'pique'), c(12, 'pique'), c(3, 'carreau'), c(9, 'pique')];
    const pose = ra.meilleurePose(main);
    const utilisees = pose.flatMap((x) => x.cartes);
    expect(new Set(utilisees).size).toBe(utilisees.length);
    expect(pose.reduce((s, x) => s + x.points, 0)).toBeGreaterThanOrEqual(30);
  });
});

describe('rami : tour de jeu', () => {
  it('ouverture à 51 points : trop faible, la pose est annulée', () => {
    const e = ra.nouvelle(graine(1));
    e.tour = 0;
    e.phase = 'jouer';
    e.mains[0] = [c(2, 'pique'), c(2, 'coeur'), c(2, 'trefle'), c(9, 'carreau'), c(1, 'trefle')];
    expect(ra.poser(e, 0, e.mains[0]!.slice(0, 3))).not.toBeNull();
    expect(e.mains[0]).toHaveLength(2);
    const res = ra.defausser(e, 0, e.mains[0]![1]!);
    expect(res).toBe('invalide');
    expect(e.poses).toHaveLength(0);
    expect(e.mains[0]).toHaveLength(4); // 5 cartes - 1 défaussée, les 3 posées sont revenues
    expect(e.tour).toBe(1);
  });
  it('ouverture réussie puis complément', () => {
    const e = ra.nouvelle(graine(2));
    e.tour = 0;
    e.phase = 'jouer';
    e.mains[0] = [c(13, 'pique'), c(13, 'coeur'), c(13, 'trefle'), c(12, 'pique'), c(12, 'coeur'), c(12, 'trefle'), c(5, 'carreau'), c(13, 'carreau'), c(2, 'coeur')];
    ra.poser(e, 0, e.mains[0]!.slice(0, 3));
    ra.poser(e, 0, e.mains[0]!.slice(0, 3));
    expect(e.provisoires.reduce((s, p) => s + p.points, 0)).toBe(60);
    const k = e.mains[0]!.find((x) => x.rang === 13)!;
    expect(ra.completer(e, 0, k, e.poses[0]!)).toBe(true);
    expect(ra.defausser(e, 0, e.mains[0]![0]!)).toBe('ok');
    expect(e.ouvert[0]).toBe(true);
    expect(e.tour).toBe(1);
  });
  it('parties complètes ordi contre ordi : 106 cartes conservées, fin de partie', () => {
    for (const niveau of ['facile', 'moyen', 'difficile'] as const) {
      for (let s = 1; s <= 6; s++) {
        const rng = graine(s * 5);
        const e = ra.nouvelle(rng);
        let tours = 0;
        while (!e.fini && tours < 300) {
          ra.tourOrdi(e, niveau, rng, e.tour);
          const total = e.talon.length + e.defausse.length + e.mains[0].length + e.mains[1].length + e.poses.reduce((x, p) => x + p.cartes.length, 0);
          expect(total).toBe(106);
          tours++;
        }
        expect(e.fini).toBe(true);
      }
    }
  });
});

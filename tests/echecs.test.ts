import { describe, expect, it } from 'vitest';
import * as ec from '../src/games/echecs/logique';

describe('échecs : génération des coups (perft)', () => {
  it('position de départ', () => {
    const e = ec.depart();
    expect(ec.perft(e, 1)).toBe(20);
    expect(ec.perft(e, 2)).toBe(400);
    expect(ec.perft(e, 3)).toBe(8902);
  });
  it('Kiwipete (roques, prises, clouages)', () => {
    const e = ec.depuisFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
    expect(ec.perft(e, 1)).toBe(48);
    expect(ec.perft(e, 2)).toBe(2039);
  });
  it('prise en passant et échecs découverts', () => {
    const e = ec.depuisFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
    expect(ec.perft(e, 1)).toBe(14);
    expect(ec.perft(e, 2)).toBe(191);
    expect(ec.perft(e, 3)).toBe(2812);
  });
  it('promotions', () => {
    const e = ec.depuisFen('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1');
    expect(ec.perft(e, 1)).toBe(6);
    expect(ec.perft(e, 2)).toBe(264);
  });
});

describe('échecs : fin de partie et IA', () => {
  it('mat du berger', () => {
    let e = ec.depart();
    for (const m of ['e2e4', 'e7e5', 'd1h5', 'b8c6', 'f1c4', 'g8f6', 'h5f7']) {
      const c = ec.coupsLegaux(e).find((x) => ec.notation(x) === m);
      expect(c, m).toBeTruthy();
      e = ec.jouer(e, c!);
    }
    expect(ec.finDePartie(e)).toBe('mat');
  });
  it('pat et matériel insuffisant', () => {
    expect(ec.finDePartie(ec.depuisFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toBe('pat');
    expect(ec.finDePartie(ec.depuisFen('8/8/4k3/8/8/3K4/8/8 w - - 0 1'))).toBe('materiel');
    expect(ec.finDePartie(ec.depuisFen('8/8/4k3/8/8/3K4/8/7R w - - 100 80'))).toBe('cinquante');
  });
  it("l'IA trouve un mat en 1 et joue un coup légal", () => {
    const e = ec.depuisFen('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1');
    const m = ec.meilleurCoup(e, 'moyen')!;
    expect(ec.notation(m)).toBe('d1d8');
    const d = ec.meilleurCoup(ec.depart(), 'difficile')!;
    expect(ec.coupsLegaux(ec.depart()).some((x) => ec.notation(x) === ec.notation(d))).toBe(true);
  });
  it("l'IA prend une pièce non défendue", () => {
    const e = ec.depuisFen('4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1');
    expect(ec.notation(ec.meilleurCoup(e, 'moyen')!)).toBe('d1d5');
  });
});

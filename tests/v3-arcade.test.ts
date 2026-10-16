import { describe, expect, it } from 'vitest';
import { graine } from '../src/shared/alea';
import * as pa from '../src/games/pacman/logique';
import * as inv from '../src/games/invaders/logique';
import * as fl from '../src/games/flappy/logique';

describe('pac-man', () => {
  it('labyrinthe cohérent : toutes les cases libres sont atteignables', () => {
    const g = pa.grilleDepart();
    expect(pa.PLAN.every((r) => r.length === pa.L)).toBe(true);
    const e = pa.nouvelle('moyen');
    const vu = new Set<string>([`${e.pac.x},${e.pac.y}`]);
    const file: Array<[number, number]> = [[e.pac.x, e.pac.y]];
    for (let k = 0; k < file.length; k++) {
      const [x, y] = file[k]!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = (x + dx + pa.L) % pa.L, ny = y + dy;
        if (!pa.mur(g, nx, ny) && !vu.has(`${nx},${ny}`)) { vu.add(`${nx},${ny}`); file.push([nx, ny]); }
      }
    }
    const libres = g.flatMap((r, y) => r.flatMap((c, x) => (c === '#' ? [] : [`${x},${y}`])));
    expect(libres.filter((c) => !vu.has(c))).toEqual([]);
    expect(pa.compter(g)).toBeGreaterThan(100);
    expect(pa.DIST_MAISON.every((d, i) => d >= 0 || pa.PLAN[Math.floor(i / pa.L)]![i % pa.L] === '#')).toBe(true);
  });
  it('mange des pastilles et perd des vies', () => {
    const e = pa.nouvelle('facile');
    const avant = e.restantes;
    pa.orienter(e, -1, 0);
    for (let k = 0; k < 120; k++) pa.avancer(e, 1 / 60, 'facile', graine(k + 1));
    expect(e.restantes).toBeLessThan(avant);
    expect(e.score).toBeGreaterThan(0);
    // un fantôme sur le joueur : une vie perdue
    const f = pa.nouvelle('facile', 1);
    f.fantomes[0]!.x = f.pac.x; f.fantomes[0]!.y = f.pac.y; f.fantomes[0]!.mode = 'normal';
    const ev = pa.avancer(f, 0.001, 'facile');
    expect(ev.mort).toBe(true);
    expect(f.vies).toBe(2);
  });
  it('super-pastille : fantôme vulnérable puis mangé', () => {
    const e = pa.nouvelle('facile');
    e.peur = 5000;
    const f = e.fantomes[0]!;
    f.mode = 'peur'; f.x = e.pac.x; f.y = e.pac.y;
    const ev = pa.avancer(e, 0.001, 'facile');
    expect(ev.fantome).toBe(true);
    expect(f.mode).toBe('yeux');
    expect(e.score).toBeGreaterThanOrEqual(200);
  });
  it('simulation longue sans erreur ni sortie de labyrinthe', () => {
    const e = pa.nouvelle('difficile');
    const rng = graine(3);
    for (let k = 0; k < 6000 && !e.fini; k++) {
      if (k % 25 === 0) pa.orienter(e, [1, -1, 0, 0][Math.floor(rng() * 4)]!, [0, 0, 1, -1][Math.floor(rng() * 4)]!);
      pa.avancer(e, 1 / 60, 'difficile', rng);
      for (const en of [e.pac, ...e.fantomes]) {
        expect(pa.mur(pa.grilleDepart(), en.x, en.y)).toBe(false);
      }
    }
  });
});

describe('space invaders', () => {
  it('la formation avance, descend et touche les bords', () => {
    const e = inv.nouvelle();
    const y0 = e.oy;
    for (let k = 0; k < 600; k++) inv.avancer(e, 1 / 60, graine(k + 1));
    expect(e.oy).toBeGreaterThan(y0);
    for (let i = 0; i < e.aliens.length; i++) {
      if (!e.aliens[i]) continue;
      const p = inv.posAlien(e, i);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + inv.AL_W).toBeLessThanOrEqual(inv.L);
    }
  });
  it('un tir détruit un alien et rapporte des points', () => {
    const e = inv.nouvelle();
    expect(inv.tirer(e)).toBe(true);
    expect(inv.tirer(e)).toBe(false); // un seul tir à la fois
    const i = inv.COLS * (inv.LIGNES - 1) + 2;
    const p = inv.posAlien(e, i);
    e.tirJoueur = { x: p.x + inv.AL_W / 2, y: p.y + inv.AL_H / 2 + 3 };
    const touche = inv.avancer(e, 0.001).alien;
    expect(touche).toBe(true);
    expect(inv.nbVivants(e)).toBe(inv.LIGNES * inv.COLS - 1);
    expect(e.score).toBeGreaterThan(0);
  });
  it('les tirs ennemis coûtent des vies, fin de partie à zéro', () => {
    const e = inv.nouvelle();
    for (let v = 0; v < 3; v++) {
      e.tirsAliens.push({ x: e.joueurX, y: inv.JOUEUR_Y - 2 });
      inv.avancer(e, 0.016, graine(1));
    }
    expect(e.vies).toBe(0);
    expect(e.fini).toBe(true);
  });
  it('vague terminée puis niveau suivant', () => {
    const e = inv.nouvelle();
    e.aliens.fill(false);
    e.aliens[0] = true;
    e.aliens[0] = false;
    const ev = inv.avancer(e, 0.016);
    expect(ev.niveauTermine).toBe(true);
    inv.niveauSuivant(e);
    expect(e.niveau).toBe(2);
    expect(inv.nbVivants(e)).toBe(inv.LIGNES * inv.COLS);
  });
});

describe('flappy', () => {
  it('gravité, battement et sol', () => {
    const e = fl.nouvelle();
    fl.battre(e);
    expect(e.vy).toBeLessThan(0);
    for (let k = 0; k < 300 && !e.fini; k++) fl.avancer(e, 1 / 60, 'moyen', graine(k + 1));
    expect(e.fini).toBe(true); // finit par toucher le sol ou un tuyau
  });
  it('franchir des tuyaux rapporte des points', () => {
    const e = fl.nouvelle();
    fl.battre(e);
    const rng = graine(2);
    let point = 0;
    for (let k = 0; k < 2400 && !e.fini; k++) {
      // pilote automatique : vise le centre de l'ouverture du prochain tuyau
      const t = e.tuyaux.find((x) => x.x + fl.LARGEUR_TUYAU > fl.OISEAU_X - fl.RAYON);
      const cible = t ? t.gapY + 25 : fl.H / 2;
      if (e.y > cible && e.vy > -50) fl.battre(e);
      if (fl.avancer(e, 1 / 60, 'facile', rng).point) point++;
    }
    expect(point).toBeGreaterThanOrEqual(3);
  });
  it('collision avec un tuyau', () => {
    const e = fl.nouvelle();
    fl.battre(e);
    e.tuyaux = [{ x: fl.OISEAU_X - 10, gapY: 100, passe: false }];
    e.y = fl.H - 100;
    const ev = fl.avancer(e, 0.016, 'moyen');
    expect(ev.mort).toBe(true);
  });
});

// Génère assets/grilles-mots-croises.json à partir de scripts/definitions.txt, puis VÉRIFIE chaque grille :
// tous les mots de la grille (lus horizontalement et verticalement) doivent être des mots placés avec une définition.
// Usage : node scripts/construire-mots-croises.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const brut = readFileSync(new URL('./definitions.txt', import.meta.url), 'utf8');
const defs = new Map();
for (const l of brut.split(/\r?\n/)) {
  if (!l.trim() || l.startsWith('#')) continue;
  const [mot, def] = l.split(';');
  const m = mot.trim().toUpperCase();
  if (/^[A-Z]{4,10}$/.test(m) && def && !defs.has(m)) defs.set(m, def.trim());
}
const mots = [...defs.keys()];
console.log(`${mots.length} mots définis`);

// générateur pseudo-aléatoire reproductible
let graine = 20261016;
const rnd = () => { graine ^= graine << 13; graine >>>= 0; graine ^= graine >>> 17; graine ^= graine << 5; graine >>>= 0; return graine / 4294967296; };
const melanger = (t) => { const a = [...t]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function peutPlacer(g, n, mot, x, y, dir) {
  const dx = dir === 'H' ? 1 : 0;
  const dy = dir === 'V' ? 1 : 0;
  const fx = x + dx * (mot.length - 1);
  const fy = y + dy * (mot.length - 1);
  if (x < 0 || y < 0 || fx >= n || fy >= n) return false;
  if (x - dx >= 0 && y - dy >= 0 && g[(y - dy) * n + x - dx]) return false; // case avant le mot
  if (fx + dx < n && fy + dy < n && g[(fy + dy) * n + fx + dx]) return false; // case après le mot
  let croisements = 0;
  for (let k = 0; k < mot.length; k++) {
    const cx = x + dx * k;
    const cy = y + dy * k;
    const v = g[cy * n + cx];
    if (v) {
      if (v !== mot[k]) return false;
      croisements++;
    } else {
      // cases voisines perpendiculaires doivent être vides (sinon mots collés)
      const ax = cx + dy, ay = cy + dx, bx = cx - dy, by = cy - dx;
      if (ax < n && ay < n && g[ay * n + ax]) return false;
      if (bx >= 0 && by >= 0 && g[by * n + bx]) return false;
    }
  }
  return croisements === 1 || croisements === 0 ? croisements === 1 : croisements >= 1;
}

function poser(g, n, mot, x, y, dir) {
  for (let k = 0; k < mot.length; k++) g[(y + (dir === 'V' ? k : 0)) * n + x + (dir === 'H' ? k : 0)] = mot[k];
}

function generer(n, visees) {
  const g = Array(n * n).fill('');
  const places = [];
  const pool = melanger(mots);
  const premier = pool.find((m) => m.length >= Math.min(8, n - 2));
  const x0 = Math.floor((n - premier.length) / 2);
  const y0 = Math.floor(n / 2);
  poser(g, n, premier, x0, y0, 'H');
  places.push({ mot: premier, x: x0, y: y0, dir: 'H' });
  for (let tour = 0; tour < 400 && places.length < visees; tour++) {
    const mot = pool[Math.floor(rnd() * pool.length)];
    if (places.some((p) => p.mot === mot)) continue;
    const dir = places[places.length - 1].dir === 'H' ? 'V' : 'H';
    for (const d of [dir, dir === 'H' ? 'V' : 'H']) {
      let fait = false;
      // cherche une lettre commune avec la grille
      for (let k = 0; k < mot.length && !fait; k++) {
        for (let i = 0; i < n * n && !fait; i++) {
          if (g[i] !== mot[k]) continue;
          const cx = i % n, cy = Math.floor(i / n);
          const x = d === 'H' ? cx - k : cx;
          const y = d === 'V' ? cy - k : cy;
          if (peutPlacer(g, n, mot, x, y, d)) { poser(g, n, mot, x, y, d); places.push({ mot, x, y, dir: d }); fait = true; }
        }
      }
      if (fait) break;
    }
  }
  return { g, places };
}

/** Vérifie que toute suite de ≥ 2 lettres est un mot placé (et inversement). */
function verifier(g, n, places) {
  const attendus = new Set(places.map((p) => `${p.dir}${p.x},${p.y}:${p.mot}`));
  const trouves = new Set();
  for (const dir of ['H', 'V']) {
    for (let a = 0; a < n; a++) {
      let debut = -1;
      for (let b = 0; b <= n; b++) {
        const v = b < n ? g[dir === 'H' ? a * n + b : b * n + a] : '';
        if (v && debut < 0) debut = b;
        if (!v && debut >= 0) {
          if (b - debut >= 2) {
            let mot = '';
            for (let k = debut; k < b; k++) mot += g[dir === 'H' ? a * n + k : k * n + a];
            trouves.add(`${dir}${dir === 'H' ? debut : a},${dir === 'H' ? a : debut}:${mot}`);
          }
          debut = -1;
        }
      }
    }
  }
  return trouves.size === attendus.size && [...trouves].every((t) => attendus.has(t));
}

const tailles = [
  { id: 'facile', n: 9, visees: 8, min: 7, nb: 40 },
  { id: 'moyen', n: 11, visees: 12, min: 10, nb: 40 },
  { id: 'difficile', n: 13, visees: 17, min: 14, nb: 40 },
];
const sortie = {};
for (const t of tailles) {
  sortie[t.id] = [];
  let essais = 0;
  while (sortie[t.id].length < t.nb && essais++ < 5000) {
    const { g, places } = generer(t.n, t.visees);
    if (places.length < t.min || !verifier(g, t.n, places)) continue;
    // numérotation : lecture ligne par ligne
    const departs = [...new Map(places.map((p) => [`${p.x},${p.y}`, p])).keys()]
      .map((k) => k.split(',').map(Number))
      .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const numero = new Map(departs.map(([x, y], i) => [`${x},${y}`, i + 1]));
    const liste = places
      .map((p) => ({ n: numero.get(`${p.x},${p.y}`), dir: p.dir, x: p.x, y: p.y, mot: p.mot, def: defs.get(p.mot) }))
      .sort((a, b) => a.n - b.n || a.dir.localeCompare(b.dir));
    const signature = liste.map((m) => m.mot).sort().join();
    if (sortie[t.id].some((s) => s.signature === signature)) continue;
    sortie[t.id].push({ n: t.n, grille: Array.from({ length: t.n }, (_, y) => g.slice(y * t.n, y * t.n + t.n).map((c) => c || '.').join('')), mots: liste, signature });
  }
  console.log(`${t.id} : ${sortie[t.id].length} grilles (${essais} essais)`);
  for (const gr of sortie[t.id]) delete gr.signature;
}
writeFileSync(new URL('../assets/grilles-mots-croises.json', import.meta.url), JSON.stringify(sortie));
console.log('assets/grilles-mots-croises.json écrit');

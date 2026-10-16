// Construit les dictionnaires embarqués :
//  - assets/dictionnaire-fr.json : mots avec accents (Pendu, Motus, Mots mêlés), depuis scripts/mots-pendu.txt
//  - assets/mots-fr.json : mots sans accent en minuscules, pour valider Boggle / Anagrammes / Mot le plus long,
//    depuis mots-communs.txt + mots-pendu.txt + definitions.txt
// Usage : node scripts/construire-dictionnaire.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const lire = (nom) => readFileSync(new URL(`./${nom}`, import.meta.url), 'utf8');
const normaliser = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').toLowerCase();

function mots(texte) {
  const res = [];
  for (const ligne of texte.split(/\r?\n/)) {
    if (ligne.trim().startsWith('#')) continue;
    for (const m of ligne.toLowerCase().split(/\s+/)) res.push(m);
  }
  return res;
}

// 1. dictionnaire avec accents (Pendu & co)
const pendu = new Set(mots(lire('mots-pendu.txt')).filter((m) => /^[a-zàâäçéèêëîïôöùûüÿœæ]{4,14}$/.test(m)));
const liste = [...pendu].sort((a, b) => a.localeCompare(b, 'fr'));
writeFileSync(new URL('../assets/dictionnaire-fr.json', import.meta.url), JSON.stringify(liste));
console.log(`${liste.length} mots avec accents -> assets/dictionnaire-fr.json`);

// 2. liste de validation sans accents
const interdits = new Set(['grandpere', 'grandmere', 'lavevaisselle', 'grillepain', 'tee', 'coute']);
const valides = new Set();
const sources = [
  ...mots(lire('mots-communs.txt')),
  ...mots(lire('mots-pendu.txt')),
  ...lire('definitions.txt').split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(';')[0].trim()),
];
for (const m of sources) {
  const n = normaliser(m);
  if (/^[a-z]{3,12}$/.test(n) && !interdits.has(n)) valides.add(n);
}
const triees = [...valides].sort();
writeFileSync(new URL('../assets/mots-fr.json', import.meta.url), JSON.stringify(triees));
console.log(`${triees.length} mots de validation -> assets/mots-fr.json`);

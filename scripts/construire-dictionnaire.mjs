// Construit assets/dictionnaire-fr.json à partir de scripts/mots-pendu.txt
// Usage : node scripts/construire-dictionnaire.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const brut = readFileSync(new URL('./mots-pendu.txt', import.meta.url), 'utf8');
const mots = new Set();
for (const ligne of brut.split(/\r?\n/)) {
  if (ligne.trim().startsWith('#')) continue;
  for (const m of ligne.toLowerCase().split(/\s+/)) {
    // lettres uniquement (accents autorisés), 4 à 14 lettres ; les mots composés sont ignorés
    if (/^[a-zàâäçéèêëîïôöùûüÿœæ]{4,14}$/.test(m)) mots.add(m);
  }
}
const liste = [...mots].sort((a, b) => a.localeCompare(b, 'fr'));
writeFileSync(new URL('../assets/dictionnaire-fr.json', import.meta.url), JSON.stringify(liste));
console.log(`${liste.length} mots écrits dans assets/dictionnaire-fr.json`);

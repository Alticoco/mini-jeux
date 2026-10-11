import type { ContexteJeu, Jeu } from '../../core/types';
import { el, formaterTemps, vider } from '../../shared/dom';
import { INDICES, NIVEAUX_SUDOKU, conflits, generer, termine, voisines, type Grille, type NiveauSudoku } from './logique';

interface Etat {
  puzzle: Grille;
  solution: Grille;
  grille: Grille;
  notes: number[]; // masque de bits (bit v = chiffre v)
  niveau: NiveauSudoku;
  secondes: number;
  indices: number;
  fini: boolean;
  historique: Array<{ i: number; valeur: number; notes: number }>;
}

let ctx: ContexteJeu | null = null;
let etat: Etat | null = null;
let attente: Etat | null = null;
let horloge: number | undefined;
let selection = 40;
let modeNotes = false;
let elTemps: HTMLElement | null = null;

function niveauPar(d: string): NiveauSudoku {
  return d === 'facile' ? 'facile' : d === 'difficile' ? 'difficile' : 'moyen';
}

function neuf(niveau: NiveauSudoku): Etat {
  const { puzzle, solution } = generer(niveau);
  return { puzzle, solution, grille: [...puzzle], notes: Array(81).fill(0), niveau, secondes: 0, indices: 0, fini: false, historique: [] };
}

function arreterHorloge(): void {
  window.clearInterval(horloge);
  horloge = undefined;
}

function demarrerHorloge(): void {
  arreterHorloge();
  horloge = window.setInterval(() => {
    if (!etat || etat.fini) return;
    etat.secondes++;
    if (elTemps) elTemps.textContent = formaterTemps(etat.secondes);
    if (etat.secondes % 15 === 0) ctx?.sauvegardeAuto();
  }, 1000);
}

function modifiable(e: Etat, i: number): boolean {
  return e.puzzle[i] === 0 && !e.fini;
}

function enregistrerCoup(e: Etat, i: number): void {
  e.historique.push({ i, valeur: e.grille[i]!, notes: e.notes[i]! });
  if (e.historique.length > 300) e.historique.shift();
}

function saisir(v: number): void {
  if (!etat || !ctx || !modifiable(etat, selection)) return;
  const e = etat;
  enregistrerCoup(e, selection);
  if (modeNotes) {
    if (e.grille[selection]) return void e.historique.pop();
    e.notes[selection] = e.notes[selection]! ^ (1 << v);
  } else {
    e.grille[selection] = e.grille[selection] === v ? 0 : v;
    e.notes[selection] = 0;
    if (e.grille[selection]) for (const k of voisines(selection)) e.notes[k] = e.notes[k]! & ~(1 << v);
    ctx.jouerSon(e.grille[selection] && e.grille[selection] !== e.solution[selection] ? 'erreur' : 'clic');
  }
  verifierFin();
  dessiner();
  ctx.sauvegardeAuto();
}

function effacer(): void {
  if (!etat || !ctx || !modifiable(etat, selection)) return;
  enregistrerCoup(etat, selection);
  etat.grille[selection] = 0;
  etat.notes[selection] = 0;
  dessiner();
  ctx.sauvegardeAuto();
}

function indice(): void {
  if (!etat || !ctx || etat.fini) return;
  let i = selection;
  if (!modifiable(etat, i) || etat.grille[i] === etat.solution[i]) {
    const cibles = etat.grille.flatMap((v, k) => (etat!.puzzle[k] === 0 && v !== etat!.solution[k] ? [k] : []));
    if (!cibles.length) return;
    i = cibles[0]!;
    selection = i;
  }
  enregistrerCoup(etat, i);
  etat.grille[i] = etat.solution[i]!;
  etat.notes[i] = 0;
  etat.indices++;
  verifierFin();
  dessiner();
  ctx.sauvegardeAuto();
}

function verifierFin(): void {
  if (!etat || !ctx || etat.fini || !termine(etat.grille, etat.solution)) return;
  etat.fini = true;
  arreterHorloge();
  ctx.jouerSon('gagne');
  ctx.terminer(etat.indices === 0 ? { victoire: true, score: etat.secondes } : { victoire: true });
}

function deplacer(dl: number, dc: number): void {
  const l = Math.min(8, Math.max(0, Math.floor(selection / 9) + dl));
  const c = Math.min(8, Math.max(0, (selection % 9) + dc));
  selection = l * 9 + c;
  dessiner();
}

function clavier(ev: KeyboardEvent): void {
  if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
  if (/^[1-9]$/.test(ev.key)) saisir(Number(ev.key));
  else if (ev.key === 'Backspace' || ev.key === 'Delete' || ev.key === '0') effacer();
  else if (ev.key === 'n' || ev.key === 'N') { modeNotes = !modeNotes; dessiner(); }
  else if (ev.key === 'ArrowUp') deplacer(-1, 0);
  else if (ev.key === 'ArrowDown') deplacer(1, 0);
  else if (ev.key === 'ArrowLeft') deplacer(0, -1);
  else if (ev.key === 'ArrowRight') deplacer(0, 1);
  else return;
  ev.preventDefault();
}

function dessiner(): void {
  if (!etat || !ctx) return;
  const e = etat;
  const conf = conflits(e.grille);
  const valSel = e.grille[selection];
  const plateau = el('div', { class: 'sudoku-grille', role: 'grid', 'aria-label': 'Grille de Sudoku' });
  for (let i = 0; i < 81; i++) {
    const v = e.grille[i]!;
    let classe = 'sudoku-case';
    if (e.puzzle[i]) classe += ' donnee';
    if (i === selection) classe += ' selection';
    else if (valSel && v === valSel) classe += ' meme';
    else if (voisines(selection).includes(i)) classe += ' voisine';
    if (conf.has(i)) classe += ' conflit';
    else if (v && !e.puzzle[i] && v !== e.solution[i]) classe += ' faux-silencieux';
    if (i % 9 === 2 || i % 9 === 5) classe += ' bord-d';
    if (Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5) classe += ' bord-b';
    const c = el('div', { class: classe, role: 'gridcell', tabindex: -1, 'aria-label': `Ligne ${Math.floor(i / 9) + 1} colonne ${(i % 9) + 1} : ${v || 'vide'}` });
    if (v) c.textContent = String(v);
    else if (e.notes[i]) {
      const n = el('div', { class: 'notes' });
      for (let k = 1; k <= 9; k++) n.append(el('span', {}, e.notes[i]! & (1 << k) ? String(k) : ''));
      c.append(n);
    }
    c.addEventListener('click', () => { selection = i; dessiner(); });
    plateau.append(c);
  }
  elTemps = el('span', { class: 'val' }, formaterTemps(e.secondes));
  const niveaux = el('div', { class: 'choix' }, el('span', {}, 'Niveau :'),
    ...NIVEAUX_SUDOKU.map((n) => el('button', { class: `btn${n === e.niveau ? ' actif' : ''}`, onclick: () => nouvelleAvec(n) }, n[0]!.toUpperCase() + n.slice(1))));
  const pave = el('div', { class: 'sudoku-pave' },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((v) => el('button', { class: 'btn', disabled: e.fini, onclick: () => saisir(v) }, String(v))),
  );
  const actions = el('div', { class: 'rangee' },
    el('button', { class: `btn${modeNotes ? ' actif' : ''}`, 'aria-pressed': modeNotes, onclick: () => { modeNotes = !modeNotes; dessiner(); } }, '✏️ Notes (N)'),
    el('button', { class: 'btn', onclick: effacer, disabled: e.fini }, '⌫ Effacer'),
    el('button', { class: 'btn', onclick: indice, disabled: e.fini }, '💡 Indice'),
  );
  const msg = e.fini ? `Bravo ! Grille terminée en ${formaterTemps(e.secondes)}${e.indices ? ` (avec ${e.indices} indice${e.indices > 1 ? 's' : ''}, score non retenu)` : ''}.` : '';
  vider(ctx.conteneur);
  ctx.conteneur.append(
    niveaux,
    el('div', { class: 'infos' }, el('span', {}, '⏱ ', elTemps), el('span', {}, `Indices donnés : ${INDICES[e.niveau]}`)),
    el('div', { class: `message${e.fini ? ' gagne' : ''}`, role: 'status' }, msg),
    plateau, pave, actions,
    el('div', { class: 'muet' }, 'Chiffres au clavier · flèches pour se déplacer · N : notes · Retour arrière : effacer'),
  );
}

function nouvelleAvec(n: NiveauSudoku): void {
  if (!ctx) return;
  arreterHorloge();
  etat = neuf(n);
  selection = etat.puzzle.findIndex((v) => v === 0);
  dessiner();
  demarrerHorloge();
  ctx.sauvegardeAuto();
}

export const jeuSudoku: Jeu = {
  id: 'sudoku',
  nom: 'Sudoku',
  famille: 'Puzzles',
  icone: '🔟',
  description: 'Remplissez la grille de 1 à 9. 4 niveaux.',
  regles: '<p>Remplissez la grille pour que chaque <b>ligne</b>, chaque <b>colonne</b> et chaque <b>carré de 3×3</b> contienne une seule fois les chiffres de 1 à 9.</p><ul><li>Cliquez sur une case puis tapez un chiffre (clavier ou pavé).</li><li><b>Notes</b> : notez des candidats possibles dans une case (touche N).</li><li>Les doublons sont surlignés en rouge.</li><li><b>Indice</b> : révèle une case, mais le score n\'est alors plus retenu.</li></ul><p>Chaque grille a une solution unique, résoluble par logique.</p>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  demarrer(c) {
    ctx = c;
    modeNotes = false;
    etat = attente ?? neuf(niveauPar(c.options.difficulte));
    attente = null;
    selection = Math.max(0, etat.puzzle.findIndex((v) => v === 0));
    dessiner();
    if (!etat.fini) demarrerHorloge();
    document.addEventListener('keydown', clavier);
  },
  arreter() {
    arreterHorloge();
    document.removeEventListener('keydown', clavier);
    ctx = null;
    etat = null;
    attente = null;
    elTemps = null;
  },
  sauvegarder() {
    return etat && !etat.fini ? etat : null;
  },
  charger(s) {
    const e = s as Etat;
    if (![e.puzzle, e.solution, e.grille, e.notes].every((t) => Array.isArray(t) && t.length === 81)) throw new Error('sauvegarde invalide');
    attente = e;
  },
  nouvellePartie() {
    if (ctx) nouvelleAvec(niveauPar(ctx.options.difficulte));
  },
  annuler() {
    if (!etat || !ctx || etat.fini || !etat.historique.length) return;
    const h = etat.historique.pop()!;
    etat.grille[h.i] = h.valeur;
    etat.notes[h.i] = h.notes;
    selection = h.i;
    dessiner();
    ctx.sauvegardeAuto();
  },
};

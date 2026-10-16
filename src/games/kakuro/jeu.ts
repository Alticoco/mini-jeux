import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import { conflits, generer, resolu, type Puzzle } from './logique';

interface Etat { n: number; puzzle: Puzzle; grille: number[]; sel: number; historique: Array<[number, number]>; secondes: number; fini: boolean }

const PARAM: Record<number, [number, number]> = { 6: [0.2, 0.3], 8: [0.22, 0.2], 10: [0.24, 0.12] };
const neufAvec = (n: number): Etat => {
  const { puzzle } = generer(n, ...PARAM[n]!);
  return { n, puzzle, grille: [...puzzle.donnees], sel: puzzle.blanche.findIndex((b, i) => b && !puzzle.donnees[i]), historique: [], secondes: 0, fini: false };
};
const parNiveau = { facile: 6, moyen: 8, difficile: 10 } as const;

function saisir(h: Hote<Etat>, v: number): void {
  const e = h.etat;
  if (e.fini || e.sel < 0 || e.puzzle.donnees[e.sel] || !e.puzzle.blanche[e.sel]) return;
  e.historique.push([e.sel, e.grille[e.sel]!]);
  e.grille[e.sel] = v === 0 || e.grille[e.sel] === v ? 0 : v;
  h.son('clic');
  if (resolu(e.puzzle, e.grille)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.secondes }); }
  h.render();
  h.sauver();
}

export const jeuKakuro = fabrique<Etat>({
  id: 'kakuro', nom: 'Kakuro', famille: 'Puzzles', icone: '➕',
  description: 'Des mots croisés de chiffres : les sommes.',
  regles: '<p>Remplissez les cases blanches avec des chiffres de <b>1 à 9</b>.</p><ul><li>Le nombre en <b>haut à droite</b> d\'une case noire est la somme des chiffres de la série <b>horizontale</b> qui la suit ; le nombre en <b>bas à gauche</b> est la somme de la série <b>verticale</b> qui est dessous.</li><li>Dans une même série, <b>aucun chiffre n\'est répété</b>.</li></ul><p>Cliquez une case et tapez un chiffre (clavier ou boutons). Les séries fausses ou comportant un doublon sont surlignées en rouge. Quelques chiffres sont donnés au départ.</p>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  neuf: (o) => neufAvec(parNiveau[o.difficulte]),
  valide: (x) => !!x && !!(x as Etat).puzzle && Array.isArray((x as Etat).grille),
  vue(h) {
    const e = h.etat;
    const p = e.puzzle;
    const conf = conflits(p, e.grille);
    const plateau = el('div', { class: 'kak-grille', style: `grid-template-columns: repeat(${e.n}, 1fr)` },
      ...p.blanche.map((b, i) => {
        if (!b) {
          const d = p.indiceDroite[i]!;
          const bas = p.indiceBas[i]!;
          return el('div', { class: 'kak-noire' }, el('span', { class: 'kak-droite' }, d ? String(d) : ''), el('span', { class: 'kak-bas' }, bas ? String(bas) : ''));
        }
        return el('button', {
          class: `kak-case${e.sel === i ? ' selection' : ''}${p.donnees[i] ? ' donnee' : ''}${conf.has(i) ? ' conflit' : ''}`, disabled: e.fini,
          'aria-label': `Ligne ${Math.floor(i / e.n) + 1} colonne ${(i % e.n) + 1} : ${e.grille[i] || 'vide'}`, onclick: () => { e.sel = i; h.render(); },
        }, e.grille[i] ? String(e.grille[i]) : '');
      }));
    const pave = el('div', { class: 'sudoku-pave', style: 'grid-template-columns: repeat(10, 1fr)' },
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((v) => el('button', { class: 'btn', disabled: e.fini, onclick: () => saisir(h, v) }, String(v))),
      el('button', { class: 'btn', disabled: e.fini, onclick: () => saisir(h, 0), 'aria-label': 'Effacer' }, '⌫'));
    h.ctx.conteneur.append(
      choix('Taille :', [[6, '6×6'], [8, '8×8'], [10, '10×10']] as Array<[number, string]>, e.n, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Temps', formaterTemps(e.secondes)]),
      message(e.fini ? `Bravo ! Résolu en ${formaterTemps(e.secondes)}.` : '', e.fini ? 'gagne' : ''),
      el('div', { class: 'defile-x' }, plateau), pave,
      astuce('Cliquez une case, tapez un chiffre de 1 à 9 · flèches pour se déplacer'),
    );
  },
  demarre(h) {
    h.clavier((ev) => {
      const e = h.etat;
      if (/^[1-9]$/.test(ev.key)) saisir(h, Number(ev.key));
      else if (ev.key === 'Backspace' || ev.key === 'Delete' || ev.key === '0') saisir(h, 0);
      else if (ev.key.startsWith('Arrow')) {
        ev.preventDefault();
        const dl = ev.key === 'ArrowUp' ? -1 : ev.key === 'ArrowDown' ? 1 : 0;
        const dc = ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowRight' ? 1 : 0;
        let i = e.sel;
        for (let k = 0; k < e.n; k++) {
          const l = Math.floor(i / e.n) + dl;
          const c = (i % e.n) + dc;
          if (l < 0 || l >= e.n || c < 0 || c >= e.n) break;
          i = l * e.n + c;
          if (e.puzzle.blanche[i]) { e.sel = i; h.render(); break; }
        }
      }
    });
    h.intervalle(() => {
      if (h.etat.fini) return;
      h.etat.secondes++;
      const t = h.ctx.conteneur.querySelector('.infos .val');
      if (t) t.textContent = formaterTemps(h.etat.secondes);
    }, 1000);
  },
  annuler(h) {
    const e = h.etat;
    const d = e.historique.pop();
    if (!d || e.fini) return;
    e.grille[d[0]] = d[1];
    e.sel = d[0];
    h.render();
    h.sauver();
  },
});

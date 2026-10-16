import { astuce, choix, fabrique, infos, message } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import { conflits, generer, ih, iv, resolu, type Puzzle } from './logique';

interface Etat { n: number; puzzle: Puzzle; grille: number[]; sel: number; historique: Array<[number, number]>; secondes: number; fini: boolean }

const PAR_NIVEAU = { facile: [4, 0.6, 2], moyen: [5, 0.5, 1], difficile: [6, 0.4, 0] } as const;
const neufAvec = (n: number, densite: number, indices: number): Etat => {
  const { puzzle } = generer(n, densite, indices);
  return { n, puzzle, grille: [...puzzle.donnees], sel: puzzle.donnees.indexOf(0), historique: [], secondes: 0, fini: false };
};
const PARAM: Record<number, [number, number]> = { 4: [0.6, 2], 5: [0.5, 1], 6: [0.4, 0] };

export const jeuFutoshiki = fabrique<Etat>({
  id: 'futoshiki', nom: 'Futoshiki', famille: 'Puzzles', icone: '🔣',
  description: 'Sudoku avec des signes < et >.',
  regles: '<p>Remplissez la grille avec les chiffres de <b>1 à N</b> (N = taille de la grille) pour que chaque <b>ligne</b> et chaque <b>colonne</b> contienne chaque chiffre une seule fois.</p><p>Les signes <b>&lt;</b> et <b>&gt;</b> entre deux cases imposent leur ordre : la case vers laquelle pointe la petite pointe est la plus petite. Quelques chiffres sont déjà donnés.</p><p>Cliquez une case puis tapez un chiffre (clavier ou boutons). Les infractions sont surlignées en rouge. Chaque grille a une solution unique.</p>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  neuf: (o) => neufAvec(...(PAR_NIVEAU[o.difficulte] as readonly [number, number, number])),
  valide: (x) => !!x && !!(x as Etat).puzzle && Array.isArray((x as Etat).grille),
  vue(h) {
    const e = h.etat;
    const p = e.puzzle;
    const conf = conflits(p, e.grille);
    const saisir = (v: number) => {
      if (e.fini || e.sel < 0 || p.donnees[e.sel]) return;
      e.historique.push([e.sel, e.grille[e.sel]!]);
      e.grille[e.sel] = e.grille[e.sel] === v ? 0 : v;
      h.son('clic');
      if (resolu(p, e.grille)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.secondes }); }
      h.render();
      h.sauver();
    };
    const taille = e.n * 2 - 1;
    const plateau = el('div', { class: 'fut-plateau', style: `grid-template-columns: repeat(${taille}, auto)` });
    for (let l = 0; l < taille; l++) {
      for (let c = 0; c < taille; c++) {
        const ll = l / 2;
        const cc = c / 2;
        if (l % 2 === 0 && c % 2 === 0) {
          const i = (l / 2) * e.n + c / 2;
          plateau.append(el('button', {
            class: `fut-case${e.sel === i ? ' selection' : ''}${p.donnees[i] ? ' donnee' : ''}${conf.has(i) ? ' conflit' : ''}`, disabled: e.fini,
            'aria-label': `Ligne ${l / 2 + 1} colonne ${c / 2 + 1} : ${e.grille[i] || 'vide'}`, onclick: () => { e.sel = i; h.render(); },
          }, e.grille[i] ? String(e.grille[i]) : ''));
        } else if (l % 2 === 0) {
          const r = p.h[ih(e.n, ll, Math.floor(cc))]!;
          plateau.append(el('div', { class: 'fut-signe' }, r === 1 ? '<' : r === -1 ? '>' : ''));
        } else if (c % 2 === 0) {
          const r = p.v[iv(e.n, Math.floor(ll), cc)]!;
          plateau.append(el('div', { class: 'fut-signe vertical' }, r === 1 ? '∧' : r === -1 ? '∨' : ''));
        } else plateau.append(el('div', {}));
      }
    }
    const pave = el('div', { class: 'sudoku-pave', style: `grid-template-columns: repeat(${e.n + 1}, 1fr); width: min(${(e.n + 1) * 52}px, 94vw)` },
      ...Array.from({ length: e.n }, (_, k) => el('button', { class: 'btn', disabled: e.fini, onclick: () => saisir(k + 1) }, String(k + 1))),
      el('button', { class: 'btn', disabled: e.fini, onclick: () => saisir(e.grille[e.sel] || 0) , 'aria-label': 'Effacer' }, '⌫'));
    h.ctx.conteneur.append(
      choix('Taille :', [[4, '4×4'], [5, '5×5'], [6, '6×6']] as Array<[number, string]>, e.n, (n) => h.recommencer(() => neufAvec(n, ...PARAM[n]!))),
      infos(['Temps', formaterTemps(e.secondes)]),
      message(e.fini ? `Bravo ! Résolu en ${formaterTemps(e.secondes)}.` : '', e.fini ? 'gagne' : ''),
      plateau, pave, astuce('Cliquez une case puis tapez un chiffre · le signe indique la plus petite des deux cases'),
    );
  },
  demarre(h) {
    h.clavier((ev) => {
      const e = h.etat;
      if (e.fini) return;
      const n = Number(ev.key);
      if (n >= 1 && n <= e.n && e.sel >= 0 && !e.puzzle.donnees[e.sel]) {
        e.historique.push([e.sel, e.grille[e.sel]!]);
        e.grille[e.sel] = e.grille[e.sel] === n ? 0 : n;
        if (resolu(e.puzzle, e.grille)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.secondes }); }
        h.render();
        h.sauver();
      } else if ((ev.key === 'Backspace' || ev.key === 'Delete') && e.sel >= 0 && !e.puzzle.donnees[e.sel]) {
        e.historique.push([e.sel, e.grille[e.sel]!]);
        e.grille[e.sel] = 0;
        h.render();
      } else if (ev.key.startsWith('Arrow')) {
        ev.preventDefault();
        const dl = ev.key === 'ArrowUp' ? -1 : ev.key === 'ArrowDown' ? 1 : 0;
        const dc = ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowRight' ? 1 : 0;
        const l = Math.min(e.n - 1, Math.max(0, Math.floor(e.sel / e.n) + dl));
        const c = Math.min(e.n - 1, Math.max(0, (e.sel % e.n) + dc));
        e.sel = l * e.n + c;
        h.render();
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

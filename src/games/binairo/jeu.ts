import { astuce, choix, fabrique, infos, message } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import { conflits, generer, resolue } from './logique';

interface Etat { n: number; puzzle: number[]; grille: number[]; historique: Array<[number, number]>; secondes: number; fini: boolean }

const PAR_NIVEAU = { facile: [6, 0.55], moyen: [8, 0.42], difficile: [10, 0.34] } as const;
const neufAvec = (n: number, garde: number): Etat => {
  const { puzzle } = generer(n, garde);
  return { n, puzzle, grille: [...puzzle], historique: [], secondes: 0, fini: false };
};
const gardePour = (n: number) => (n === 6 ? 0.55 : n === 8 ? 0.42 : 0.34);

export const jeuBinairo = fabrique<Etat>({
  id: 'binairo', nom: 'Binairo', famille: 'Puzzles', icone: '⚫',
  description: 'Remplissez la grille de ● et ○.',
  regles: '<p>Remplissez la grille avec deux symboles, <b>● et ○</b>, en respectant 3 règles :</p><ul><li>Pas plus de <b>deux symboles identiques</b> à la suite, en ligne comme en colonne.</li><li>Chaque ligne et chaque colonne contient <b>autant de ● que de ○</b>.</li><li>Deux lignes (ou deux colonnes) ne peuvent pas être <b>identiques</b>.</li></ul><p>Cliquez sur une case pour alterner : vide → ● → ○ → vide. Les cases en rouge enfreignent une règle. Les cases grisées sont données.</p>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  neuf: (o) => neufAvec(...(PAR_NIVEAU[o.difficulte] as readonly [number, number])),
  valide: (x) => !!x && Array.isArray((x as Etat).grille) && (x as Etat).grille.length === (x as Etat).n ** 2,
  vue(h) {
    const e = h.etat;
    const conf = conflits(e.grille, e.n);
    const plateau = el('div', { class: 'plateau binairo-grille', style: `grid-template-columns: repeat(${e.n}, 1fr)` },
      ...e.grille.map((v, i) => el('button', {
        class: `case bin-case${e.puzzle[i] ? ' donnee' : ''}${conf.has(i) ? ' conflit' : ''}`, disabled: e.fini || e.puzzle[i] !== 0,
        'aria-label': `Case ${i + 1} : ${v === 1 ? 'noir' : v === 2 ? 'blanc' : 'vide'}`,
        onclick: () => {
          e.historique.push([i, v]);
          e.grille[i] = (v + 1) % 3;
          h.son('clic');
          if (resolue(e.grille, e.n)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.secondes }); }
          h.render();
          h.sauver();
        },
      }, v === 1 ? '●' : v === 2 ? '○' : '')));
    h.ctx.conteneur.append(
      choix('Taille :', [[6, '6×6'], [8, '8×8'], [10, '10×10']] as Array<[number, string]>, e.n, (n) => h.recommencer(() => neufAvec(n, gardePour(n)))),
      infos(['Temps', formaterTemps(e.secondes)]),
      message(e.fini ? `Bravo ! Résolu en ${formaterTemps(e.secondes)}.` : conf.size ? 'Des cases enfreignent une règle (en rouge).' : '', e.fini ? 'gagne' : ''),
      plateau, astuce('Clic : vide → ● → ○ → vide'),
    );
  },
  demarre(h) {
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
    h.render();
    h.sauver();
  },
});

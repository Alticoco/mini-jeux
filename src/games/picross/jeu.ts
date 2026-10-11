import { astuce, choix, fabrique, infos, message } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import { cluesColonnes, cluesLignes, genererMotif, gagne, ligneOk } from './logique';

interface Etat { n: number; cl: number[][]; cc: number[][]; marques: number[]; croix: boolean; secondes: number; fini: boolean }

const TAILLES = { facile: 5, moyen: 10, difficile: 15 } as const;
const neufAvec = (n: number): Etat => {
  const motif = genererMotif(n, n <= 5 ? 0.6 : 0.55);
  return { n, cl: cluesLignes(motif, n), cc: cluesColonnes(motif, n), marques: Array<number>(n * n).fill(0), croix: false, secondes: 0, fini: false };
};

export const jeuPicross = fabrique<Etat>({
  id: 'picross', nom: 'Picross', famille: 'Puzzles', icone: '🖼️',
  description: 'Retrouvez le dessin grâce aux indices.',
  regles: '<p>Les nombres à gauche et au-dessus de la grille indiquent les <b>blocs de cases noires consécutives</b> de chaque ligne et colonne, dans l\'ordre. Ex. « 3 1 » = un bloc de 3 cases, puis au moins une case vide, puis une case seule.</p><ul><li><b>Clic</b> : noircir une case.</li><li><b>Clic droit</b> (ou « Mode croix ») : marquer une case comme vide ✕.</li></ul><p>Un indice grisé signifie que sa ligne est correcte. La grille est gagnée quand tous les indices sont respectés.</p>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  neuf: (o) => neufAvec(TAILLES[o.difficulte]),
  valide: (x) => !!x && Array.isArray((x as Etat).marques) && (x as Etat).marques.length === (x as Etat).n ** 2,
  vue(h) {
    const e = h.etat;
    const pleines = e.marques.map((m) => m === 1);
    const agir = (i: number, droit: boolean) => {
      if (e.fini) return;
      const cible = droit || e.croix ? 2 : 1;
      e.marques[i] = e.marques[i] === cible ? 0 : cible;
      h.son('clic');
      if (gagne(e.marques.map((m) => m === 1), e.n, e.cl, e.cc)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.secondes }); }
      h.render();
      h.sauver();
    };
    const grille = el('div', { class: 'picross', style: `grid-template-columns: auto repeat(${e.n}, 1fr)` });
    grille.append(el('div', {}));
    for (let c = 0; c < e.n; c++) grille.append(el('div', { class: `pic-clue col${ligneOk(pleines, e.n, c, true, e.cc[c]!) ? ' ok' : ''}` }, ...e.cc[c]!.map((v) => el('span', {}, String(v)))));
    for (let l = 0; l < e.n; l++) {
      grille.append(el('div', { class: `pic-clue lig${ligneOk(pleines, e.n, l, false, e.cl[l]!) ? ' ok' : ''}` }, ...e.cl[l]!.map((v) => el('span', {}, String(v)))));
      for (let c = 0; c < e.n; c++) {
        const i = l * e.n + c;
        const m = e.marques[i]!;
        const b = el('button', { class: `pic-case${m === 1 ? ' pleine' : ''}${(c + 1) % 5 === 0 && c < e.n - 1 ? ' sep-d' : ''}${(l + 1) % 5 === 0 && l < e.n - 1 ? ' sep-b' : ''}`, disabled: e.fini, 'aria-label': `Ligne ${l + 1} colonne ${c + 1}`, onclick: () => agir(i, false) }, m === 2 ? '✕' : '');
        b.addEventListener('contextmenu', (ev) => { ev.preventDefault(); agir(i, true); });
        grille.append(b);
      }
    }
    h.ctx.conteneur.append(
      choix('Taille :', [[5, '5×5'], [10, '10×10'], [15, '15×15']] as Array<[number, string]>, e.n, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Temps', formaterTemps(e.secondes)]),
      el('button', { class: `btn${e.croix ? ' actif' : ''}`, 'aria-pressed': e.croix, onclick: () => { e.croix = !e.croix; h.render(); } }, '✕ Mode croix'),
      message(e.fini ? `Bravo ! Dessin retrouvé en ${formaterTemps(e.secondes)}.` : '', e.fini ? 'gagne' : ''),
      el('div', { class: 'defile-x' }, grille),
      astuce('Clic : noircir · Clic droit : croix'),
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
});

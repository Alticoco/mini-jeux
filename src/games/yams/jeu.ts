import { entier } from '../../shared/alea';
import { astuce, fabrique, infos, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { CATEGORIES, bonus, points, sousTotalHaut, total } from './logique';

interface Etat { des: number[]; gardes: boolean[]; lancers: number; scores: Array<number | null>; fini: boolean }

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const neuf = (): Etat => ({ des: [0, 0, 0, 0, 0], gardes: [false, false, false, false, false], lancers: 0, scores: Array<number | null>(13).fill(null), fini: false });

export const jeuYams = fabrique<Etat>({
  id: 'yams', nom: 'Yams', famille: 'Hasard et mémoire', icone: '🎲',
  description: '5 dés, 13 combinaisons, le meilleur total.',
  regles: '<p>À chaque tour, lancez <b>5 dés</b> jusqu\'à <b>3 fois</b> (cliquez sur un dé pour le garder entre deux lancers). Puis inscrivez le résultat dans <b>une combinaison</b> non encore remplie (même si elle vaut 0).</p><ul><li><b>As à Six</b> : somme des dés de cette valeur. Bonus de 35 si ce total atteint 63.</li><li><b>Brelan / Carré</b> : 3 / 4 dés identiques, somme de tous les dés.</li><li><b>Full</b> : 25 · <b>Petite suite</b> (4 de suite) : 30 · <b>Grande suite</b> (5 de suite) : 40 · <b>Yams</b> (5 identiques) : 50 · <b>Chance</b> : somme.</li></ul><p>La partie dure 13 tours.</p>',
  score: { libelle: 'meilleur total', sens: 'haut', suffixe: ' pts' },
  neuf,
  valide: (x) => !!x && Array.isArray((x as Etat).scores) && (x as Etat).scores.length === 13,
  vue(h) {
    const e = h.etat;
    const lancer = () => {
      if (e.lancers >= 3 || e.fini) return;
      e.des = e.des.map((d, i) => (e.gardes[i] && d ? d : entier(6) + 1));
      e.lancers++;
      h.son('pose');
      h.render();
      h.sauver();
    };
    const inscrire = (cat: number) => {
      if (e.lancers === 0 || e.scores[cat] !== null || e.fini) return;
      e.scores[cat] = points(cat, e.des);
      e.lancers = 0;
      e.des = [0, 0, 0, 0, 0];
      e.gardes = [false, false, false, false, false];
      h.son('clic');
      if (e.scores.every((s) => s !== null)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: total(e.scores) }); }
      h.render();
      h.sauver();
    };
    const des = el('div', { class: 'des' }, ...e.des.map((d, i) => el('button', {
      class: `de${e.gardes[i] ? ' garde' : ''}`, disabled: e.lancers === 0 || e.lancers >= 3 || e.fini, 'aria-pressed': e.gardes[i], 'aria-label': d ? `Dé ${d}${e.gardes[i] ? ' gardé' : ''}` : 'Dé',
      onclick: () => { e.gardes[i] = !e.gardes[i]; h.render(); },
    }, d ? FACES[d - 1]! : '·')));
    const table = el('table', { class: 'stats yams-table' }, el('tbody', {}, ...CATEGORIES.map((nom, cat) => {
      const pris = e.scores[cat] !== null;
      const possible = !pris && e.lancers > 0;
      return el('tr', { class: possible ? 'possible' : '', onclick: () => inscrire(cat) },
        el('td', {}, nom),
        el('td', { class: pris ? 'pris' : 'prev' }, pris ? String(e.scores[cat]) : possible ? `(${points(cat, e.des)})` : ''));
    })));
    h.ctx.conteneur.append(
      infos(['Total', total(e.scores)], ['Haut', `${sousTotalHaut(e.scores)}/63${bonus(e.scores) ? ' +35' : ''}`], ['Lancers', `${e.lancers}/3`]),
      message(e.fini ? `Partie terminée : ${total(e.scores)} points.` : e.lancers === 0 ? 'Lancez les dés.' : 'Gardez des dés, relancez, ou choisissez une combinaison.', e.fini ? 'gagne' : ''),
      des,
      el('button', { class: 'btn primaire', disabled: e.lancers >= 3 || e.fini, onclick: lancer }, e.lancers === 0 ? 'Lancer les dés' : 'Relancer'),
      table, astuce('Cliquez sur une ligne pour y inscrire le résultat'),
    );
  },
});

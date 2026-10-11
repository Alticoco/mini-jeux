import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import { elCarte } from '../../shared/cartes';
import { colonneCartes } from '../../shared/tableau';
import { cloner, deplacer, distribuer, gagne, nouvelle, peutDeplacer, peutDistribuer, suiteDepuis, type Etat as EtatSpider } from './logique';

interface Etat { jeu: EtatSpider; historique: EtatSpider[]; secondes: number; fini: boolean }

const PAR_NIVEAU = { facile: 1, moyen: 2, difficile: 4 } as const;
const neufAvec = (c: 1 | 2 | 4): Etat => ({ jeu: nouvelle(c), historique: [], secondes: 0, fini: false });
let selection: { col: number; index: number } | null = null;

function memoriser(e: Etat): void {
  e.historique.push(cloner(e.jeu));
  if (e.historique.length > 150) e.historique.shift();
}

function apres(h: Hote<Etat>, suite: boolean): void {
  const e = h.etat;
  selection = null;
  h.son(suite ? 'gagne' : 'pose');
  if (gagne(e.jeu)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.jeu.score }); }
  h.render();
  h.sauver();
}

function cliquer(h: Hote<Etat>, col: number, index: number | null): void {
  const e = h.etat;
  if (e.fini) return;
  const j = e.jeu;
  if (selection) {
    const s = selection;
    if (s.col !== col && peutDeplacer(j, s.col, s.index, col)) {
      memoriser(e);
      const r = deplacer(j, s.col, s.index, col);
      return apres(h, r.suiteRetiree);
    }
    if (index === null || (s.col === col && s.index === index)) { selection = null; h.render(); return; }
  }
  if (index !== null && suiteDepuis(j, col, index)) { selection = { col, index }; h.son('clic'); } else { selection = null; if (index !== null) h.son('erreur'); }
  h.render();
}

export const jeuSpider = fabrique<Etat>({
  id: 'spider', nom: 'Spider', famille: 'Cartes solo', icone: '🕷️',
  description: 'Solitaire à 104 cartes, 1, 2 ou 4 couleurs.',
  regles: '<p>Le but : former <b>8 suites complètes</b> de la même couleur, du <b>roi à l\'as</b>. Chaque suite complète disparaît du tableau.</p><ul><li>Une carte se pose sur une carte de <b>valeur immédiatement supérieure</b> (quelle que soit la couleur).</li><li>On ne déplace ensemble que des cartes <b>de la même couleur en ordre décroissant</b>.</li><li>Une colonne vide accepte n\'importe quelle carte.</li><li>Cliquez sur la <b>pioche</b> pour distribuer une carte face visible sur chaque colonne (impossible si une colonne est vide).</li></ul><p>Choisissez 1, 2 ou 4 couleurs : plus il y en a, plus c\'est difficile.</p>',
  score: { libelle: 'meilleur score', sens: 'haut', suffixe: ' pts' },
  neuf: (o) => neufAvec(PAR_NIVEAU[o.difficulte]),
  valide: (x) => !!x && !!(x as Etat).jeu && Array.isArray((x as Etat).jeu.colonnes),
  vue(h) {
    const e = h.etat;
    const j = e.jeu;
    const reste = Math.floor(j.talon.length / 10);
    const talon = reste
      ? el('button', { class: 'pioche-btn', 'aria-label': `Distribuer (${reste} restantes)`, onclick: () => {
        if (!peutDistribuer(j)) { h.son('erreur'); return; }
        memoriser(e);
        distribuer(j);
        apres(h, false);
      } }, elCarte(null), el('span', { class: 'k-compte' }, `×${reste}`))
      : el('div', { class: 'emplacement' });
    const tableau = el('div', { class: 'k-tableau sp-tableau' }, ...j.colonnes.map((col, c) =>
      colonneCartes(col.map((carte, i) => ({
        carte: carte.visible ? carte : null,
        choisie: selection?.col === c && i >= selection.index,
        onclick: carte.visible ? () => cliquer(h, c, i) : undefined,
      })), { cache: 12, visible: 24, onFond: () => cliquer(h, c, null) })));
    h.ctx.conteneur.append(
      choix('Couleurs :', [[1, '1 couleur'], [2, '2 couleurs'], [4, '4 couleurs']] as Array<[number, string]>, j.couleurs, (n) => h.recommencer(() => neufAvec(n as 1 | 2 | 4))),
      infos(['Score', j.score], ['Suites', `${j.suites} / 8`], ['Temps', formaterTemps(e.secondes)]),
      message(e.fini ? `Bravo ! Les 8 suites en ${formaterTemps(e.secondes)} (${j.score} points).` : '', e.fini ? 'gagne' : ''),
      el('div', { class: 'tapis k-table' }, el('div', { class: 'k-haut' }, talon, el('span', {})), tableau),
      astuce('Cliquez le début d\'une suite, puis la colonne de destination'),
    );
  },
  demarre(h) {
    selection = null;
    h.intervalle(() => {
      if (h.etat.fini) return;
      h.etat.secondes++;
      const t = h.ctx.conteneur.querySelectorAll('.infos .val')[2];
      if (t) t.textContent = formaterTemps(h.etat.secondes);
    }, 1000);
  },
  annuler(h) {
    const e = h.etat;
    const p = e.historique.pop();
    if (!p || e.fini) return;
    e.jeu = p;
    selection = null;
    h.render();
    h.sauver();
  },
});

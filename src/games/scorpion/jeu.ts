import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import { elCarte } from '../../shared/cartes';
import { colonneCartes } from '../../shared/tableau';
import { cloner, deplacer, distribuer, gagne, nouvelle, peutDeplacer, peutDistribuer, type Etat as EtatSc } from './logique';

interface Etat { jeu: EtatSc; historique: EtatSc[]; secondes: number; fini: boolean }

const neuf = (): Etat => ({ jeu: nouvelle(), historique: [], secondes: 0, fini: false });
let selection: { col: number; index: number } | null = null;

function memoriser(e: Etat): void {
  e.historique.push(cloner(e.jeu));
  if (e.historique.length > 150) e.historique.shift();
}

function apres(h: Hote<Etat>, suites: number): void {
  const e = h.etat;
  selection = null;
  h.son(suites ? 'gagne' : 'pose');
  if (gagne(e.jeu)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.secondes }); }
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
      return apres(h, deplacer(j, s.col, s.index, col).suites);
    }
    if (index === null || (s.col === col && s.index === index)) { selection = null; return h.render(); }
  }
  if (index !== null && j.colonnes[col]![index]?.visible) { selection = { col, index }; h.son('clic'); } else { selection = null; if (index !== null) h.son('erreur'); }
  h.render();
}

export const jeuScorpion = fabrique<Etat>({
  id: 'scorpion', nom: 'Scorpion', famille: 'Cartes solo', icone: '🦂',
  description: 'Quatre suites du roi à l\'as, sans contrainte de séquence.',
  regles: '<p>Le but : former <b>4 suites complètes de même couleur, du roi à l\'as</b> (elles sont retirées du jeu une fois terminées).</p><ul><li>Une carte se pose sur une carte <b>de même couleur et de valeur immédiatement supérieure</b>.</li><li>On peut déplacer <b>n\'importe quelle carte visible</b> : toutes les cartes qui sont sous elle la suivent, même si elles ne forment pas une suite.</li><li>Seul un <b>roi</b> (avec ce qui le suit) peut aller sur une colonne vide.</li><li>Les <b>3 cartes de réserve</b> (en haut à gauche) sont distribuées sur les trois premières colonnes en cliquant dessus, à n\'importe quel moment.</li></ul>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  neuf,
  valide: (x) => !!x && !!(x as Etat).jeu && Array.isArray((x as Etat).jeu.colonnes),
  vue(h) {
    const e = h.etat;
    const j = e.jeu;
    const reserve = peutDistribuer(j)
      ? el('button', { class: 'pioche-btn', 'aria-label': 'Distribuer la réserve', onclick: () => { memoriser(e); distribuer(j); apres(h, 0); } }, elCarte(null), el('span', { class: 'k-compte' }, '3'))
      : el('div', { class: 'emplacement' });
    const tableau = el('div', { class: 'k-tableau' }, ...j.colonnes.map((col, c) =>
      colonneCartes(col.map((carte, i) => ({
        carte: carte.visible ? carte : null,
        choisie: selection?.col === c && i >= selection.index,
        onclick: carte.visible ? () => cliquer(h, c, i) : undefined,
      })), { onFond: () => cliquer(h, c, null) })));
    h.ctx.conteneur.append(
      infos(['Suites', `${j.suites} / 4`], ['Coups', j.coups], ['Temps', formaterTemps(e.secondes)]),
      message(e.fini ? `Bravo ! Les 4 suites en ${formaterTemps(e.secondes)}.` : '', e.fini ? 'gagne' : ''),
      el('div', { class: 'tapis k-table' }, el('div', { class: 'k-haut' }, reserve, el('span', {})), tableau),
      astuce('Cliquez une carte puis sa destination : les cartes en dessous la suivent'),
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

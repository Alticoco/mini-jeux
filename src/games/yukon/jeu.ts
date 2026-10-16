import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import { COULEURS, SYMBOLE, elCarte } from '../../shared/cartes';
import { colonneCartes } from '../../shared/tableau';
import { cloner, deplacer, gagne, nouvelle, pasAuto, peutDeplacer, peutFondation, toutVisible, versFondation, type Etat as EtatY } from './logique';

interface Etat { jeu: EtatY; historique: EtatY[]; secondes: number; fini: boolean }

const neuf = (): Etat => ({ jeu: nouvelle(), historique: [], secondes: 0, fini: false });
let selection: { col: number; index: number } | null = null;
let dernierClic: { cle: string; t: number } | null = null;
let finAuto: number | undefined;

function memoriser(e: Etat): void {
  e.historique.push(cloner(e.jeu));
  if (e.historique.length > 150) e.historique.shift();
}

function apres(h: Hote<Etat>): void {
  const e = h.etat;
  selection = null;
  h.son('pose');
  if (gagne(e.jeu)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.secondes }); }
  h.render();
  h.sauver();
}

function cliquer(h: Hote<Etat>, col: number, index: number | null): void {
  const e = h.etat;
  if (e.fini) return;
  const j = e.jeu;
  const now = Date.now();
  const cle = `${col}-${index}`;
  const double = index !== null && dernierClic?.cle === cle && now - dernierClic.t < 400;
  dernierClic = { cle, t: now };
  if (double && index === j.colonnes[col]!.length - 1 && peutFondation(j, col)) {
    memoriser(e);
    versFondation(j, col);
    return apres(h);
  }
  if (selection) {
    const s = selection;
    if (s.col !== col && peutDeplacer(j, s.col, s.index, col)) {
      memoriser(e);
      deplacer(j, s.col, s.index, col);
      return apres(h);
    }
    if (index === null || (s.col === col && s.index === index)) { selection = null; return h.render(); }
  }
  if (index !== null && j.colonnes[col]![index]?.visible) { selection = { col, index }; h.son('clic'); } else { selection = null; if (index !== null) h.son('erreur'); }
  h.render();
}

export const jeuYukon = fabrique<Etat>({
  id: 'yukon', nom: 'Yukon', famille: 'Cartes solo', icone: '🏔️',
  description: 'Un Klondike où l\'on déplace n\'importe quelle pile.',
  regles: '<p>Rangez les 52 cartes dans les <b>4 fondations</b> (une par couleur, de l\'as au roi).</p><ul><li>Dans les 7 colonnes, une carte se pose sur une carte de <b>couleur opposée</b> (rouge / noir) et de <b>valeur immédiatement supérieure</b>.</li><li>On peut déplacer <b>n\'importe quelle carte visible</b> avec toutes celles qui sont sous elle, même si elles ne forment pas une suite.</li><li>Seul un <b>roi</b> peut aller sur une colonne vide.</li><li><b>Double-clic</b> sur la carte du bas d\'une colonne : envoi à la fondation.</li></ul><p>Il n\'y a pas de pioche : toutes les cartes sont déjà sur le tapis.</p>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  neuf,
  valide: (x) => !!x && !!(x as Etat).jeu && Array.isArray((x as Etat).jeu.colonnes),
  vue(h) {
    const e = h.etat;
    const j = e.jeu;
    const fondations = el('div', { class: 'k-fondations' }, ...COULEURS.map((couleur, f) => {
      const pile = j.fondations[f]!;
      return el('div', { class: 'k-fondation' }, pile.length ? elCarte(pile.at(-1)!) : el('div', { class: 'emplacement', 'aria-label': `Fondation ${couleur}` }, SYMBOLE[couleur]));
    }));
    const tableau = el('div', { class: 'k-tableau' }, ...j.colonnes.map((col, c) =>
      colonneCartes(col.map((carte, i) => ({
        carte: carte.visible ? carte : null,
        choisie: selection?.col === c && i >= selection.index,
        onclick: carte.visible ? () => cliquer(h, c, i) : undefined,
      })), { onFond: () => cliquer(h, c, null) })));
    h.ctx.conteneur.append(
      infos(['Coups', j.coups], ['Temps', formaterTemps(e.secondes)]),
      message(e.fini ? `Bravo ! Gagné en ${formaterTemps(e.secondes)}.` : '', e.fini ? 'gagne' : ''),
      el('div', { class: 'tapis k-table' }, el('div', { class: 'k-haut' }, el('span', {}), fondations), tableau),
      ...(toutVisible(j) && !e.fini ? [el('button', { class: 'btn primaire', onclick: () => {
        memoriser(e);
        finAuto = h.intervalle(() => {
          if (!pasAuto(j)) { h.stop(finAuto!); h.render(); return; }
          h.son('pose');
          if (gagne(j)) { e.fini = true; h.stop(finAuto!); h.son('gagne'); h.fin({ victoire: true, score: e.secondes }); }
          h.render();
          h.sauver();
        }, 110);
      } }, '✨ Envoyer aux fondations')] : []),
      astuce('Cliquez une carte puis sa destination · double-clic : fondation'),
    );
  },
  demarre(h) {
    selection = null;
    h.intervalle(() => {
      if (h.etat.fini) return;
      h.etat.secondes++;
      const t = h.ctx.conteneur.querySelectorAll('.infos .val')[1];
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

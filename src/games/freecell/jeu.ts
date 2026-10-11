import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import { COULEURS, SYMBOLE, elCarte } from '../../shared/cartes';
import { colonneCartes } from '../../shared/tableau';
import { cloner, destinationAuto, deplacer, gagne, nouvelle, pasAuto, peutDeplacer, cartesSource, terminable, type Destination, type Etat as EtatFC, type Source } from './logique';

interface Etat { jeu: EtatFC; historique: EtatFC[]; secondes: number; fini: boolean }

const neuf = (): Etat => ({ jeu: nouvelle(), historique: [], secondes: 0, fini: false });
let selection: Source | null = null;
let dernierClic: { cle: string; t: number } | null = null;
let finAuto: number | undefined;

const meme = (a: Source | null, b: Source) => a !== null && JSON.stringify(a) === JSON.stringify(b);

function appliquer(h: Hote<Etat>, s: Source, d: Destination): boolean {
  const e = h.etat;
  const avant = cloner(e.jeu);
  if (!deplacer(e.jeu, s, d)) { h.son('erreur'); return false; }
  e.historique.push(avant);
  if (e.historique.length > 100) e.historique.shift();
  selection = null;
  h.son('pose');
  if (gagne(e.jeu)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.jeu.coups }); }
  h.render();
  h.sauver();
  return true;
}

function cliquerCarte(h: Hote<Etat>, s: Source, cle: string): void {
  const e = h.etat;
  if (e.fini || !cartesSource(e.jeu, s) && !selection) return;
  const now = Date.now();
  const double = dernierClic?.cle === cle && now - dernierClic.t < 400;
  dernierClic = { cle, t: now };
  if (double && cartesSource(e.jeu, s)) {
    const d = destinationAuto(e.jeu, s);
    if (d && appliquer(h, s, d)) return;
  }
  if (selection && !meme(selection, s)) {
    const dest: Destination | null = s.type === 'colonne' ? { type: 'colonne', col: s.col } : null;
    if (dest && peutDeplacer(e.jeu, selection, dest)) { appliquer(h, selection, dest); return; }
  }
  selection = meme(selection, s) || !cartesSource(e.jeu, s) ? null : s;
  h.son('clic');
  h.render();
}

function cliquerDest(h: Hote<Etat>, d: Destination): void {
  if (!selection || h.etat.fini) return;
  appliquer(h, selection, d);
}

export const jeuFreeCell = fabrique<Etat>({
  id: 'freecell', nom: 'FreeCell', famille: 'Cartes solo', icone: '🂡',
  description: 'Solitaire sans hasard : tout est visible.',
  regles: '<p>Toutes les cartes sont visibles. Rangez-les dans les <b>4 fondations</b> (une par couleur, de l\'as au roi).</p><ul><li>Dans les <b>8 colonnes</b>, on empile en ordre <b>décroissant</b> en <b>alternant les couleurs</b>.</li><li>Les <b>4 cellules libres</b> (en haut à gauche) servent de parking : une carte par cellule.</li><li>On peut déplacer plusieurs cartes d\'une suite d\'un coup, dans la limite des cellules et colonnes vides disponibles.</li></ul><p>Cliquez une carte puis sa destination. <b>Double-clic</b> : envoi vers la fondation, sinon vers une cellule libre.</p>',
  score: { libelle: 'moins de coups', sens: 'bas', suffixe: ' coups' },
  neuf,
  valide: (x) => !!x && !!(x as Etat).jeu && Array.isArray((x as Etat).jeu.colonnes),
  vue(h) {
    const e = h.etat;
    const j = e.jeu;
    const cellules = el('div', { class: 'fc-cellules' }, ...j.cellules.map((c, i) => {
      const src: Source = { type: 'cellule', i };
      return el('div', { class: 'fc-cellule', onclick: () => (c ? cliquerCarte(h, src, `x${i}`) : cliquerDest(h, { type: 'cellule', i })) },
        c ? elCarte(c, { class: meme(selection, src) ? 'choisie' : '' }) : el('div', { class: 'emplacement' }));
    }));
    const fondations = el('div', { class: 'k-fondations' }, ...COULEURS.map((couleur, f) => {
      const pile = j.fondations[f]!;
      return el('div', { class: 'k-fondation', onclick: () => cliquerDest(h, { type: 'fondation' }) },
        pile.length ? elCarte(pile[pile.length - 1]!) : el('div', { class: 'emplacement', 'aria-label': `Fondation ${couleur}` }, SYMBOLE[couleur]));
    }));
    const tableau = el('div', { class: 'k-tableau fc-tableau' }, ...j.colonnes.map((col, c) =>
      colonneCartes(col.map((carte, i) => {
        const src: Source = { type: 'colonne', col: c, index: i };
        const choisie = selection?.type === 'colonne' && selection.col === c && i >= selection.index;
        return { carte, choisie, onclick: () => cliquerCarte(h, src, `c${c}-${i}`) };
      }), { onFond: () => cliquerDest(h, { type: 'colonne', col: c }) })));
    h.ctx.conteneur.append(
      infos(['Coups', j.coups], ['Temps', formaterTemps(e.secondes)]),
      message(e.fini ? `Bravo ! Gagné en ${j.coups} coups (${formaterTemps(e.secondes)}).` : '', e.fini ? 'gagne' : ''),
      el('div', { class: 'tapis k-table' }, el('div', { class: 'k-haut' }, cellules, fondations), tableau),
      ...(terminable(j) && !e.fini ? [el('button', { class: 'btn primaire', onclick: () => {
        window.clearInterval(finAuto);
        const av = cloner(j);
        e.historique.push(av);
        finAuto = h.intervalle(() => {
          if (!pasAuto(j)) { h.stop(finAuto!); return; }
          h.son('pose');
          if (gagne(j)) { e.fini = true; h.stop(finAuto!); h.son('gagne'); h.fin({ victoire: true, score: j.coups }); }
          h.render();
          h.sauver();
        }, 110);
      } }, '✨ Terminer automatiquement')] : []),
      astuce('Cliquez une carte puis sa destination · double-clic : fondation / cellule'),
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

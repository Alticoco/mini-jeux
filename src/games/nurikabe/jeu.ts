import { astuce, choix, fabrique, infos, message } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import { generer, verifier, type Puzzle } from './logique';

interface Etat { n: number; puzzle: Puzzle; etat: number[]; verif: boolean; secondes: number; fini: boolean; historique: Array<[number, number]> }

const TAILLES = { facile: 5, moyen: 7, difficile: 9 } as const;
const neufAvec = (n: number): Etat => ({ n, puzzle: generer(n).puzzle, etat: Array<number>(n * n).fill(0), verif: false, secondes: 0, fini: false, historique: [] });

export const jeuNurikabe = fabrique<Etat>({
  id: 'nurikabe', nom: 'Nurikabe', famille: 'Puzzles', icone: '🏝️',
  description: 'Dessinez des îles entourées par la mer.',
  regles: '<p>La grille contient des <b>îles</b> (cases blanches) entourées d\'une <b>mer</b> (cases noires). Les nombres indiquent la <b>taille</b> de l\'île à laquelle ils appartiennent.</p><ul><li>Chaque île contient <b>un seul nombre</b>, égal au nombre de cases de l\'île.</li><li>Deux îles ne se touchent pas par un côté.</li><li>Toute la mer forme <b>un seul bloc</b> relié.</li><li>La mer ne contient <b>aucun carré de 2×2</b> cases.</li></ul><p><b>Clic</b> : mer ⬛ puis point · (case blanche), puis vide. Le bouton « Vérifier » surligne les erreurs.</p>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  neuf: (o) => neufAvec(TAILLES[o.difficulte]),
  valide: (x) => !!x && !!(x as Etat).puzzle && Array.isArray((x as Etat).etat),
  vue(h) {
    const e = h.etat;
    const v = e.verif ? verifier(e.puzzle, e.etat) : null;
    const plateau = el('div', { class: 'plateau nuri-grille', style: `grid-template-columns: repeat(${e.n}, 1fr)` },
      ...e.puzzle.nombres.map((nb, i) => el('button', {
        class: `case nuri-case${e.etat[i] === 1 ? ' mer' : ''}${nb ? ' numero' : ''}${v && (v.ilesFausses.includes(i) || v.piscines.some((p) => [p, p + 1, p + e.n, p + e.n + 1].includes(i))) ? ' erreur' : ''}`,
        disabled: e.fini || nb > 0, 'aria-label': `Ligne ${Math.floor(i / e.n) + 1} colonne ${(i % e.n) + 1}${nb ? `, île de ${nb}` : ''}`,
        onclick: () => {
          e.historique.push([i, e.etat[i]!]);
          e.etat[i] = (e.etat[i]! + 1) % 3;
          e.verif = false;
          h.son('clic');
          if (verifier(e.puzzle, e.etat).ok) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.secondes }); }
          h.render();
          h.sauver();
        },
      }, nb ? String(nb) : e.etat[i] === 2 ? '·' : '')));
    const probleme = v ? (v.ok ? 'Tout est correct !' : v.piscines.length ? 'La mer contient un carré de 2×2.' : v.ilesFausses.length ? 'Une île est incorrecte.' : 'La mer n\'est pas reliée.') : '';
    h.ctx.conteneur.append(
      choix('Taille :', [[5, '5×5'], [7, '7×7'], [9, '9×9']] as Array<[number, string]>, e.n, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Temps', formaterTemps(e.secondes)]),
      message(e.fini ? `Bravo ! Résolu en ${formaterTemps(e.secondes)}.` : probleme, e.fini ? 'gagne' : ''),
      plateau,
      el('div', { class: 'rangee' }, el('button', { class: 'btn', disabled: e.fini, onclick: () => { e.verif = true; h.render(); } }, '🔍 Vérifier')),
      astuce('Clic : mer → point (terre) → vide'),
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
    e.etat[d[0]] = d[1];
    e.verif = false;
    h.render();
    h.sauver();
  },
});

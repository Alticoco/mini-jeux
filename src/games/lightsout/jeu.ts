import { astuce, choix, fabrique, infos, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { N, basculer, eteint, melanger } from './logique';

interface Etat { grille: boolean[]; coups: number; appuis: number; fini: boolean }

const parNiveau = { facile: 4, moyen: 8, difficile: 14 } as const;
const neufAvec = (appuis: number): Etat => ({ grille: melanger(appuis), coups: 0, appuis, fini: false });

export const jeuLightsOut = fabrique<Etat>({
  id: 'lightsout', nom: 'Lights Out', famille: 'Puzzles', icone: '💡',
  description: 'Éteignez toutes les lumières.',
  regles: '<p>Le but : <b>éteindre toutes les lumières</b> de la grille.</p><p>Cliquer sur une case la bascule <b>ainsi que ses 4 voisines</b> (haut, bas, gauche, droite). Trouvez la bonne combinaison avec le moins de coups possible.</p>',
  score: { libelle: 'moins de coups', sens: 'bas', suffixe: ' coups' },
  neuf: (o) => neufAvec(parNiveau[o.difficulte]),
  valide: (x) => !!x && Array.isArray((x as Etat).grille) && (x as Etat).grille.length === N * N,
  vue(h) {
    const e = h.etat;
    const grille = el('div', { class: 'plateau lo-grille', style: `grid-template-columns: repeat(${N}, 1fr)` },
      ...e.grille.map((on, i) => el('button', {
        class: `case lo-case${on ? ' allume' : ''}`, 'aria-label': `Case ${i + 1} ${on ? 'allumée' : 'éteinte'}`, disabled: e.fini,
        onclick: () => {
          basculer(e.grille, i);
          e.coups++;
          h.son('clic');
          if (eteint(e.grille)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.coups }); }
          h.render();
          h.sauver();
        },
      })));
    h.ctx.conteneur.append(
      choix('Difficulté :', [[4, 'Facile'], [8, 'Moyen'], [14, 'Difficile']] as Array<[number, string]>, e.appuis, (a) => h.recommencer(() => neufAvec(a))),
      infos(['Coups', e.coups]),
      message(e.fini ? `Bravo ! Tout est éteint en ${e.coups} coups.` : '', e.fini ? 'gagne' : ''),
      grille, astuce('Chaque clic bascule la case et ses voisines'),
    );
  },
});

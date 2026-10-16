import { astuce, choix, fabrique, infos, message } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import { generer, resolu, verifier, type Puzzle } from './logique';

interface Etat { n: number; puzzle: Puzzle; etat: number[]; verif: boolean; secondes: number; fini: boolean; historique: Array<[number, number]> }

const TAILLES = { facile: 5, moyen: 7, difficile: 9 } as const;
const neufAvec = (n: number): Etat => ({ n, puzzle: generer(n, 0.3).puzzle, etat: Array<number>(n * n).fill(0), verif: false, secondes: 0, fini: false, historique: [] });

export const jeuHitori = fabrique<Etat>({
  id: 'hitori', nom: 'Hitori', famille: 'Puzzles', icone: '⬛',
  description: 'Noircissez les doublons sans casser la grille.',
  regles: '<p>Noircissez certaines cases pour que :</p><ul><li>aucun chiffre n\'apparaisse <b>deux fois</b> dans une même ligne ou colonne (parmi les cases non noircies) ;</li><li>deux cases noires ne se <b>touchent jamais</b> par un côté ;</li><li>toutes les cases blanches restent <b>reliées</b> entre elles (en un seul bloc).</li></ul><p><b>Clic</b> : noircir / déséquilibrer · <b>clic droit</b> (ou Maj+clic) : marquer une case comme blanche ⭕. Le bouton « Vérifier » surligne les erreurs.</p>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  neuf: (o) => neufAvec(TAILLES[o.difficulte]),
  valide: (x) => !!x && !!(x as Etat).puzzle && Array.isArray((x as Etat).etat),
  vue(h) {
    const e = h.etat;
    const v = e.verif ? verifier(e.puzzle, e.etat) : null;
    const agir = (i: number, droit: boolean) => {
      if (e.fini) return;
      e.historique.push([i, e.etat[i]!]);
      const cible = droit ? 2 : 1;
      e.etat[i] = e.etat[i] === cible ? 0 : cible;
      e.verif = false;
      h.son('clic');
      if (resolu(e.puzzle, e.etat) && e.etat.some((x) => x === 1)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.secondes }); }
      h.render();
      h.sauver();
    };
    const plateau = el('div', { class: 'plateau hitori-grille', style: `grid-template-columns: repeat(${e.n}, 1fr)` },
      ...e.puzzle.nombres.map((nb, i) => {
        const b = el('button', {
          class: `case hit-case${e.etat[i] === 1 ? ' noire' : ''}${e.etat[i] === 2 ? ' blanche' : ''}${v && (v.doublons.has(i) || v.contacts.has(i)) ? ' erreur' : ''}`, disabled: e.fini,
          'aria-label': `Ligne ${Math.floor(i / e.n) + 1} colonne ${(i % e.n) + 1} : ${nb}`,
          onclick: (ev: Event) => agir(i, (ev as MouseEvent).shiftKey),
        }, String(nb));
        b.addEventListener('contextmenu', (ev) => { ev.preventDefault(); agir(i, true); });
        return b;
      }));
    const probleme = v ? (v.contacts.size ? 'Deux cases noires se touchent.' : v.doublons.size ? 'Il reste des doublons.' : !v.connexe ? 'Les cases blanches ne sont pas toutes reliées.' : 'Tout est correct !') : '';
    h.ctx.conteneur.append(
      choix('Taille :', [[5, '5×5'], [7, '7×7'], [9, '9×9']] as Array<[number, string]>, e.n, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Temps', formaterTemps(e.secondes)]),
      message(e.fini ? `Bravo ! Résolu en ${formaterTemps(e.secondes)}.` : probleme, e.fini ? 'gagne' : ''),
      plateau,
      el('div', { class: 'rangee' }, el('button', { class: 'btn', disabled: e.fini, onclick: () => { e.verif = true; h.render(); } }, '🔍 Vérifier')),
      astuce('Clic : noircir · Clic droit : marquer blanche'),
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

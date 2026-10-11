import { astuce, choix, fabrique, infos, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { deplacer, gagne, initiales, minimumCoups, type Tours } from './logique';

interface Etat { n: number; tours: Tours; coups: number; sel: number | null; fini: boolean }

const parNiveau = { facile: 3, moyen: 5, difficile: 7 } as const;
const neufAvec = (n: number): Etat => ({ n, tours: initiales(n), coups: 0, sel: null, fini: false });

export const jeuHanoi = fabrique<Etat>({
  id: 'hanoi', nom: 'Tours de Hanoï', famille: 'Puzzles', icone: '🗼',
  description: 'Déplacez la pile de disques.',
  regles: '<p>Déplacez tous les disques de la <b>première tour</b> vers la <b>dernière</b>.</p><ul><li>Un seul disque à la fois (celui du dessus).</li><li>Un disque ne peut jamais être posé sur un disque <b>plus petit</b>.</li></ul><p>Cliquez sur une tour pour prendre son disque du dessus, puis sur la tour de destination. Le minimum est de 2ⁿ − 1 coups pour n disques.</p>',
  score: { libelle: 'moins de coups', sens: 'bas', suffixe: ' coups' },
  neuf: (o) => neufAvec(parNiveau[o.difficulte]),
  valide: (x) => !!x && Array.isArray((x as Etat).tours) && (x as Etat).tours.length === 3,
  vue(h) {
    const e = h.etat;
    const tours = el('div', { class: 'hanoi-tours' }, ...e.tours.map((t, i) => {
      const tour = el('button', {
        class: `hanoi-tour${e.sel === i ? ' choisie' : ''}`, 'aria-label': `Tour ${i + 1}, ${t.length} disques`, disabled: e.fini,
        onclick: () => {
          if (e.sel === null) { if (t.length) e.sel = i; h.render(); return; }
          if (e.sel !== i && deplacer(e.tours, e.sel, i)) {
            e.coups++;
            h.son('pose');
            if (gagne(e.tours, e.n)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.coups }); }
          } else if (e.sel !== i) h.son('erreur');
          e.sel = null;
          h.render();
          h.sauver();
        },
      });
      tour.append(el('div', { class: 'hanoi-axe' }));
      t.forEach((d, k) => tour.append(el('div', { class: 'hanoi-disque', style: `width:${30 + (d / e.n) * 70}%;bottom:${k * 22 + 4}px;background:hsl(${(d * 360) / (e.n + 1)} 65% 55%)` })));
      return tour;
    }));
    h.ctx.conteneur.append(
      choix('Disques :', [3, 4, 5, 6, 7, 8].map((n) => [n, String(n)] as [number, string]), e.n, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Coups', e.coups], ['Minimum', minimumCoups(e.n)]),
      message(e.fini ? `Bravo ! Résolu en ${e.coups} coups${e.coups === minimumCoups(e.n) ? ' (parfait !)' : ''}.` : '', e.fini ? 'gagne' : ''),
      tours, astuce('Cliquez sur une tour, puis sur la destination'),
    );
  },
});

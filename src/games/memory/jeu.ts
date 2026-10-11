import { melanger } from '../../shared/alea';
import { astuce, choix, fabrique, infos, message } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';

interface Carte { sym: string; retournee: boolean; trouvee: boolean }
interface Etat { paires: number; cartes: Carte[]; coups: number; secondes: number; premiere: number | null; verrou: boolean; fini: boolean }

const SYMBOLES = ['🐶', '🐱', '🦊', '🐼', '🦁', '🐸', '🐙', '🦋', '🍎', '🍋', '🍇', '🍓', '⚽', '🎲', '🎸', '🚀', '🌵', '🌙'];
const COLONNES: Record<number, number> = { 6: 4, 10: 5, 18: 6 };
const PAR_NIVEAU = { facile: 6, moyen: 10, difficile: 18 } as const;

const neufAvec = (paires: number): Etat => ({
  paires, coups: 0, secondes: 0, premiere: null, verrou: false, fini: false,
  cartes: melanger(SYMBOLES.slice(0, paires).flatMap((sym) => [{ sym, retournee: false, trouvee: false }, { sym, retournee: false, trouvee: false }])),
});

export const jeuMemory = fabrique<Etat>({
  id: 'memory', nom: 'Memory', famille: 'Hasard et mémoire', icone: '🧠',
  description: 'Retrouvez toutes les paires.',
  regles: '<p>Toutes les cartes sont face cachée. Retournez-en <b>deux</b> à chaque tour : si elles sont identiques, elles restent visibles ; sinon, elles se recachent.</p><p>Retrouvez toutes les paires avec le moins de <b>coups</b> possible. Le niveau règle le nombre de cartes.</p>',
  score: { libelle: 'moins de coups', sens: 'bas', suffixe: ' coups' },
  neuf: (o) => neufAvec(PAR_NIVEAU[o.difficulte]),
  valide: (x) => !!x && Array.isArray((x as Etat).cartes),
  vue(h) {
    const e = h.etat;
    const clic = (i: number) => {
      const c = e.cartes[i]!;
      if (e.verrou || e.fini || c.retournee || c.trouvee) return;
      c.retournee = true;
      h.son('clic');
      if (e.premiere === null) { e.premiere = i; h.render(); return; }
      const p = e.cartes[e.premiere]!;
      e.coups++;
      if (p.sym === c.sym) {
        p.trouvee = c.trouvee = true;
        p.retournee = c.retournee = false;
        e.premiere = null;
        h.son('pose');
        if (e.cartes.every((k) => k.trouvee)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.coups }); }
        h.render();
        h.sauver();
      } else {
        e.verrou = true;
        e.premiere = null;
        h.render();
        h.delai(() => { p.retournee = c.retournee = false; e.verrou = false; h.render(); h.sauver(); }, 800);
      }
    };
    const grille = el('div', { class: 'plateau memory-grille', style: `grid-template-columns: repeat(${COLONNES[e.paires]}, 1fr)` },
      ...e.cartes.map((c, i) => el('button', {
        class: `case memory-carte${c.retournee || c.trouvee ? ' ouverte' : ''}${c.trouvee ? ' trouvee' : ''}`,
        'aria-label': c.retournee || c.trouvee ? `Carte ${c.sym}` : 'Carte cachée', onclick: () => clic(i),
      }, c.retournee || c.trouvee ? c.sym : '')));
    h.ctx.conteneur.append(
      choix('Cartes :', [[6, '12'], [10, '20'], [18, '36']] as Array<[number, string]>, e.paires, (p) => h.recommencer(() => neufAvec(p))),
      infos(['Coups', e.coups], ['Temps', formaterTemps(e.secondes)]),
      message(e.fini ? `Bravo ! Toutes les paires en ${e.coups} coups (${formaterTemps(e.secondes)}).` : '', e.fini ? 'gagne' : ''),
      grille, astuce('Cliquez sur deux cartes pour les retourner'),
    );
  },
  demarre(h) {
    // une paire non assortie en cours lors d'une sauvegarde est recachée
    for (const c of h.etat.cartes) if (!c.trouvee) c.retournee = false;
    h.etat.premiere = null;
    h.etat.verrou = false;
    h.render();
    h.intervalle(() => {
      if (h.etat.fini || (h.etat.coups === 0 && h.etat.premiere === null)) return;
      h.etat.secondes++;
      const infosEl = h.ctx.conteneur.querySelectorAll('.infos .val')[1];
      if (infosEl) infosEl.textContent = formaterTemps(h.etat.secondes);
    }, 1000);
  },
});

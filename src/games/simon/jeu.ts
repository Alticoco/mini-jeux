import { entier } from '../../shared/alea';
import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { statsDe } from '../../core/stats';

interface Etat { suite: number[]; pos: number; phase: 'attente' | 'montre' | 'joueur' | 'perdu'; actif: number | null; fini: boolean }

const NOTES = [329.6, 261.6, 220, 164.8];
const NOMS = ['vert', 'rouge', 'jaune', 'bleu'];
const VITESSE = { facile: 800, moyen: 600, difficile: 420 } as const;

export const jeuSimon = fabrique<Etat>({
  id: 'simon', nom: 'Simon', famille: 'Hasard et mémoire', icone: '🎹',
  description: 'Répétez la suite de couleurs.',
  regles: '<p>Le jeu allume une <b>suite de couleurs</b> accompagnée de sons. Répétez-la dans le même ordre en cliquant sur les touches (ou avec les touches <b>1 2 3 4</b>).</p><p>À chaque réussite, la suite s\'allonge d\'une couleur. Une erreur met fin à la partie. Votre score est la longueur de la plus longue suite réussie.</p>',
  score: { libelle: 'record', sens: 'haut', suffixe: ' couleurs' },
  neuf: () => ({ suite: [], pos: 0, phase: 'attente', actif: null, fini: false }),
  valide: () => false,
  sauvegardable: () => false,
  demarre(h) {
    h.clavier((ev) => { const k = Number(ev.key); if (k >= 1 && k <= 4) appui(h, k - 1); });
  },
  vue(h) {
    const e = h.etat;
    const pave = el('div', { class: 'simon-pave' }, ...NOMS.map((n, i) => el('button', {
      class: `simon-touche s${i}${e.actif === i ? ' allumee' : ''}`, 'aria-label': n, disabled: e.phase !== 'joueur' || undefined, onclick: () => appui(h, i),
    })));
    const manche = Math.max(0, e.suite.length - (e.phase === 'perdu' ? 1 : 0));
    h.ctx.conteneur.append(
      infos(['Manche', manche], ['Record', Math.max(statsDe('simon').meilleur ?? 0, manche)]),
      message(e.phase === 'attente' ? 'Cliquez sur « Commencer »' : e.phase === 'montre' ? 'Regardez bien…' : e.phase === 'joueur' ? 'À vous !' : `Perdu ! Vous avez réussi ${manche} couleur${manche > 1 ? 's' : ''}.`, e.phase === 'perdu' ? 'perdu' : ''),
      pave,
      ...(e.phase === 'attente' ? [el('button', { class: 'btn primaire', onclick: () => ajouter(h) }, 'Commencer')] : []),
      astuce('Touches 1 2 3 4 au clavier'),
    );
  },
});

function appui(h: Hote<Etat>, i: number): void {
  const e = h.etat;
  if (e.phase !== 'joueur') return;
  h.note(NOTES[i]!, 0.3);
  e.actif = i;
  h.render();
  h.delai(() => { e.actif = null; h.render(); }, 180);
  if (e.suite[e.pos] !== i) {
    e.phase = 'perdu';
    e.fini = true;
    h.son('perdu');
    h.fin({ victoire: false, score: e.suite.length - 1 });
    h.render();
    return;
  }
  e.pos++;
  if (e.pos === e.suite.length) { e.phase = 'montre'; h.delai(() => ajouter(h), 700); }
}

function ajouter(h: Hote<Etat>): void {
  const e = h.etat;
  e.suite.push(entier(4));
  e.pos = 0;
  e.phase = 'montre';
  h.render();
  const pas = VITESSE[h.ctx.options.difficulte];
  e.suite.forEach((c, k) => {
    h.delai(() => { e.actif = c; h.note(NOTES[c]!, pas / 1000 * 0.8); h.render(); }, 500 + k * pas);
    h.delai(() => { e.actif = null; h.render(); }, 500 + k * pas + pas * 0.6);
  });
  h.delai(() => { e.phase = 'joueur'; h.render(); }, 500 + e.suite.length * pas);
}

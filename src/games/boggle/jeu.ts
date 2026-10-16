import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { estMot } from '../../shared/dictionnaire';
import { normaliser } from '../pendu/logique';
import { N, existeChemin, genererGrille, points } from './logique';

interface Etat { grille: string[]; possibles: string[]; trouves: string[]; saisie: string; reste: number; texte: string; fini: boolean; score: number }

const DUREE = { facile: 240, moyen: 180, difficile: 120 } as const;
const neuf = (duree: number): Etat => {
  const { grille, mots } = genererGrille();
  return { grille, possibles: [...mots], trouves: [], saisie: '', reste: duree, texte: 'Trouvez des mots en reliant des lettres voisines.', fini: false, score: 0 };
};

function terminer(h: Hote<Etat>): void {
  const e = h.etat;
  e.fini = true;
  e.texte = `Temps écoulé ! ${e.trouves.length} mots, ${e.score} points.`;
  h.son('gagne');
  h.fin({ victoire: e.score > 0, score: e.score });
  h.render();
}

export const jeuBoggle = fabrique<Etat>({
  id: 'boggle', nom: 'Boggle', famille: 'Mots', icone: '🔠',
  description: 'Trouvez un maximum de mots dans la grille.',
  regles: '<p>Une grille de <b>16 lettres</b> et un compte à rebours. Formez des mots de <b>3 lettres ou plus</b> en reliant des lettres <b>voisines</b> (horizontalement, verticalement ou en diagonale), sans utiliser deux fois la même case dans un mot.</p><ul><li>Tapez le mot au clavier (ou cliquez les lettres) puis <b>Entrée</b>.</li><li>Points : 3-4 lettres = 1 · 5 = 2 · 6 = 3 · 7 = 5 · 8 et plus = 11.</li></ul><p>À la fin, la liste des mots que vous avez manqués est affichée. Le dictionnaire embarqué compte environ 1 500 mots courants.</p>',
  score: { libelle: 'meilleur score', sens: 'haut', suffixe: ' pts' },
  neuf: (o) => neuf(DUREE[o.difficulte]),
  valide: (x) => !!x && Array.isArray((x as Etat).grille) && (x as Etat).grille.length === N * N,
  sauvegardable: () => false,
  vue(h) {
    const e = h.etat;
    const valider = () => {
      const mot = normaliser(e.saisie).toLowerCase();
      e.saisie = '';
      if (mot.length < 3) e.texte = 'Mot trop court (3 lettres minimum).';
      else if (e.trouves.includes(mot)) e.texte = 'Déjà trouvé !';
      else if (!existeChemin(e.grille, mot)) e.texte = 'Ce mot n\'est pas dans la grille.';
      else if (!estMot(mot)) e.texte = 'Mot inconnu du dictionnaire.';
      else {
        e.trouves.push(mot);
        e.score += points(mot);
        e.texte = `« ${mot.toUpperCase()} » : +${points(mot)} point${points(mot) > 1 ? 's' : ''}`;
        h.son('pose');
        h.render();
        return;
      }
      h.son('erreur');
      h.render();
    };
    const grille = el('div', { class: 'plateau boggle-grille', style: `grid-template-columns: repeat(${N}, 1fr)` },
      ...e.grille.map((l) => el('button', { class: 'case boggle-case', disabled: e.fini, 'aria-label': `Lettre ${l}`, onclick: () => { e.saisie += l; h.render(); } }, l)));
    const champ = el('input', { type: 'text', class: 'boggle-champ', value: e.saisie, autocomplete: 'off', 'aria-label': 'Mot à valider', disabled: e.fini, oninput: () => { e.saisie = champ.value.toUpperCase().replace(/[^A-ZÀ-ÿ]/gi, ''); } });
    champ.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); e.saisie = champ.value; valider(); } });
    const manques = e.possibles.filter((m) => !e.trouves.includes(m)).sort((a, b) => b.length - a.length).slice(0, 24);
    h.ctx.conteneur.append(
      infos(['Temps', `${Math.floor(e.reste / 60)}:${String(e.reste % 60).padStart(2, '0')}`], ['Score', e.score], ['Mots', e.trouves.length]),
      message(e.texte, e.fini ? 'gagne' : ''),
      grille,
      el('div', { class: 'rangee' }, champ, el('button', { class: 'btn primaire', disabled: e.fini, onclick: () => { e.saisie = champ.value; valider(); } }, 'Valider'), el('button', { class: 'btn', disabled: e.fini, onclick: () => { e.saisie = ''; h.render(); } }, 'Effacer')),
      el('div', { class: 'boggle-trouves' }, ...e.trouves.map((m) => el('span', { class: 'mot-trouve' }, m.toUpperCase()))),
      ...(e.fini ? [el('div', { class: 'muet' }, `Mots possibles (${e.possibles.length}) — manqués : ${manques.map((m) => m.toUpperCase()).join(', ') || 'aucun !'}`)] : []),
      astuce('Tapez un mot puis Entrée'),
    );
    if (!e.fini) setTimeout(() => champ.focus(), 0);
  },
  demarre(h) {
    h.intervalle(() => {
      const e = h.etat;
      if (e.fini) return;
      e.reste--;
      if (e.reste <= 0) { e.reste = 0; terminer(h); return; }
      const t = h.ctx.conteneur.querySelector('.infos .val');
      if (t) t.textContent = `${Math.floor(e.reste / 60)}:${String(e.reste % 60).padStart(2, '0')}`;
    }, 1000);
  },
});

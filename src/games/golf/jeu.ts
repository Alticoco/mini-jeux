import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { elCarte } from '../../shared/cartes';
import { colonneCartes } from '../../shared/tableau';
import { bloque, gagne, jouer, nouvelle, piocher, restantes, type Etat as EtatGolf } from './logique';

interface Etat { jeu: EtatGolf; historique: EtatGolf[]; fini: boolean; perdu: boolean }

const neuf = (): Etat => ({ jeu: nouvelle(), historique: [], fini: false, perdu: false });

function verifier(h: Hote<Etat>): void {
  const e = h.etat;
  if (gagne(e.jeu)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.jeu.talon.length }); }
  else if (bloque(e.jeu)) { e.fini = e.perdu = true; h.son('perdu'); h.fin({ victoire: false }); }
  h.render();
  h.sauver();
}

function memoriser(e: Etat): void {
  e.historique.push(structuredClone(e.jeu));
  if (e.historique.length > 100) e.historique.shift();
}

export const jeuGolf = fabrique<Etat>({
  id: 'golf', nom: 'Golf', famille: 'Cartes solo', icone: '⛳',
  description: 'Videz les colonnes carte par carte.',
  regles: '<p>Le but : <b>vider les 7 colonnes</b>. Seule la carte du bas de chaque colonne peut être jouée.</p><ul><li>Posez-la sur la défausse si elle a une <b>valeur voisine</b> (une de plus ou une de moins) que la carte du dessus de la défausse, quelle que soit la couleur.</li><li>Le roi et l\'as ne sont <b>pas</b> voisins.</li><li>Sans coup possible, cliquez sur le <b>talon</b> pour retourner une nouvelle carte.</li></ul><p>Votre score est le nombre de cartes restant au talon quand vous gagnez : plus il est grand, mieux c\'est.</p>',
  score: { libelle: 'meilleur reste au talon', sens: 'haut', suffixe: ' cartes' },
  neuf,
  valide: (x) => !!x && !!(x as Etat).jeu && Array.isArray((x as Etat).jeu.colonnes),
  vue(h) {
    const e = h.etat;
    const j = e.jeu;
    const tableau = el('div', { class: 'k-tableau golf-tableau' }, ...j.colonnes.map((col, c) =>
      colonneCartes(col.map((carte, i) => ({ carte, onclick: i === col.length - 1 ? () => {
        if (e.fini) return;
        memoriser(e);
        if (jouer(j, c)) { h.son('pose'); verifier(h); } else { e.historique.pop(); h.son('erreur'); }
      } : undefined })), { cache: 22, visible: 22 })));
    const haut = j.defausse.at(-1);
    const talon = j.talon.length
      ? el('button', { class: 'pioche-btn', 'aria-label': 'Retourner une carte', disabled: e.fini, onclick: () => { memoriser(e); piocher(j); h.son('clic'); verifier(h); } }, elCarte(null), el('span', { class: 'k-compte' }, String(j.talon.length)))
      : el('div', { class: 'emplacement' });
    h.ctx.conteneur.append(
      infos(['Cartes restantes', restantes(j)], ['Talon', j.talon.length]),
      message(e.fini ? (e.perdu ? `Plus de coup possible : ${restantes(j)} cartes restantes. (Annuler pour reprendre)` : `Bravo ! Il vous restait ${j.talon.length} cartes au talon.`) : '', e.fini ? (e.perdu ? 'perdu' : 'gagne') : ''),
      el('div', { class: 'tapis k-table' }, tableau, el('div', { class: 'rangee' }, talon, haut ? elCarte(haut) : el('div', { class: 'emplacement' }))),
      astuce('Cliquez la carte du bas d\'une colonne si sa valeur est voisine de la défausse'),
    );
  },
  annuler(h) {
    const e = h.etat;
    const p = e.historique.pop();
    if (!p) return;
    e.jeu = p;
    e.fini = e.perdu = false;
    h.render();
    h.sauver();
  },
});

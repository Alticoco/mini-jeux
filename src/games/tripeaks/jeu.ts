import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { elCarte } from '../../shared/cartes';
import { POSITIONS, bloque, gagne, jouer, libre, nouvelle, peutJouer, piocher, restantes, type Etat as EtatTP } from './logique';

interface Etat { jeu: EtatTP; historique: EtatTP[]; fini: boolean; perdu: boolean }

const neuf = (): Etat => ({ jeu: nouvelle(), historique: [], fini: false, perdu: false });
const LARG = 64; // pas horizontal (px, échelle 1)
const HAUT = 40; // pas vertical

function verifier(h: Hote<Etat>): void {
  const e = h.etat;
  if (gagne(e.jeu)) { e.jeu.score += e.jeu.talon.length * 50; e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.jeu.score }); }
  else if (bloque(e.jeu)) { e.fini = e.perdu = true; h.son('perdu'); h.fin({ victoire: false }); }
  h.render();
  h.sauver();
}

function memoriser(e: Etat): void {
  e.historique.push(structuredClone(e.jeu));
  if (e.historique.length > 100) e.historique.shift();
}

export const jeuTriPeaks = fabrique<Etat>({
  id: 'tripeaks', nom: 'Tri-Peaks', famille: 'Cartes solo', icone: '⛰️',
  description: 'Escaladez les trois sommets.',
  regles: '<p>Le but : <b>dégager les trois montagnes</b> de 28 cartes.</p><ul><li>Une carte est jouable si elle n\'est <b>recouverte par aucune autre</b> (les cartes retournées en bas sont libres) et si sa <b>valeur est voisine</b> (+1 ou −1) de celle de la défausse. Ici le roi et l\'as <b>sont voisins</b>.</li><li>Sans coup possible, cliquez sur le <b>talon</b> pour retourner une carte (cela casse votre série).</li></ul><p>Plus vous enchaînez de cartes sans piocher, plus la série rapporte de points. Chaque carte restant au talon à la victoire donne un bonus.</p>',
  score: { libelle: 'meilleur score', sens: 'haut', suffixe: ' pts' },
  neuf,
  valide: (x) => !!x && !!(x as Etat).jeu && Array.isArray((x as Etat).jeu.cartes),
  vue(h) {
    const e = h.etat;
    const j = e.jeu;
    const z = 'var(--zoom-cartes)';
    const plateau = el('div', { class: 'tp-plateau', style: `width:calc(${9 * LARG + 78}px * ${z});height:calc(${3 * HAUT + 110}px * ${z})` });
    POSITIONS.forEach((p, i) => {
      const c = j.cartes[i];
      if (!c) return;
      const lib = libre(j, i);
      plateau.append(elCarte(lib ? c : null, {
        class: lib ? (peutJouer(j, i) ? 'jouable' : '') : '',
        style: `position:absolute;left:calc(${p.x * LARG}px * ${z});top:calc(${p.rang * HAUT}px * ${z})`,
        onclick: lib ? () => {
          if (e.fini) return;
          memoriser(e);
          if (jouer(j, i)) { h.son('pose'); verifier(h); } else { e.historique.pop(); h.son('erreur'); }
        } : undefined,
      }));
    });
    const haut = j.defausse.at(-1)!;
    const talon = j.talon.length
      ? el('button', { class: 'pioche-btn', 'aria-label': 'Retourner une carte', disabled: e.fini, onclick: () => { memoriser(e); piocher(j); h.son('clic'); verifier(h); } }, elCarte(null), el('span', { class: 'k-compte' }, String(j.talon.length)))
      : el('div', { class: 'emplacement' });
    h.ctx.conteneur.append(
      infos(['Score', j.score], ['Série', j.serie], ['Cartes restantes', restantes(j)]),
      message(e.fini ? (e.perdu ? 'Plus de coup possible. (Annuler pour reprendre)' : `Bravo ! Sommets dégagés : ${j.score} points.`) : '', e.fini ? (e.perdu ? 'perdu' : 'gagne') : ''),
      el('div', { class: 'tapis centre-table' }, plateau, el('div', { class: 'rangee' }, talon, elCarte(haut))),
      astuce('Jouez une carte libre de valeur voisine de la défausse (le roi touche l\'as)'),
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

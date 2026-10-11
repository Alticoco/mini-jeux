import { astuce, choix, fabrique, infos, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { grille, inonder, uniforme } from './logique';

interface Etat { n: number; g: number[]; coups: number; max: number; fini: boolean; gagne: boolean }

const TAILLES: Record<string, [number, number]> = { facile: [10, 22], moyen: [14, 30], difficile: [18, 38] };
const PALETTE = ['#e0443c', '#f2b227', '#3fae5a', '#3b82e0', '#8b5cd6', '#e8749f'];
const NOMS = ['rouge', 'jaune', 'vert', 'bleu', 'violet', 'rose'];
const neufAvec = (k: string): Etat => ({ n: TAILLES[k]![0], g: grille(TAILLES[k]![0]), coups: 0, max: TAILLES[k]![1], fini: false, gagne: false });

export const jeuFloodIt = fabrique<Etat>({
  id: 'floodit', nom: 'Flood-It', famille: 'Puzzles', icone: '🌊',
  description: 'Inondez la grille d\'une seule couleur.',
  regles: '<p>Vous contrôlez la zone de couleur du <b>coin haut-gauche</b>. Choisissez une couleur : la zone prend cette couleur et absorbe les cases voisines de même couleur.</p><p>Le but : remplir <b>toute la grille d\'une seule couleur</b> avant d\'avoir épuisé vos coups.</p>',
  score: { libelle: 'moins de coups', sens: 'bas', suffixe: ' coups' },
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && Array.isArray((x as Etat).g),
  vue(h) {
    const e = h.etat;
    const plateau = el('div', { class: 'plateau flood-grille', style: `grid-template-columns: repeat(${e.n}, 1fr)`, role: 'img', 'aria-label': 'Grille de couleurs' },
      ...e.g.map((c) => el('div', { class: 'flood-case', style: `background:${PALETTE[c]}` })));
    const boutons = el('div', { class: 'rangee' }, ...PALETTE.map((col, c) =>
      el('button', {
        class: 'flood-bouton', style: `background:${col}`, 'aria-label': `Couleur ${NOMS[c]}`, disabled: e.fini || c === e.g[0],
        onclick: () => {
          if (!inonder(e.g, e.n, c)) return;
          e.coups++;
          h.son('clic');
          if (uniforme(e.g)) { e.fini = e.gagne = true; h.son('gagne'); h.fin({ victoire: true, score: e.coups }); }
          else if (e.coups >= e.max) { e.fini = true; h.son('perdu'); h.fin({ victoire: false }); }
          h.render();
          h.sauver();
        },
      })));
    const courant = Object.keys(TAILLES).find((k) => TAILLES[k]![0] === e.n) ?? 'moyen';
    h.ctx.conteneur.append(
      choix('Taille :', Object.entries(TAILLES).map(([k, [n]]) => [k, `${k[0]!.toUpperCase() + k.slice(1)} (${n}×${n})`] as [string, string]), courant, (k) => h.recommencer(() => neufAvec(k))),
      infos(['Coups', `${e.coups} / ${e.max}`]),
      message(e.fini ? (e.gagne ? `Bravo ! Grille remplie en ${e.coups} coups.` : 'Plus de coups : perdu.') : '', e.fini ? (e.gagne ? 'gagne' : 'perdu') : ''),
      plateau, boutons, astuce('Choisissez la couleur qui étend le plus votre zone'),
    );
  },
});

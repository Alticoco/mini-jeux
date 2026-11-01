import type { Difficulte } from '../../core/types';
import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { selecteurMode, type Mode } from '../../shared/mode';
import { N, coupOrdi, coupsLegaux, depart, fini, jouer, retournees, score, type Plateau } from './logique';

interface Etat { p: Plateau; tour: 1 | 2; niveau: Difficulte; dernier: number; texte: string; fini: boolean; mode?: Mode }

/** Mode courant, conservé pour « Nouvelle partie » (réinitialisé à l'arrêt). */
let modeCourant: Mode = 'ordi';

const neufAvec = (niveau: Difficulte, mode: Mode = 'ordi'): Etat => ({ p: depart(), tour: 1, niveau, dernier: -1, texte: mode === 'deux' ? 'Au tour des Noirs.' : 'À vous de jouer (noir).', fini: false, mode });

function verifier(h: Hote<Etat>): void {
  const e = h.etat;
  if (fini(e.p)) {
    e.fini = true;
    const s = score(e.p);
    const gagne = s.noir > s.blanc;
    if (e.mode === 'deux') {
      e.texte = s.noir === s.blanc ? `Égalité ${s.noir} à ${s.blanc}.` : `Les ${gagne ? 'Noirs' : 'Blancs'} gagnent ${Math.max(s.noir, s.blanc)} à ${Math.min(s.noir, s.blanc)} !`;
      h.son(s.noir === s.blanc ? 'pose' : 'gagne');
      h.render();
      return;
    }
    e.texte = s.noir === s.blanc ? `Égalité ${s.noir} à ${s.blanc}.` : gagne ? `Victoire ${s.noir} à ${s.blanc} !` : `Défaite ${s.noir} à ${s.blanc}.`;
    h.son(gagne ? 'gagne' : s.noir === s.blanc ? 'pose' : 'perdu');
    if (s.noir !== s.blanc) h.fin({ victoire: gagne });
    h.render();
    return;
  }
  if (!coupsLegaux(e.p, e.tour).length) {
    e.texte = e.mode === 'deux' ? `Les ${e.tour === 1 ? 'Noirs' : 'Blancs'} ne peuvent pas jouer : ils passent.` : e.tour === 1 ? 'Vous ne pouvez pas jouer : vous passez.' : "L'ordinateur passe son tour.";
    e.tour = e.tour === 1 ? 2 : 1;
  }
  h.render();
  if (e.mode !== 'deux' && e.tour === 2) h.delai(() => {
    const i = coupOrdi(e.p, 2, e.niveau);
    e.p = jouer(e.p, i, 2);
    e.dernier = i;
    e.tour = 1;
    e.texte = 'À vous de jouer (noir).';
    h.son('pose');
    verifier(h);
    h.sauver();
  }, 550);
}

export const jeuReversi = fabrique<Etat>({
  id: 'reversi', nom: 'Reversi (Othello)', famille: 'Contre l\'ordi', icone: '⚫',
  description: 'Encerclez les pions adverses (contre l\'ordi ou à deux).',
  regles: '<p>Choisissez <b>Contre l\'ordinateur</b> ou <b>À deux</b> (même PC, chacun son tour : Noirs puis Blancs).</p><p>Contre l\'ordinateur, vous jouez les pions <b>noirs</b>, l\'ordinateur les <b>blancs</b>. À votre tour, posez un pion sur une case (marquée d\'un point) qui <b>encadre</b> en ligne droite (ligne, colonne ou diagonale) un ou plusieurs pions adverses : ils sont <b>retournés</b> et deviennent à vous.</p><p>Si vous ne pouvez pas jouer, vous passez. La partie s\'arrête quand plus personne ne peut jouer : celui qui a le plus de pions gagne.</p>',
  neuf: (o) => neufAvec(o.difficulte, modeCourant),
  arrete() { modeCourant = 'ordi'; },
  valide: (x) => !!x && Array.isArray((x as Etat).p) && (x as Etat).p.length === 64,
  demarre(h) {
    if (h.etat.mode !== 'deux' && h.etat.tour === 2 && !h.etat.fini) verifier(h);
  },
  vue(h) {
    const e = h.etat;
    const deux = e.mode === 'deux';
    modeCourant = e.mode ?? 'ordi';
    const legaux = new Set((deux || e.tour === 1) && !e.fini ? coupsLegaux(e.p, deux ? e.tour : 1) : []);
    const s = score(e.p);
    const plateau = el('div', { class: 'plateau reversi-grille', style: `grid-template-columns: repeat(${N}, 1fr)` },
      ...e.p.map((v, i) => el('button', {
        class: `case rev-case${legaux.has(i) ? ' legal' : ''}${e.dernier === i ? ' dernier' : ''}`, disabled: !legaux.has(i), 'aria-label': `Case ${i + 1}`,
        onclick: () => {
          if (!retournees(e.p, i, deux ? e.tour : 1).length) return;
          if (deux) {
            e.p = jouer(e.p, i, e.tour);
            e.dernier = i;
            e.tour = e.tour === 1 ? 2 : 1;
            e.texte = `Au tour des ${e.tour === 1 ? 'Noirs' : 'Blancs'}.`;
            h.son('clic');
            verifier(h);
            h.sauver();
            return;
          }
          e.p = jouer(e.p, i, 1);
          e.dernier = i;
          e.tour = 2;
          e.texte = "L'ordinateur réfléchit…";
          h.son('clic');
          verifier(h);
          h.sauver();
        },
      }, v ? el('span', { class: `pion p${v}` }) : legaux.has(i) ? el('span', { class: 'point' }) : '')));
    h.ctx.conteneur.append(
      selecteurMode(e.mode ?? 'ordi', (m) => h.recommencer(() => neufAvec(h.ctx.options.difficulte, m))),
      ...(deux ? [] : [choix('Niveau :', (['facile', 'moyen', 'difficile'] as Difficulte[]).map((n) => [n, n[0]!.toUpperCase() + n.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n)))]),
      infos([deux ? 'Noirs' : 'Noir (vous)', s.noir], [deux ? 'Blancs' : 'Blanc', s.blanc]),
      message(e.texte, e.fini ? (deux ? (s.noir === s.blanc ? '' : 'gagne') : s.noir > s.blanc ? 'gagne' : s.noir < s.blanc ? 'perdu' : '') : ''),
      plateau, astuce('Les points indiquent les coups possibles'),
    );
  },
});

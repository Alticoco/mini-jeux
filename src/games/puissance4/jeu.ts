import type { ContexteJeu, Difficulte, Jeu } from '../../core/types';
import { el, vider } from '../../shared/dom';
import { selecteurMode, type Mode } from '../../shared/mode';
import { COLONNES, LIGNES, coupOrdi, gagnant, grilleVide, pleine, poser, colonneJouable, type Grille, type Joueur } from './logique';

interface Etat {
  grille: Grille;
  niveau: Difficulte;
  fini: boolean;
  mode?: Mode;
  /** Mode à deux : joueur qui doit jouer (1 = rouges, 2 = jaunes). */
  tour?: Joueur;
}

let ctx: ContexteJeu | null = null;
let etat: Etat | null = null;
let attente: Etat | null = null;
let minuteur: number | undefined;
let tourOrdi = false;

function neuf(niveau: Difficulte, mode: Mode = 'ordi'): Etat {
  return { grille: grilleVide(), niveau, fini: false, mode, tour: 1 };
}

function verifierFin(): boolean {
  if (!etat || !ctx) return false;
  const g = gagnant(etat.grille);
  if (!g && !pleine(etat.grille)) return false;
  etat.fini = true;
  if (etat.mode !== 'deux') ctx.terminer({ victoire: g?.joueur === 1 });
  ctx.jouerSon(g ? (g.joueur === 1 || etat.mode === 'deux' ? 'gagne' : 'perdu') : 'pose');
  return true;
}

function jouer(c: number): void {
  if (!etat || !ctx || etat.fini || tourOrdi || !colonneJouable(etat.grille, c)) return;
  if (etat.mode === 'deux') {
    const j: Joueur = etat.tour ?? 1;
    poser(etat.grille, c, j);
    etat.tour = j === 1 ? 2 : 1;
    ctx.jouerSon('clic');
    verifierFin();
    dessiner();
    ctx.sauvegardeAuto();
    return;
  }
  poser(etat.grille, c, 1);
  ctx.jouerSon('clic');
  if (!verifierFin()) {
    tourOrdi = true;
    minuteur = window.setTimeout(() => {
      tourOrdi = false;
      if (!etat || etat.fini) return;
      poser(etat.grille, coupOrdi(etat.grille, 2, etat.niveau), 2);
      ctx?.jouerSon('pose');
      verifierFin();
      dessiner();
      ctx?.sauvegardeAuto();
    }, 400);
  }
  dessiner();
  ctx.sauvegardeAuto();
}

function dessiner(): void {
  if (!etat || !ctx) return;
  const e = etat;
  const g = gagnant(e.grille);
  const plateau = el('div', { class: 'p4-plateau', role: 'grid', 'aria-label': 'Grille de Puissance 4' });
  for (let c = 0; c < COLONNES; c++) {
    const col = el('button', {
      class: 'p4-colonne', disabled: e.fini || !colonneJouable(e.grille, c), 'aria-label': `Colonne ${c + 1}`, onclick: () => jouer(c),
    });
    for (let l = 0; l < LIGNES; l++) {
      const v = e.grille[l * COLONNES + c]!;
      col.append(el('span', { class: `p4-jeton j${v}${g?.cases.includes(l * COLONNES + c) ? ' gagnant' : ''}` }));
    }
    plateau.append(col);
  }
  const deux = e.mode === 'deux';
  const niveaux = deux ? el('div') : el('div', { class: 'choix' }, el('span', {}, 'Niveau :'),
    ...(['facile', 'moyen', 'difficile'] as Difficulte[]).map((n) =>
      el('button', { class: `btn${n === e.niveau ? ' actif' : ''}`, onclick: () => { ctx!.options.difficulte = n; jeuP4.nouvellePartie(); } }, n[0]!.toUpperCase() + n.slice(1))));
  const camp = (j: Joueur | undefined): string => (j === 2 ? 'Jaunes' : 'Rouges');
  const msg = deux
    ? (e.fini ? (g ? `Les ${camp(g.joueur)} ont gagné !` : 'Match nul.') : `Au tour des ${camp(e.tour)}.`)
    : e.fini ? (g ? (g.joueur === 1 ? 'Bravo, vous avez gagné !' : "L'ordinateur a gagné.") : 'Match nul.') : 'À vous de jouer (rouge).';
  vider(ctx.conteneur);
  ctx.conteneur.append(
    selecteurMode(e.mode ?? 'ordi', (m) => { window.clearTimeout(minuteur); tourOrdi = false; etat = neuf(ctx!.options.difficulte, m); dessiner(); ctx!.sauvegardeAuto(); }),
    niveaux,
    el('div', { class: `message${e.fini ? (g ? (deux || g.joueur === 1 ? ' gagne' : ' perdu') : '') : ''}`, role: 'status' }, msg),
    plateau,
  );
}

export const jeuP4: Jeu = {
  id: 'puissance4',
  nom: 'Puissance 4',
  famille: 'Contre l\'ordi',
  icone: '🔴',
  description: 'Alignez 4 jetons avant l\'ordinateur ou à deux.',
  regles: '<p>Choisissez <b>Contre l\'ordinateur</b> ou <b>À deux</b> (même PC, chacun son tour : rouges puis jaunes).</p><p>Contre l\'ordinateur, vous jouez les jetons <b>rouges</b>, l\'ordinateur les <b>jaunes</b>. À tour de rôle, choisissez une colonne : le jeton tombe tout en bas.</p><p>Le premier qui aligne <b>4 jetons</b> (horizontal, vertical ou diagonal) gagne. Grille pleine sans alignement : match nul.</p>',
  demarrer(c) {
    ctx = c;
    etat = attente ?? neuf(c.options.difficulte);
    attente = null;
    dessiner();
  },
  arreter() {
    window.clearTimeout(minuteur);
    tourOrdi = false;
    ctx = null;
    etat = null;
    attente = null;
  },
  sauvegarder() {
    return etat && !etat.fini && etat.grille.some((v) => v) ? etat : null;
  },
  charger(s) {
    const e = s as Etat;
    if (!Array.isArray(e.grille) || e.grille.length !== LIGNES * COLONNES) throw new Error('sauvegarde invalide');
    attente = e;
  },
  nouvellePartie() {
    if (!ctx) return;
    window.clearTimeout(minuteur);
    tourOrdi = false;
    etat = neuf(ctx.options.difficulte, etat?.mode ?? 'ordi');
    dessiner();
  },
};

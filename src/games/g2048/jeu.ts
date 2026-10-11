import type { ContexteJeu, Jeu } from '../../core/types';
import { statsDe } from '../../core/stats';
import { el, vider } from '../../shared/dom';
import { TAILLE, ajouterTuile, deplacer, maximum, nouvelle, peutBouger, type Direction, type Grille } from './logique';

interface Etat {
  grille: Grille;
  score: number;
  gagne: boolean; // 2048 atteint (on peut continuer)
  fini: boolean;
  historique: Array<{ grille: Grille; score: number }>;
}

const TOUCHES: Record<string, Direction> = {
  ArrowLeft: 'gauche', ArrowRight: 'droite', ArrowUp: 'haut', ArrowDown: 'bas',
  q: 'gauche', d: 'droite', z: 'haut', s: 'bas', a: 'gauche', w: 'haut',
};

let ctx: ContexteJeu | null = null;
let etat: Etat | null = null;
let attente: Etat | null = null;
let departTouche: { x: number; y: number } | null = null;

function neuf(): Etat {
  return { grille: nouvelle(), score: 0, gagne: false, fini: false, historique: [] };
}

function bouger(d: Direction): void {
  if (!etat || !ctx || etat.fini) return;
  const r = deplacer(etat.grille, d);
  if (!r.bouge) return;
  etat.historique.push({ grille: etat.grille, score: etat.score });
  if (etat.historique.length > 30) etat.historique.shift();
  etat.grille = ajouterTuile(r.grille);
  etat.score += r.gain;
  ctx.jouerSon(r.gain ? 'pose' : 'clic');
  if (!etat.gagne && maximum(etat.grille) >= 2048) {
    etat.gagne = true;
    ctx.jouerSon('gagne');
  }
  if (!peutBouger(etat.grille)) {
    etat.fini = true;
    ctx.terminer({ victoire: etat.gagne, score: etat.score });
    ctx.jouerSon(etat.gagne ? 'gagne' : 'perdu');
  }
  dessiner();
  ctx.sauvegardeAuto();
}

function clavier(e: KeyboardEvent): void {
  const d = TOUCHES[e.key] ?? TOUCHES[e.key.toLowerCase()];
  if (!d) return;
  e.preventDefault();
  bouger(d);
}

function dessiner(): void {
  if (!etat || !ctx) return;
  const e = etat;
  const plateau = el('div', { class: 'g2048-plateau', role: 'grid', 'aria-label': 'Plateau 2048' });
  for (const v of e.grille) plateau.append(el('div', { class: `g2048-tuile t${Math.min(v, 4096)}`, role: 'gridcell' }, v ? String(v) : ''));
  plateau.addEventListener('pointerdown', (ev) => { departTouche = { x: ev.clientX, y: ev.clientY }; });
  plateau.addEventListener('pointerup', (ev) => {
    if (!departTouche) return;
    const dx = ev.clientX - departTouche.x;
    const dy = ev.clientY - departTouche.y;
    departTouche = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    bouger(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : dy > 0 ? 'bas' : 'haut');
  });
  const meilleur = Math.max(statsDe('2048').meilleur ?? 0, e.score);
  const msg = e.fini ? (e.gagne ? `Bravo, 2048 atteint ! Score final : ${e.score}.` : `Plus de mouvement possible. Score : ${e.score}.`) : e.gagne ? '2048 atteint ! Vous pouvez continuer.' : '';
  vider(ctx.conteneur);
  ctx.conteneur.append(
    el('div', { class: 'infos' }, el('span', {}, 'Score : ', el('span', { class: 'val' }, String(e.score))), el('span', {}, 'Record : ', el('span', { class: 'val' }, String(meilleur)))),
    el('div', { class: `message${e.fini ? (e.gagne ? ' gagne' : ' perdu') : ''}`, role: 'status' }, msg),
    plateau,
    el('div', { class: 'muet' }, 'Flèches (ou ZQSD) pour faire glisser les tuiles · glisser au doigt/souris possible'),
  );
}

export const jeu2048: Jeu = {
  id: '2048',
  nom: '2048',
  famille: 'Puzzles',
  icone: '🔢',
  description: 'Fusionnez les tuiles jusqu\'à 2048.',
  regles: `<p>Faites glisser toutes les tuiles avec les <b>flèches</b> du clavier (ou en glissant). Deux tuiles de même valeur qui se touchent <b>fusionnent</b> en une seule, de valeur double.</p><p>Après chaque mouvement, une nouvelle tuile (2 ou 4) apparaît. Atteignez la tuile <b>2048</b> ! La partie s'arrête quand plus aucun mouvement n'est possible. Vous pouvez annuler vos derniers coups.</p>`,
  score: { libelle: 'record', sens: 'haut', suffixe: ' pts' },
  demarrer(c) {
    ctx = c;
    etat = attente ?? neuf();
    attente = null;
    dessiner();
    document.addEventListener('keydown', clavier);
  },
  arreter() {
    document.removeEventListener('keydown', clavier);
    ctx = null;
    etat = null;
    attente = null;
  },
  sauvegarder() {
    return etat && !etat.fini ? etat : null;
  },
  charger(s) {
    const e = s as Etat;
    if (!Array.isArray(e.grille) || e.grille.length !== TAILLE * TAILLE) throw new Error('sauvegarde invalide');
    attente = e;
  },
  nouvellePartie() {
    if (!ctx) return;
    etat = neuf();
    dessiner();
  },
  annuler() {
    if (!etat || !ctx || !etat.historique.length) return;
    const h = etat.historique.pop()!;
    etat.grille = h.grille;
    etat.score = h.score;
    etat.fini = false;
    dessiner();
    ctx.sauvegardeAuto();
  },
};

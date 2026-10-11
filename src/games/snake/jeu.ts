import type { ContexteJeu, Difficulte, Jeu } from '../../core/types';
import { statsDe } from '../../core/stats';
import { el, vider } from '../../shared/dom';
import { nouveau, pas, peutTourner, type Dir, type EtatSnake } from './logique';

const CASE = 24;
const VITESSE: Record<Difficulte, number> = { facile: 140, moyen: 100, difficile: 70 };
const TOUCHES: Record<string, Dir> = {
  ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite',
  w: 'haut', s: 'bas', a: 'gauche', d: 'droite', z: 'haut', q: 'gauche',
};

let ctx: ContexteJeu | null = null;
let etat: EtatSnake | null = null;
let dir: Dir = 'droite';
let enAttente: Dir[] = [];
let minuteur: number | undefined;
let pause = true;
let canvas: HTMLCanvasElement | null = null;
let infoScore: HTMLElement | null = null;
let message: HTMLElement | null = null;

function couleur(nom: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
}

function dessiner(): void {
  if (!canvas || !etat) return;
  const g = canvas.getContext('2d')!;
  g.fillStyle = couleur('--surface2');
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = couleur('--mal');
  const n = etat.nourriture;
  g.beginPath();
  g.arc(n.x * CASE + CASE / 2, n.y * CASE + CASE / 2, CASE * 0.38, 0, Math.PI * 2);
  g.fill();
  etat.serpent.forEach((p, i) => {
    g.fillStyle = i === 0 ? couleur('--accent') : couleur('--ok');
    g.fillRect(p.x * CASE + 1, p.y * CASE + 1, CASE - 2, CASE - 2);
  });
  if (infoScore) infoScore.textContent = String(etat.score);
}

function afficherMessage(texte: string, classe = ''): void {
  if (!message) return;
  message.textContent = texte;
  message.className = `message ${classe}`;
}

function tic(): void {
  if (!etat || !ctx || pause) return;
  if (enAttente.length) dir = enAttente.shift()!;
  const avant = etat.score;
  etat = pas(etat, dir);
  if (etat.score > avant) ctx.jouerSon('clic');
  dessiner();
  if (!etat.vivant) {
    arreterBoucle();
    ctx.jouerSon('perdu');
    ctx.terminer({ victoire: false, score: etat.score });
    afficherMessage(`Perdu ! Score : ${etat.score}. Appuyez sur Nouvelle partie pour rejouer.`, 'perdu');
    ctx.sauvegardeAuto();
  }
}

function arreterBoucle(): void {
  window.clearInterval(minuteur);
  minuteur = undefined;
}

function lancerBoucle(): void {
  arreterBoucle();
  if (ctx) minuteur = window.setInterval(tic, VITESSE[ctx.options.difficulte]);
}

function reprendre(): void {
  if (!etat?.vivant) return;
  pause = false;
  afficherMessage('');
  lancerBoucle();
}

function basculerPause(): void {
  if (!etat?.vivant) return;
  if (pause) reprendre();
  else {
    pause = true;
    arreterBoucle();
    afficherMessage('Pause : flèches ou Espace pour reprendre.');
  }
}

function clavier(e: KeyboardEvent): void {
  if (e.key === ' ') {
    e.preventDefault();
    basculerPause();
    return;
  }
  const d = TOUCHES[e.key] ?? TOUCHES[e.key.toLowerCase()];
  if (!d || !etat?.vivant) return;
  e.preventDefault();
  const derniere = enAttente.length ? enAttente[enAttente.length - 1]! : dir;
  if (d !== derniere && peutTourner(derniere, d) && enAttente.length < 3) enAttente.push(d);
  if (pause) reprendre();
}

function construire(): void {
  if (!ctx || !etat) return;
  const meilleur = statsDe('snake').meilleur ?? 0;
  canvas = el('canvas', { width: etat.l * CASE, height: etat.h * CASE, class: 'snake-canvas', role: 'img', 'aria-label': 'Aire de jeu du Snake' });
  infoScore = el('span', { class: 'val' }, '0');
  message = el('div', { class: 'message', role: 'status' });
  vider(ctx.conteneur);
  ctx.conteneur.append(
    el('div', { class: 'infos' }, el('span', {}, 'Score : ', infoScore), el('span', {}, 'Record : ', el('span', { class: 'val' }, String(meilleur)))),
    message,
    canvas,
    el('div', { class: 'muet' }, 'Flèches ou ZQSD/WASD pour diriger · Espace : pause'),
  );
  dessiner();
  afficherMessage('Appuyez sur une flèche pour commencer.');
}

export const jeuSnake: Jeu = {
  id: 'snake',
  nom: 'Snake',
  famille: 'Arcade',
  icone: '🐍',
  description: 'Mangez les pommes sans vous mordre.',
  regles: '<p>Dirigez le serpent avec les <b>flèches</b> (ou ZQSD / WASD). Chaque pomme mangée vous rapporte <b>1 point</b> et allonge le serpent.</p><p>La partie est perdue si vous touchez un <b>mur</b> ou votre propre <b>corps</b>. <b>Espace</b> met en pause. La vitesse dépend de la difficulté choisie dans les options.</p>',
  score: { libelle: 'record', sens: 'haut', suffixe: ' pommes' },
  demarrer(c) {
    ctx = c;
    etat = nouveau();
    dir = 'droite';
    enAttente = [];
    pause = true;
    construire();
    document.addEventListener('keydown', clavier);
  },
  arreter() {
    arreterBoucle();
    document.removeEventListener('keydown', clavier);
    ctx = null;
    etat = null;
    canvas = null;
  },
  sauvegarder: () => null,
  charger: () => {},
  nouvellePartie() {
    if (!ctx) return;
    arreterBoucle();
    etat = nouveau();
    dir = 'droite';
    enAttente = [];
    pause = true;
    construire();
  },
};

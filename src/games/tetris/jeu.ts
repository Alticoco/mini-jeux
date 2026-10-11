import { statsDe } from '../../core/stats';
import { astuce, fabrique, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { H, L, cellules, cellulesSuivante, chuteDure, delai, deplacer, descendre, nouvelle, ombre, tourner, type Etat } from './logique';

const CASE = 28;
const COULEURS = ['#35c6e8', '#f2c230', '#a35be0', '#3fae5a', '#e0443c', '#3b6fe0', '#f08a2b'];
const DEPART = { facile: 1, moyen: 3, difficile: 6 } as const;

interface Jeu { e: Etat; pause: boolean; acc: number; demarre: boolean }

export const jeuTetris = fabrique<Jeu>({
  id: 'tetris', nom: 'Tetris', famille: 'Arcade', icone: '🧱',
  description: 'Empilez et complétez les lignes.',
  regles: '<p>Des pièces tombent du haut. Faites-les pivoter et déplacez-les pour former des <b>lignes complètes</b>, qui disparaissent. Plus vous effacez de lignes d\'un coup, plus vous marquez (jusqu\'à 4 : un « Tetris »).</p><ul><li><b>← →</b> : déplacer · <b>↑</b> : tourner · <b>↓</b> : descendre plus vite · <b>Espace</b> : chute immédiate · <b>P</b> : pause.</li></ul><p>La partie est perdue quand les pièces atteignent le haut. Toutes les 10 lignes, le niveau (et la vitesse) augmente. Le niveau de départ dépend de la difficulté choisie dans les options.</p>',
  score: { libelle: 'record', sens: 'haut', suffixe: ' pts' },
  neuf: (o) => ({ e: nouvelle(DEPART[o.difficulte]), pause: false, acc: 0, demarre: false }),
  valide: () => false,
  sauvegardable: () => false,
  vue(h) {
    const j = h.etat;
    const canvas = el('canvas', { width: L * CASE, height: H * CASE, class: 'tetris-canvas', role: 'img', 'aria-label': 'Aire de jeu du Tetris' });
    const suivante = el('canvas', { width: 4 * 22, height: 3 * 22, class: 'tetris-suivante', 'aria-label': 'Pièce suivante' });
    const infos = el('div', { class: 'tetris-infos' });
    const msg = message('Appuyez sur une flèche pour commencer.');
    msg.id = 'tetris-msg';
    h.ctx.conteneur.append(
      el('div', { class: 'tetris-zone' }, canvas, el('div', { class: 'tetris-cote' }, el('h2', {}, 'Suivante'), suivante, infos)),
      msg, astuce('← → déplacer · ↑ tourner · ↓ descendre · Espace chute · P pause'),
    );
    const dessiner = () => {
      const g = canvas.getContext('2d')!;
      const css = getComputedStyle(document.documentElement);
      g.fillStyle = css.getPropertyValue('--surface2').trim() || '#222';
      g.fillRect(0, 0, canvas.width, canvas.height);
      const bloc = (x: number, y: number, c: string, alpha = 1) => {
        g.globalAlpha = alpha;
        g.fillStyle = c;
        g.fillRect(x * CASE + 1, y * CASE + 1, CASE - 2, CASE - 2);
        g.globalAlpha = 1;
      };
      j.e.grille.forEach((ligne, y) => ligne.forEach((v, x) => v && bloc(x, y, COULEURS[v - 1]!)));
      if (!j.e.fini) {
        for (const [x, y] of cellules(ombre(j.e))) if (y >= 0) bloc(x, y, COULEURS[j.e.piece.type]!, 0.25);
        for (const [x, y] of cellules(j.e.piece)) if (y >= 0) bloc(x, y, COULEURS[j.e.piece.type]!);
      }
      const s = suivante.getContext('2d')!;
      s.clearRect(0, 0, suivante.width, suivante.height);
      s.fillStyle = COULEURS[j.e.suivante]!;
      for (const [x, y] of cellulesSuivante(j.e.suivante)) s.fillRect(x * 22 + 2, y * 22 + 2, 20, 20);
      infos.innerHTML = `<div>Score <b>${j.e.score}</b></div><div>Lignes <b>${j.e.lignes}</b></div><div>Niveau <b>${j.e.niveau}</b></div><div>Record <b>${Math.max(statsDe('tetris').meilleur ?? 0, j.e.score)}</b></div>`;
    };
    const fin = () => {
      h.son('perdu');
      h.fin({ victoire: false, score: j.e.score });
      msg.textContent = `Partie terminée ! Score : ${j.e.score}. Cliquez sur « Nouvelle partie » pour rejouer.`;
      msg.className = 'message perdu';
    };
    const action = (f: () => void) => {
      if (j.e.fini || j.pause) return;
      j.demarre = true;
      msg.textContent = '';
      f();
      if (j.e.fini) fin();
      dessiner();
    };
    h.clavier((ev) => {
      const k = ev.key;
      if (k === 'p' || k === 'P') { if (j.demarre && !j.e.fini) { j.pause = !j.pause; msg.textContent = j.pause ? 'Pause : appuyez sur P pour reprendre.' : ''; } return; }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) return;
      ev.preventDefault();
      if (k === 'ArrowLeft') action(() => deplacer(j.e, -1));
      else if (k === 'ArrowRight') action(() => deplacer(j.e, 1));
      else if (k === 'ArrowUp') action(() => tourner(j.e));
      else if (k === 'ArrowDown') action(() => { const r = descendre(j.e); j.e.score += r.fixe ? 0 : 1; j.acc = 0; if (r.fixe) h.son('pose'); });
      else action(() => { chuteDure(j.e); j.acc = 0; h.son('pose'); });
    });
    h.boucle((dt) => {
      if (!j.demarre || j.pause || j.e.fini) return;
      j.acc += dt;
      if (j.acc >= delai(j.e.niveau)) {
        j.acc = 0;
        const r = descendre(j.e);
        if (r.fixe) h.son(r.lignes ? 'gagne' : 'pose');
        if (j.e.fini) fin();
        dessiner();
      }
    });
    dessiner();
  },
});

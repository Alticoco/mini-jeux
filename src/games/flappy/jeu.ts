import { statsDe } from '../../core/stats';
import { astuce, fabrique, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { H, L, LARGEUR_TUYAU, OISEAU_X, RAYON, REGLAGE, SOL, avancer, battre, nouvelle, type Etat } from './logique';

export const jeuFlappy = fabrique<{ e: Etat }>({
  id: 'flappy', nom: 'Flappy (like)', famille: 'Arcade', icone: '🐦',
  description: 'Battez des ailes entre les tuyaux.',
  regles: '<p>Faites voler l\'oiseau entre les <b>tuyaux</b> sans les toucher ni toucher le sol. <b>Clic</b>, <b>Espace</b> ou <b>↑</b> : un coup d\'aile (l\'oiseau remonte puis retombe).</p><p>Chaque tuyau franchi vaut <b>1 point</b>. Le niveau règle l\'ouverture entre les tuyaux et la vitesse.</p>',
  score: { libelle: 'record', sens: 'haut', suffixe: ' tuyaux' },
  neuf: () => ({ e: nouvelle() }),
  valide: () => false,
  sauvegardable: () => false,
  vue(h) {
    const j = h.etat;
    const canvas = el('canvas', { width: L, height: H, class: 'flappy-canvas', role: 'img', 'aria-label': 'Aire de jeu' });
    const msg = message('Clic ou Espace pour battre des ailes.');
    h.ctx.conteneur.append(msg, canvas, astuce('Clic / Espace / ↑ : battre des ailes'));
    const dessiner = () => {
      const g = canvas.getContext('2d')!;
      const e = j.e;
      const r = REGLAGE[h.ctx.options.difficulte];
      const ciel = g.createLinearGradient(0, 0, 0, H);
      ciel.addColorStop(0, '#5fc3f0');
      ciel.addColorStop(1, '#bfe9fb');
      g.fillStyle = ciel;
      g.fillRect(0, 0, L, H);
      for (const t of e.tuyaux) {
        g.fillStyle = '#4caf50';
        g.fillRect(t.x, 0, LARGEUR_TUYAU, t.gapY - r.gap / 2);
        g.fillRect(t.x, t.gapY + r.gap / 2, LARGEUR_TUYAU, H);
        g.fillStyle = '#388e3c';
        g.fillRect(t.x - 4, t.gapY - r.gap / 2 - 22, LARGEUR_TUYAU + 8, 22);
        g.fillRect(t.x - 4, t.gapY + r.gap / 2, LARGEUR_TUYAU + 8, 22);
      }
      g.fillStyle = '#d9c27a';
      g.fillRect(0, H - SOL, L, SOL);
      g.fillStyle = '#9ccc65';
      g.fillRect(0, H - SOL, L, 8);
      // oiseau
      g.save();
      g.translate(OISEAU_X, e.y);
      g.rotate(Math.max(-0.5, Math.min(1.1, e.vy / 500)));
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.arc(0, 0, RAYON, 0, 7); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(6, -4, 5, 0, 7); g.fill();
      g.fillStyle = '#222';
      g.beginPath(); g.arc(8, -4, 2, 0, 7); g.fill();
      g.fillStyle = '#ff7043';
      g.beginPath(); g.moveTo(11, 1); g.lineTo(21, 4); g.lineTo(11, 7); g.fill();
      g.fillStyle = '#f0b429';
      g.beginPath(); g.ellipse(-4, 4 + Math.sin(performance.now() / 70) * 3, 7, 4, 0, 0, 7); g.fill();
      g.restore();
      g.fillStyle = '#fff';
      g.strokeStyle = '#333';
      g.lineWidth = 4;
      g.font = 'bold 44px sans-serif';
      g.textAlign = 'center';
      g.strokeText(String(e.score), L / 2, 70);
      g.fillText(String(e.score), L / 2, 70);
    };
    const action = () => {
      if (j.e.fini) return;
      battre(j.e);
      msg.textContent = '';
      h.son('clic');
    };
    canvas.addEventListener('pointerdown', action);
    h.clavier((ev) => { if (ev.key === ' ' || ev.key === 'ArrowUp') { ev.preventDefault(); action(); } });
    h.boucle((dt) => {
      const ev = avancer(j.e, dt / 1000, h.ctx.options.difficulte);
      if (ev.point) h.son('pose');
      if (ev.mort) {
        h.son('perdu');
        h.fin({ victoire: false, score: j.e.score });
        msg.textContent = `Raté ! ${j.e.score} tuyau${j.e.score > 1 ? 'x' : ''} franchi${j.e.score > 1 ? 's' : ''}. Record : ${Math.max(statsDe('flappy').meilleur ?? 0, j.e.score)}. « Nouvelle partie » pour rejouer.`;
        msg.className = 'message perdu';
      }
      dessiner();
    });
    dessiner();
  },
});

import { statsDe } from '../../core/stats';
import { astuce, fabrique, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { H, L, avancer, nouvelle, orienter, position, prochainNiveau, type Etat } from './logique';

const T = 24;
const COULEURS = ['#e0443c', '#f08cb6', '#2fc4c4', '#f2a23a'];

interface Jeu { e: Etat; pause: boolean; demarre: boolean }

export const jeuPacman = fabrique<Jeu>({
  id: 'pacman', nom: 'Pac-Man (like)', famille: 'Arcade', icone: '🟡',
  description: 'Mangez toutes les pastilles, évitez les fantômes.',
  regles: '<p>Guidez la <b>boule jaune</b> dans le labyrinthe pour <b>manger toutes les pastilles</b>. Les <b>fantômes</b> vous poursuivent : s\'ils vous touchent, vous perdez une vie (3 au départ).</p><ul><li><b>Flèches</b> ou ZQSD/WASD pour tourner (le tournant se fait au prochain carrefour) · <b>P</b> : pause.</li><li>Les <b>grosses pastilles</b> rendent les fantômes vulnérables (bleus) un moment : mangez-les pour 200, 400, 800… points. Leurs yeux retournent alors à leur maison.</li><li>Le <b>tunnel</b> du milieu relie les deux bords.</li></ul><p>Le niveau de difficulté règle le nombre (2, 3 ou 4) et la vitesse des fantômes.</p>',
  score: { libelle: 'record', sens: 'haut', suffixe: ' pts' },
  neuf: (o) => ({ e: nouvelle(o.difficulte), pause: false, demarre: false }),
  valide: () => false,
  sauvegardable: () => false,
  vue(h) {
    const j = h.etat;
    const canvas = el('canvas', { width: L * T, height: H * T, class: 'pac-canvas', role: 'img', 'aria-label': 'Labyrinthe de Pac-Man' });
    const msg = message('Appuyez sur une flèche pour commencer.');
    const infos = el('div', { class: 'infos' });
    h.ctx.conteneur.append(infos, msg, canvas, astuce('Flèches ou ZQSD pour diriger · P : pause'));
    const dessiner = () => {
      const g = canvas.getContext('2d')!;
      const e = j.e;
      g.fillStyle = '#10112a';
      g.fillRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < L; x++) {
          const c = e.grille[y]![x]!;
          if (c === '#') { g.fillStyle = '#2b3bd6'; g.fillRect(x * T + 1, y * T + 1, T - 2, T - 2); }
          else if (c === '.') { g.fillStyle = '#ffd9b3'; g.beginPath(); g.arc(x * T + T / 2, y * T + T / 2, 2.5, 0, 7); g.fill(); }
          else if (c === '*') { g.fillStyle = '#ffd9b3'; g.beginPath(); g.arc(x * T + T / 2, y * T + T / 2, 7, 0, 7); g.fill(); }
        }
      // fantômes
      for (const f of e.fantomes) {
        const p = position(f);
        const px = p.x * T + T / 2, py = p.y * T + T / 2;
        const clignote = e.peur > 0 && e.peur < 1800 && Math.floor(e.peur / 200) % 2 === 0;
        if (f.mode !== 'yeux') {
          g.fillStyle = f.mode === 'peur' ? (clignote ? '#fff' : '#3b4cff') : COULEURS[f.id % 4]!;
          g.beginPath();
          g.arc(px, py - 2, T / 2 - 2, Math.PI, 0);
          g.lineTo(px + T / 2 - 2, py + T / 2 - 3);
          g.lineTo(px - T / 2 + 2, py + T / 2 - 3);
          g.fill();
        }
        g.fillStyle = '#fff';
        for (const ox of [-4, 4]) { g.beginPath(); g.arc(px + ox, py - 4, 3, 0, 7); g.fill(); }
        g.fillStyle = '#10112a';
        for (const ox of [-4, 4]) { g.beginPath(); g.arc(px + ox + f.dx * 1.5, py - 4 + f.dy * 1.5, 1.5, 0, 7); g.fill(); }
      }
      // joueur
      const pp = position(e.pac);
      const bouche = (Math.abs(Math.sin(e.pac.ouverture)) * 0.45 + 0.05) * Math.PI;
      const angle = e.pac.dx === -1 ? Math.PI : e.pac.dy === -1 ? -Math.PI / 2 : e.pac.dy === 1 ? Math.PI / 2 : 0;
      g.fillStyle = '#ffd400';
      g.beginPath();
      g.moveTo(pp.x * T + T / 2, pp.y * T + T / 2);
      g.arc(pp.x * T + T / 2, pp.y * T + T / 2, T / 2 - 2, angle + bouche, angle + 2 * Math.PI - bouche);
      g.fill();
      infos.innerHTML = `<span>Score : <b class="val">${e.score}</b></span><span>Vies : <b class="val">${'❤'.repeat(Math.max(0, e.vies))}</b></span><span>Niveau : <b class="val">${e.niveau}</b></span><span>Record : <b class="val">${Math.max(statsDe('pacman').meilleur ?? 0, e.score)}</b></span>`;
    };
    const touches: Record<string, [number, number]> = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], z: [0, -1], s: [0, 1], q: [-1, 0], d: [1, 0], w: [0, -1], a: [-1, 0],
    };
    h.clavier((ev) => {
      if (ev.key === 'p' || ev.key === 'P') { if (j.demarre && !j.e.fini) { j.pause = !j.pause; msg.textContent = j.pause ? 'Pause : appuyez sur P pour reprendre.' : ''; } return; }
      const d = touches[ev.key] ?? touches[ev.key.toLowerCase()];
      if (!d) return;
      ev.preventDefault();
      j.demarre = true;
      if (!j.pause) msg.textContent = '';
      orienter(j.e, d[0], d[1]);
    });
    h.boucle((dt) => {
      if (!j.demarre || j.pause || j.e.fini) { dessiner(); return; }
      const ev = avancer(j.e, Math.min(dt, 50) / 1000, h.ctx.options.difficulte);
      if (ev.pastille) h.son('clic');
      if (ev.fantome) h.son('gagne');
      if (ev.mort) { h.son('perdu'); msg.textContent = j.e.fini ? '' : 'Touché !'; }
      if (ev.niveauTermine) { h.son('gagne'); prochainNiveau(j.e); msg.textContent = `Niveau ${j.e.niveau} !`; j.demarre = false; }
      if (ev.fin) { h.fin({ victoire: false, score: j.e.score }); msg.textContent = `Partie terminée ! Score : ${j.e.score}.`; msg.className = 'message perdu'; }
      dessiner();
    });
    dessiner();
  },
});

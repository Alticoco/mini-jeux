import { astuce, fabrique, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { selecteurMode, type Mode } from '../../shared/mode';
import { H, L, MARGE, OBJECTIF, PH, PW, avancer, deplacerJoueur, deplacerJoueur2, nouvelle, servir, type Etat } from './logique';

interface Jeu { e: Etat; haut: boolean; bas: boolean; haut2: boolean; bas2: boolean }

let modeCourant: Mode = 'ordi';

export const jeuPong = fabrique<Jeu>({
  id: 'pong', nom: 'Pong', famille: 'Arcade', icone: '🏸',
  description: 'Le tout premier jeu vidéo, contre l\'ordi ou à deux.',
  regles: `<p>Renvoyez la balle avec votre raquette (à <b>gauche</b>) et faites-la passer derrière celle de l'ordinateur. Premier à <b>${OBJECTIF} points</b>.</p><p>Mode <b>À deux</b> (même clavier) : joueur 1 à gauche avec <b>Z (ou W) / S</b>, joueur 2 à droite avec <b>↑ ↓</b>. Pas de statistiques dans ce mode.</p><ul><li>Contre l'ordinateur : déplacez la raquette à la <b>souris</b> ou avec <b>↑ ↓</b> (ou Z / S).</li><li><b>Clic</b> ou <b>Espace</b> pour servir.</li><li>Plus on frappe près du bord de la raquette, plus l'angle est fort. La balle accélère à chaque échange.</li></ul>`,
  score: { libelle: 'victoires', sens: 'haut' },
  neuf: () => ({ e: nouvelle(modeCourant), haut: false, bas: false, haut2: false, bas2: false }),
  valide: () => false,
  sauvegardable: () => false,
  arrete() { modeCourant = 'ordi'; },
  vue(h) {
    const j = h.etat;
    modeCourant = j.e.mode ?? 'ordi';
    const canvas = el('canvas', { width: L, height: H, class: 'pong-canvas', role: 'img', 'aria-label': 'Terrain de Pong' });
    const deux = j.e.mode === 'deux';
    const choisirMode = (m: Mode) => h.recommencer(() => ({ e: nouvelle(m), haut: false, bas: false, haut2: false, bas2: false }));
    const msg = message('Cliquez ou appuyez sur Espace pour servir.');
    h.ctx.conteneur.append(selecteurMode(j.e.mode ?? 'ordi', choisirMode), msg, canvas,
      astuce(deux ? 'J1 : Z / S · J2 : ↑ / ↓ · Clic / Espace : servir' : 'Souris ou ↑ ↓ · Clic / Espace : servir'));
    const css = getComputedStyle(document.documentElement);
    const niveau = () => h.ctx.options.difficulte;
    const dessiner = () => {
      const g = canvas.getContext('2d')!;
      g.fillStyle = css.getPropertyValue('--surface2').trim() || '#222';
      g.fillRect(0, 0, L, H);
      const fg = css.getPropertyValue('--texte').trim() || '#fff';
      g.fillStyle = fg;
      g.globalAlpha = 0.3;
      for (let y = 0; y < H; y += 24) g.fillRect(L / 2 - 2, y, 4, 12);
      g.globalAlpha = 1;
      g.font = 'bold 44px sans-serif';
      g.textAlign = 'center';
      g.fillText(String(j.e.scores[0]), L / 2 - 60, 56);
      g.fillText(String(j.e.scores[1]), L / 2 + 60, 56);
      g.fillStyle = css.getPropertyValue('--accent').trim() || '#85f';
      g.fillRect(MARGE, j.e.joueurY - PH / 2, PW, PH);
      g.fillStyle = fg;
      g.fillRect(L - MARGE - PW, j.e.ordiY - PH / 2, PW, PH);
      if (!j.e.servir) { g.beginPath(); g.arc(j.e.balle.x, j.e.balle.y, 6, 0, Math.PI * 2); g.fill(); }
    };
    const demander = () => { if (j.e.servir && !j.e.fini) { servir(j.e, niveau()); msg.textContent = ''; } };
    canvas.addEventListener('mousemove', (ev) => { if (deux) return; const r = canvas.getBoundingClientRect(); deplacerJoueur(j.e, ((ev.clientY - r.top) / r.height) * H); });
    canvas.addEventListener('click', demander);
    const hautKeys = deux ? ['w', 'W', 'z', 'Z'] : ['ArrowUp', 'z', 'Z', 'w', 'W'];
    const basKeys = deux ? ['s', 'S'] : ['ArrowDown', 's', 'S'];
    const haut2Keys = deux ? ['ArrowUp'] : [];
    const bas2Keys = deux ? ['ArrowDown'] : [];
    h.clavier((ev) => {
      if (hautKeys.includes(ev.key)) { j.haut = true; ev.preventDefault(); }
      else if (basKeys.includes(ev.key)) { j.bas = true; ev.preventDefault(); }
      else if (haut2Keys.includes(ev.key)) { j.haut2 = true; ev.preventDefault(); }
      else if (bas2Keys.includes(ev.key)) { j.bas2 = true; ev.preventDefault(); }
      else if (ev.key === ' ') { ev.preventDefault(); demander(); }
    });
    h.clavier((ev) => {
      if (hautKeys.includes(ev.key)) j.haut = false;
      if (basKeys.includes(ev.key)) j.bas = false;
      if (haut2Keys.includes(ev.key)) j.haut2 = false;
      if (bas2Keys.includes(ev.key)) j.bas2 = false;
    }, 'keyup');
    h.boucle((dt) => {
      if (j.e.fini) return;
      if (j.haut) deplacerJoueur(j.e, j.e.joueurY - 380 * dt / 1000);
      if (j.bas) deplacerJoueur(j.e, j.e.joueurY + 380 * dt / 1000);
      if (j.haut2) deplacerJoueur2(j.e, j.e.ordiY - 380 * dt / 1000);
      if (j.bas2) deplacerJoueur2(j.e, j.e.ordiY + 380 * dt / 1000);
      const ev = avancer(j.e, dt / 1000, niveau());
      if (ev.rebond) h.son('clic');
      if (ev.point) {
        h.son(deux || ev.point === 'joueur' ? 'pose' : 'erreur');
        if (j.e.fini && deux) {
          const j1 = j.e.scores[0] > j.e.scores[1];
          h.son('gagne');
          msg.textContent = `Le joueur ${j1 ? 1 : 2} gagne ${Math.max(...j.e.scores)} à ${Math.min(...j.e.scores)} !`;
          msg.className = 'message gagne';
        } else if (j.e.fini) {
          const gagne = j.e.scores[0] > j.e.scores[1];
          h.son(gagne ? 'gagne' : 'perdu');
          h.fin({ victoire: gagne });
          msg.textContent = gagne ? `Victoire ${j.e.scores[0]} à ${j.e.scores[1]} !` : `Défaite ${j.e.scores[0]} à ${j.e.scores[1]}.`;
          msg.className = `message ${gagne ? 'gagne' : 'perdu'}`;
        } else msg.textContent = deux ? `Point pour le joueur ${ev.point === 'joueur' ? 1 : 2}. Servez.` : ev.point === 'joueur' ? 'Point pour vous ! Servez.' : 'Point pour l\'ordinateur. Servez.';
      }
      dessiner();
    });
    dessiner();
  },
});

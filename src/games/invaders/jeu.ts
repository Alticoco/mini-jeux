import { statsDe } from '../../core/stats';
import { astuce, fabrique, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { AL_H, AL_W, COLS, H, JOUEUR_W, JOUEUR_Y, L, avancer, deplacerJoueur, niveauSuivant, nouvelle, posAlien, tirer, type Etat } from './logique';

interface Jeu { e: Etat; gauche: boolean; droite: boolean; tir: boolean; demarre: boolean; pause: boolean }

const COULEURS = ['#e0443c', '#f08a2b', '#f2c230', '#3fae5a', '#3b82e0'];

export const jeuInvaders = fabrique<Jeu>({
  id: 'invaders', nom: 'Space Invaders', famille: 'Arcade', icone: '👾',
  description: 'Repoussez l\'invasion extraterrestre.',
  regles: '<p>Une armée d\'<b>envahisseurs</b> descend vers vous en zigzaguant, de plus en plus vite. Détruisez-les tous avant qu\'ils n\'atteignent le bas de l\'écran.</p><ul><li><b>← →</b> (ou Q/D) : déplacer le canon · <b>Espace</b> : tirer (un seul tir à l\'écran) · <b>P</b> : pause.</li><li>Quatre <b>boucliers</b> vous protègent, mais ils s\'érodent sous les tirs (les vôtres aussi).</li><li>Vous avez <b>3 vies</b>. Chaque vague terminée rapporte une vie (5 maximum) et la suivante est plus rapide.</li></ul><p>Les rangées du haut valent plus de points.</p>',
  score: { libelle: 'record', sens: 'haut', suffixe: ' pts' },
  neuf: () => ({ e: nouvelle(), gauche: false, droite: false, tir: false, demarre: false, pause: false }),
  valide: () => false,
  sauvegardable: () => false,
  vue(h) {
    const j = h.etat;
    const canvas = el('canvas', { width: L, height: H, class: 'inv-canvas', role: 'img', 'aria-label': 'Aire de jeu de Space Invaders' });
    const msg = message('Appuyez sur ← ou → (ou Espace) pour commencer.');
    const infos = el('div', { class: 'infos' });
    h.ctx.conteneur.append(infos, msg, canvas, astuce('← → déplacer · Espace tirer · P pause'));
    const css = getComputedStyle(document.documentElement);
    const dessiner = () => {
      const g = canvas.getContext('2d')!;
      const e = j.e;
      g.fillStyle = '#0b0c1c';
      g.fillRect(0, 0, L, H);
      e.aliens.forEach((v, i) => {
        if (!v) return;
        const p = posAlien(e, i);
        const l = Math.floor(i / COLS);
        g.fillStyle = COULEURS[l % COULEURS.length]!;
        g.fillRect(p.x + 4, p.y + 4, AL_W - 8, AL_H - 8);
        g.fillRect(p.x, p.y + 8, AL_W, 6);
        g.fillStyle = '#0b0c1c';
        g.fillRect(p.x + 9, p.y + 8, 4, 4);
        g.fillRect(p.x + AL_W - 13, p.y + 8, 4, 4);
        const jambes = Math.floor(performance.now() / 300) % 2;
        g.fillStyle = COULEURS[l % COULEURS.length]!;
        g.fillRect(p.x + (jambes ? 2 : 6), p.y + AL_H - 4, 4, 4);
        g.fillRect(p.x + AL_W - (jambes ? 6 : 10), p.y + AL_H - 4, 4, 4);
      });
      for (const b of e.boucliers) b.cases.forEach((pv, i) => {
        if (!pv) return;
        g.fillStyle = ['', '#2d6b3c', '#3fae5a', '#7be08f'][pv]!;
        g.fillRect(b.x + (i % 8) * 10, b.y + Math.floor(i / 8) * 10, 10, 10);
      });
      g.fillStyle = css.getPropertyValue('--accent').trim() || '#85f';
      g.fillRect(e.joueurX - JOUEUR_W / 2, JOUEUR_Y + 6, JOUEUR_W, 12);
      g.fillRect(e.joueurX - 4, JOUEUR_Y - 2, 8, 10);
      g.fillStyle = '#fff';
      if (e.tirJoueur) g.fillRect(e.tirJoueur.x - 1.5, e.tirJoueur.y, 3, 12);
      g.fillStyle = '#ff6b6b';
      for (const t of e.tirsAliens) g.fillRect(t.x - 2, t.y, 4, 12);
      infos.innerHTML = `<span>Score : <b class="val">${e.score}</b></span><span>Vies : <b class="val">${'❤'.repeat(Math.max(0, e.vies))}</b></span><span>Vague : <b class="val">${e.niveau}</b></span><span>Record : <b class="val">${Math.max(statsDe('invaders').meilleur ?? 0, e.score)}</b></span>`;
    };
    const marche = () => { j.demarre = true; if (!j.pause) msg.textContent = ''; };
    h.clavier((ev) => {
      const k = ev.key;
      if (k === 'p' || k === 'P') { if (j.demarre && !j.e.fini) { j.pause = !j.pause; msg.textContent = j.pause ? 'Pause : appuyez sur P pour reprendre.' : ''; } return; }
      if (k === 'ArrowLeft' || k === 'q' || k === 'Q') { j.gauche = true; marche(); ev.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { j.droite = true; marche(); ev.preventDefault(); }
      else if (k === ' ' || k === 'ArrowUp') { j.tir = true; marche(); ev.preventDefault(); }
    });
    h.clavier((ev) => {
      const k = ev.key;
      if (k === 'ArrowLeft' || k === 'q' || k === 'Q') j.gauche = false;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') j.droite = false;
      else if (k === ' ' || k === 'ArrowUp') j.tir = false;
    }, 'keyup');
    canvas.addEventListener('mousemove', (ev) => { const r = canvas.getBoundingClientRect(); j.e.joueurX = Math.min(L - 20, Math.max(20, ((ev.clientX - r.left) / r.width) * L)); });
    canvas.addEventListener('click', () => { marche(); j.tir = true; });
    h.boucle((dt) => {
      const e = j.e;
      if (!j.demarre || j.pause || e.fini) { dessiner(); return; }
      if (j.gauche) deplacerJoueur(e, -300 * dt / 1000);
      if (j.droite) deplacerJoueur(e, 300 * dt / 1000);
      if (j.tir) { if (tirer(e)) h.son('clic'); j.tir = false; }
      const ev = avancer(e, dt / 1000);
      if (ev.alien) h.son('pose');
      if (ev.touche) h.son('erreur');
      if (ev.niveauTermine) { h.son('gagne'); niveauSuivant(e); msg.textContent = `Vague ${e.niveau} !`; j.demarre = false; }
      if (ev.fin) { h.son('perdu'); h.fin({ victoire: false, score: e.score }); msg.textContent = `Partie terminée ! Score : ${e.score}.`; msg.className = 'message perdu'; }
      dessiner();
    });
    dessiner();
  },
});

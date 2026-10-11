import { statsDe } from '../../core/stats';
import { astuce, fabrique, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { BH, BW, COLS, HAUTEUR, HAUT_BRIQUES, LARGEUR, RAQ_H, RAQ_Y, avancer, deplacerRaquette, lancer, niveauSuivant, nouvelle, vitesse, type Etat } from './logique';

const COULEURS = ['#e0443c', '#f08a2b', '#f2c230', '#3fae5a', '#3b82e0', '#8b5cd6'];

interface Jeu { e: Etat; gauche: boolean; droite: boolean }

export const jeuCasseBriques = fabrique<Jeu>({
  id: 'cassebriques', nom: 'Casse-briques', famille: 'Arcade', icone: '🏓',
  description: 'Détruisez toutes les briques.',
  regles: '<p>Déplacez la <b>raquette</b> avec la <b>souris</b> ou les touches <b>← →</b> pour renvoyer la balle et détruire toutes les briques. <b>Clic</b> ou <b>Espace</b> lance la balle.</p><p>Vous avez <b>3 vies</b> : perdre la balle en coûte une. Les briques du haut rapportent le plus de points. Chaque niveau terminé accélère la balle.</p>',
  score: { libelle: 'record', sens: 'haut', suffixe: ' pts' },
  neuf: () => ({ e: nouvelle(), gauche: false, droite: false }),
  valide: () => false,
  sauvegardable: () => false,
  vue(h) {
    const j = h.etat;
    const canvas = el('canvas', { width: LARGEUR, height: HAUTEUR, class: 'cb-canvas', role: 'img', 'aria-label': 'Aire de jeu du Casse-briques' });
    const msg = message('Bougez la souris ou utilisez ← →, puis cliquez pour lancer la balle.');
    const score = el('span', { class: 'val' }, '0');
    const vies = el('span', { class: 'val' }, '3');
    h.ctx.conteneur.append(
      el('div', { class: 'infos' }, el('span', {}, 'Score : ', score), el('span', {}, 'Vies : ', vies), el('span', {}, 'Niveau : ', el('span', { class: 'val' }, '1')), el('span', {}, 'Record : ', el('span', { class: 'val' }, String(statsDe('cassebriques').meilleur ?? 0)))),
      msg, canvas, astuce('Souris ou ← → · Clic / Espace : lancer'),
    );
    const css = getComputedStyle(document.documentElement);
    const dessiner = () => {
      const g = canvas.getContext('2d')!;
      g.fillStyle = css.getPropertyValue('--surface2').trim() || '#222';
      g.fillRect(0, 0, LARGEUR, HAUTEUR);
      j.e.briques.forEach((v, i) => {
        if (!v) return;
        g.fillStyle = COULEURS[Math.floor(i / COLS)]!;
        g.fillRect((i % COLS) * BW + 1, HAUT_BRIQUES + Math.floor(i / COLS) * BH + 1, BW - 2, BH - 2);
      });
      g.fillStyle = css.getPropertyValue('--accent').trim() || '#85f';
      g.fillRect(j.e.raquette.x - j.e.raquette.w / 2, RAQ_Y, j.e.raquette.w, RAQ_H);
      g.fillStyle = css.getPropertyValue('--texte').trim() || '#fff';
      g.beginPath();
      g.arc(j.e.balle.x, j.e.balle.y, j.e.balle.r, 0, Math.PI * 2);
      g.fill();
      const infos = h.ctx.conteneur.querySelectorAll('.infos .val');
      score.textContent = String(j.e.score);
      vies.textContent = String(j.e.vies);
      if (infos[2]) infos[2].textContent = String(j.e.niveau);
    };
    const vit = () => vitesse(j.e.niveau, h.ctx.options.difficulte);
    const lancerBalle = () => { if (j.e.colle && !j.e.fini) { lancer(j.e, vit()); msg.textContent = ''; } };
    canvas.addEventListener('mousemove', (ev) => { const r = canvas.getBoundingClientRect(); deplacerRaquette(j.e, ((ev.clientX - r.left) / r.width) * LARGEUR); });
    canvas.addEventListener('click', lancerBalle);
    h.clavier((ev) => {
      if (ev.key === 'ArrowLeft') { j.gauche = true; ev.preventDefault(); }
      else if (ev.key === 'ArrowRight') { j.droite = true; ev.preventDefault(); }
      else if (ev.key === ' ') { ev.preventDefault(); lancerBalle(); }
    });
    h.clavier((ev) => { if (ev.key === 'ArrowLeft') j.gauche = false; if (ev.key === 'ArrowRight') j.droite = false; }, 'keyup');
    h.boucle((dt) => {
      if (j.e.fini) return;
      if (j.gauche) deplacerRaquette(j.e, j.e.raquette.x - 480 * dt / 1000);
      if (j.droite) deplacerRaquette(j.e, j.e.raquette.x + 480 * dt / 1000);
      const ev = avancer(j.e, dt / 1000, vit());
      if (ev.brique) h.son('clic');
      if (ev.niveauTermine) { h.son('gagne'); niveauSuivant(j.e); msg.textContent = `Niveau ${j.e.niveau} ! Cliquez pour lancer.`; }
      if (ev.perdue) {
        if (j.e.fini) {
          h.son('perdu');
          h.fin({ victoire: false, score: j.e.score });
          msg.textContent = `Partie terminée ! Score : ${j.e.score}.`;
          msg.className = 'message perdu';
        } else { h.son('erreur'); msg.textContent = 'Balle perdue ! Cliquez pour relancer.'; }
      }
      dessiner();
    });
    dessiner();
  },
});

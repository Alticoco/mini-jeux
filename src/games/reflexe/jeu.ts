import { astuce, fabrique, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { MAX_JOUEURS, MIN_JOUEURS, OBJECTIF, TOUCHES, appui, delaiAleatoire, joueurPourTouche, lancerManche, nouvelle, passerAuVert, type Etat } from './logique';

interface Jeu { e: Etat; minuteur: number | null }

function lancerLaManche(h: Hote<Jeu>): void {
  const j = h.etat;
  if (j.e.phase !== 'repos') return;
  lancerManche(j.e);
  j.minuteur = h.delai(() => { j.minuteur = null; passerAuVert(j.e, performance.now()); h.son('pose'); h.render(); }, delaiAleatoire());
  h.render();
}

export const jeuReflexe = fabrique<Jeu>({
  id: 'reflexe', nom: 'Réflexe', famille: 'Arcade', icone: '⚡',
  description: 'À 2 à 4 sur le même clavier : le plus rapide marque.',
  regles: `<p>De <b>2 à 4 joueurs</b>, même clavier. Chacun a sa touche : <b>J1 : A</b>, <b>J2 : P</b>, <b>J3 : ←</b>, <b>J4 : →</b>.</p><ul><li>Lancez la manche (bouton ou <b>Espace</b>). La zone est <b>rouge</b> : patientez.</li><li>Quand elle passe au <b>vert</b> après un délai aléatoire, le plus rapide à appuyer marque un point.</li><li>Appuyer <b>trop tôt</b> : vous perdez un point (jamais sous 0) et la manche s'arrête.</li><li>Premier à <b>${OBJECTIF} points</b>.</li></ul><p>Pas de statistiques pour ce jeu.</p>`,
  neuf: () => ({ e: nouvelle(2), minuteur: null }),
  valide: () => false,
  sauvegardable: () => false,
  vue(h) {
    const e = h.etat.e;
    const nombre = el('div', { class: 'choix' }, el('span', {}, 'Joueurs :'),
      ...Array.from({ length: MAX_JOUEURS - MIN_JOUEURS + 1 }, (_, k) => k + MIN_JOUEURS).map((n) =>
        el('button', { class: `btn${n === e.n ? ' actif' : ''}`, onclick: () => h.recommencer(() => ({ e: nouvelle(n), minuteur: null })) }, String(n))));
    const d = e.dernier;
    const nom = (i: number) => `J${i + 1}`;
    const texte = e.fini ? `${nom(e.gagnant!)} gagne la partie avec ${e.scores[e.gagnant!]} points !`
      : d?.type === 'faux' ? `Faux départ de ${nom(d.joueur)} : un point en moins.`
      : d ? `${nom(d.joueur)} marque en ${d.ms} ms !` : 'Prêts ? Lancez la manche.';
    const zone = el('div', { class: `reflexe-zone ${e.phase === 'vert' ? 'vert' : e.phase === 'attente' ? 'rouge' : 'repos'}`, role: 'status' },
      e.phase === 'vert' ? 'MAINTENANT !' : e.phase === 'attente' ? 'Attendez…' : e.fini ? 'Terminé' : '⚡');
    const tableau = el('div', { class: 'reflexe-scores' }, ...Array.from({ length: e.n }, (_, i) =>
      el('div', { class: `reflexe-joueur${e.gagnant === i ? ' gagnant' : ''}` },
        el('div', { class: 'reflexe-nom' }, nom(i)),
        el('div', { class: 'reflexe-touche' }, `Touche ${TOUCHES[i]!.libelle}`),
        el('div', { class: 'reflexe-total' }, String(e.scores[i])))));
    const lancerBtn = el('button', { class: 'btn', disabled: e.phase !== 'repos', onclick: () => lancerLaManche(h) }, 'Lancer la manche');
    h.ctx.conteneur.append(nombre, message(texte, e.fini ? 'gagne' : ''), zone, tableau,
      el('div', { class: 'choix' }, lancerBtn), astuce(`Espace : lancer la manche · premier à ${OBJECTIF} points`));
  },
  demarre(h) {
    const j = h.etat;
    h.clavier((ev) => {
      if (ev.repeat) return;
      if (ev.key === ' ') {
        ev.preventDefault();
        lancerLaManche(h);
        return;
      }
      const joueur = joueurPourTouche(ev.key, j.e.n);
      if (joueur < 0) return;
      ev.preventDefault();
      const r = appui(j.e, joueur, performance.now());
      if (!r) return;
      if (j.minuteur !== null) { h.stop(j.minuteur); j.minuteur = null; }
      h.son(r.type === 'faux' ? 'erreur' : j.e.fini ? 'gagne' : 'pose');
      h.render();
    });
  },
});

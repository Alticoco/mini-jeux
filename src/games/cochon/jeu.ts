import { astuce, fabrique, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { MAX_JOUEURS, MIN_JOUEURS, OBJECTIF, garder, lancer, nomsParDefaut, nouvelle, valide, type Etat } from './logique';

const FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

/** Phase de réglage (nombre de joueurs, prénoms) puis partie. */
interface Jeu { reglage: boolean; noms: string[]; e: Etat | null }

export const jeuCochon = fabrique<Jeu>({
  id: 'cochon', nom: 'Cochon', famille: 'Hasard et mémoire', icone: '🐷',
  description: 'Jeu de dés à 2 à 4 sur le même PC : jusqu\'où oser ?',
  regles: `<p>De <b>2 à 4 joueurs</b> sur le même ordinateur, chacun son tour. Premier à <b>${OBJECTIF} points</b>.</p><ul><li><b>Lancer</b> le dé : de 2 à 6, la valeur s'ajoute aux points du tour.</li><li>Un <b>1</b> : vous perdez les points du tour et la main passe.</li><li><b>Garder</b> : les points du tour sont ajoutés à votre total, puis la main passe.</li></ul><p>Pas de statistiques pour ce jeu.</p>`,
  sauvegardable: (j) => !j.e?.fini,
  neuf: () => ({ reglage: true, noms: nomsParDefaut(2), e: null }),
  valide: (x) => {
    const j = x as Partial<Jeu> | null;
    return !!j && typeof j === 'object' && typeof j.reglage === 'boolean' && Array.isArray(j.noms) && j.noms.length >= 2 && j.noms.length <= 4 && j.noms.every((s) => typeof s === 'string') && (j.e === null || valide(j.e));
  },
  vue(h) {
    const j = h.etat;
    if (j.reglage || !j.e) { reglage(h); return; }
    const e = j.e;
    const aff = el('div', { class: 'cochon-de', 'aria-live': 'polite' }, e.de ? FACES[e.de]! : '🎲');
    const tableau = el('div', { class: 'cochon-scores' }, ...e.noms.map((n, i) =>
      el('div', { class: `cochon-joueur${i === e.courant && !e.fini ? ' actif' : ''}${e.gagnant === i ? ' gagnant' : ''}` },
        el('div', { class: 'cochon-nom' }, n), el('div', { class: 'cochon-total' }, String(e.scores[i])))));
    const texte = e.fini ? `${e.noms[e.gagnant!]} gagne avec ${e.scores[e.gagnant!]} points !`
      : e.de === null ? `${e.noms[e.courant]}, c'est à vous. Lancez le dé.`
      : e.cumul === 0 ? `Aïe, un 1 ! Au tour de ${e.noms[e.courant]}.` : `${e.noms[e.courant]} : ${e.cumul} points en jeu.`;
    const lancerBtn = el('button', { class: 'btn', disabled: e.fini, onclick: () => {
      const d = lancer(e);
      h.son(d === 1 ? 'erreur' : 'clic');
      h.sauver();
      h.render();
    } }, 'Lancer');
    const garderBtn = el('button', { class: 'btn', disabled: e.fini || e.cumul === 0, onclick: () => {
      garder(e);
      h.son(e.fini ? 'gagne' : 'pose');
      h.sauver();
      h.render();
    } }, `Garder (${e.cumul})`);
    const reglerBtn = el('button', { class: 'btn', onclick: () => { j.reglage = true; j.noms = [...e.noms]; j.e = null; h.sauver(); h.render(); } }, 'Changer les joueurs');
    h.ctx.conteneur.append(message(texte, e.fini ? 'gagne' : ''), tableau, aff,
      el('div', { class: 'choix' }, lancerBtn, garderBtn, reglerBtn), astuce(`Premier à ${OBJECTIF} points.`));
  },
});

function reglage(h: import('../../shared/fabrique').Hote<Jeu>): void {
  const j = h.etat;
  const champs = j.noms.map((n, i) => {
    const c = el('input', { type: 'text', maxlength: 16, value: n, class: 'cochon-champ', 'aria-label': `Prénom du joueur ${i + 1}` }) as HTMLInputElement;
    c.addEventListener('input', () => { j.noms[i] = c.value; });
    return c;
  });
  const nombre = el('div', { class: 'choix' }, el('span', {}, 'Joueurs :'),
    ...Array.from({ length: MAX_JOUEURS - MIN_JOUEURS + 1 }, (_, k) => k + MIN_JOUEURS).map((n) =>
      el('button', { class: `btn${n === j.noms.length ? ' actif' : ''}`, onclick: () => {
        const anciens = j.noms.slice(0, n);
        const defauts = nomsParDefaut(n);
        j.noms = defauts.map((d, i) => anciens[i] ?? d);
        h.render();
      } }, String(n))));
  const demarrer = el('button', { class: 'btn', onclick: () => { j.e = nouvelle(j.noms); j.reglage = false; h.sauver(); h.render(); } }, 'Commencer');
  h.ctx.conteneur.append(message('Choisissez le nombre de joueurs et leurs prénoms.'), nombre,
    el('div', { class: 'cochon-noms' }, ...champs), el('div', { class: 'choix' }, demarrer));
}

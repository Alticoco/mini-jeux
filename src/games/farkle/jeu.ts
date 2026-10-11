import { entier } from '../../shared/alea';
import { astuce, fabrique, infos, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { meilleureSelection, peutMarquer, scoreSelection } from './logique';

interface Etat {
  totaux: [number, number]; // joueur, ordi
  tour: 0 | 1;
  des: number[]; // dés du lancer en cours
  gardes: boolean[];
  cumul: number; // points non encaissés du tour
  restants: number; // dés disponibles pour le prochain lancer
  texte: string;
  fini: boolean;
}

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const OBJECTIF = 4000;
const neuf = (): Etat => ({ totaux: [0, 0], tour: 0, des: [], gardes: [], cumul: 0, restants: 6, texte: 'À vous : lancez les dés.', fini: false });
const lancerDes = (n: number) => Array.from({ length: n }, () => entier(6) + 1);

export const jeuFarkle = fabrique<Etat>({
  id: 'farkle', nom: 'Farkle', famille: 'Hasard et mémoire', icone: '🎯',
  description: 'Tentez votre chance, encaissez à temps.',
  regles: `<p>Premier à <b>${OBJECTIF} points</b>. À votre tour, lancez 6 dés, puis <b>gardez</b> au moins une combinaison qui marque et relancez les dés restants, ou <b>encaissez</b> vos points.</p><ul><li>Un <b>1</b> = 100 · un <b>5</b> = 50.</li><li>Brelan : 100 × la valeur (trois 1 = 1000) · 4 identiques = 1000 · 5 = 2000 · 6 = 3000.</li><li>Suite 1-2-3-4-5-6 = 1500 · trois paires = 750.</li></ul><p>Si un lancer ne marque rien, c\'est un <b>Farkle</b> : vous perdez les points du tour. Si tous les dés marquent, vous relancez les 6 dés.</p>`,
  score: { libelle: 'victoires', sens: 'haut' },
  neuf,
  valide: (x) => !!x && Array.isArray((x as Etat).totaux),
  sauvegardable: (e) => !e.fini && e.tour === 0,
  vue(h) {
    const e = h.etat;
    const selection = e.des.filter((_, i) => e.gardes[i]);
    const valeurSel = scoreSelection(selection);

    const finTour = (farkle: boolean) => {
      if (farkle) { e.texte = `${e.tour === 0 ? 'Farkle ! Vous perdez' : 'Farkle de l\'ordinateur, il perd'} ${e.cumul} points.`; h.son(e.tour === 0 ? 'erreur' : 'clic'); }
      e.cumul = 0; e.restants = 6; e.des = []; e.gardes = [];
      e.tour = e.tour === 0 ? 1 : 0;
      h.render();
      if (e.tour === 1) h.delai(() => ordi(), 900); else h.sauver();
    };
    const encaisser = (points: number) => {
      e.totaux[e.tour] += points;
      if (e.totaux[e.tour]! >= OBJECTIF) {
        e.fini = true;
        const gagne = e.tour === 0;
        e.texte = gagne ? `Victoire avec ${e.totaux[0]} points !` : `L'ordinateur gagne avec ${e.totaux[1]} points.`;
        h.son(gagne ? 'gagne' : 'perdu');
        h.fin({ victoire: gagne });
        h.render();
        return;
      }
      e.texte = e.tour === 0 ? `Vous encaissez ${points} points.` : `L'ordinateur encaisse ${points} points.`;
      finTour(false);
    };
    const lancer = () => {
      e.des = lancerDes(e.restants);
      e.gardes = e.des.map(() => false);
      h.son('pose');
      if (!peutMarquer(e.des)) { h.render(); h.delai(() => finTour(true), 1100); return; }
      e.texte = e.tour === 0 ? 'Sélectionnez les dés à garder.' : e.texte;
      h.render();
    };
    function ordi(): void {
      if (e.fini) return;
      if (e.des.length === 0) {
        e.texte = 'L\'ordinateur lance les dés…';
        lancer();
        if (e.des.length === 0 || !peutMarquer(e.des)) return;
      }
      h.delai(() => {
        const s = meilleureSelection(e.des);
        e.gardes = e.des.map((_, i) => s.indices.includes(i));
        e.cumul += s.score;
        e.restants = e.des.length - s.indices.length || 6;
        h.render();
        h.delai(() => {
          if (e.cumul >= 400 || (e.restants <= 2 && e.cumul >= 300) || e.totaux[1] + e.cumul >= OBJECTIF) { encaisser(e.cumul); return; }
          e.des = [];
          e.texte = 'L\'ordinateur relance…';
          ordi();
        }, 1000);
      }, 900);
    }

    const des = el('div', { class: 'des' }, ...e.des.map((d, i) => el('button', {
      class: `de${e.gardes[i] ? ' garde' : ''}`, disabled: e.tour !== 0 || e.fini || !peutMarquer(e.des), 'aria-pressed': e.gardes[i], 'aria-label': `Dé ${d}`,
      onclick: () => { e.gardes[i] = !e.gardes[i]; h.render(); },
    }, FACES[d - 1]!)));
    const monTour = e.tour === 0 && !e.fini;
    const aDes = e.des.length > 0 && peutMarquer(e.des);
    h.ctx.conteneur.append(
      infos(['Vous', e.totaux[0]], ['Ordinateur', e.totaux[1]], ['Objectif', OBJECTIF]),
      infos(['Points du tour', e.cumul + valeurSel]),
      message(e.texte, e.fini ? (e.totaux[0] >= OBJECTIF ? 'gagne' : 'perdu') : ''),
      des,
      el('div', { class: 'rangee' },
        el('button', { class: 'btn primaire', disabled: !monTour || e.des.length > 0, onclick: lancer }, e.cumul ? 'Relancer' : 'Lancer les dés'),
        el('button', { class: 'btn', disabled: !monTour || !aDes || valeurSel === 0, onclick: () => { e.cumul += valeurSel; e.restants = e.des.length - selection.length || 6; e.des = []; e.gardes = []; e.texte = 'Relancez les dés restants.'; h.render(); } }, 'Garder et relancer'),
        el('button', { class: 'btn', disabled: !monTour || !aDes || valeurSel === 0, onclick: () => encaisser(e.cumul + valeurSel) }, 'Garder et encaisser')),
      astuce(`${e.restants} dé${e.restants > 1 ? 's' : ''} à lancer`),
    );
  },
});

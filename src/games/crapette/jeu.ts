import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { elCarte, type Carte } from '../../shared/cartes';
import { colonneCartes } from '../../shared/tableau';
import type { Difficulte } from '../../core/types';
import { carteSource, finDuTour, jouer, nouvelle, peutJouer, tirer, tourOrdi, type Destination, type Etat as EtatCrapette, type Source } from './logique';

interface Etat { c: EtatCrapette; niveau: Difficulte; sel: Source | null; texte: string; gagne: boolean }

const neufAvec = (niveau: Difficulte): Etat => ({ c: nouvelle(), niveau, sel: null, texte: 'À vous : jouez vos cartes, puis piochez et terminez le tour.', gagne: false });
const meme = (a: Source | null, b: Source) => !!a && JSON.stringify(a) === JSON.stringify(b);

function verifierFin(h: Hote<Etat>): boolean {
  const e = h.etat;
  if (!e.c.fini) return false;
  e.gagne = e.c.gagnant === 0;
  e.texte = e.c.gagnant === null ? 'Partie nulle.' : e.gagne ? 'Bravo ! Vous avez vidé votre réserve en premier.' : 'L\'ordinateur a vidé sa réserve en premier.';
  h.son(e.gagne ? 'gagne' : 'perdu');
  if (e.c.gagnant !== null) h.fin({ victoire: e.gagne });
  h.render();
  return true;
}

function tourAdverse(h: Hote<Etat>): void {
  const e = h.etat;
  e.texte = 'L\'ordinateur joue…';
  h.render();
  h.delai(() => {
    const n = tourOrdi(e.c, 1, e.niveau);
    e.sel = null;
    if (verifierFin(h)) return;
    e.texte = `L'ordinateur a joué ${n} carte${n > 1 ? 's' : ''}. À vous.`;
    h.son('pose');
    h.render();
    h.sauver();
  }, 900);
}

export const jeuCrapette = fabrique<Etat>({
  id: 'crapette', nom: 'Crapette', famille: 'Cartes contre l\'ordi', icone: '🎴',
  description: 'Le duel de solitaires : videz votre réserve.',
  regles: '<p>Chaque joueur a son jeu de 52 cartes : une <b>réserve</b> de 13 cartes (seule la carte du dessus est visible), une <b>pioche</b> et une <b>défausse</b>. Le but : <b>vider sa réserve en premier</b>.</p><ul><li>Au centre : <b>8 fondations</b> (un as lance une pile, qu\'on monte de l\'as au roi dans la même couleur) et <b>8 colonnes</b> (on descend en alternant rouge/noir ; seule la carte du bas se déplace).</li><li>À votre tour, jouez autant de cartes que vous voulez : <b>dessus de votre réserve</b>, <b>dessus de votre défausse</b> ou <b>bas d\'une colonne</b>. Une colonne vide ne se remplit que depuis la réserve ou la défausse.</li><li>Vous pouvez aussi poser une carte sur la <b>réserve ou la défausse de l\'adversaire</b> : même couleur, valeur juste au-dessus ou au-dessous. Cela alourdit sa réserve !</li><li>Pour finir votre tour : <b>piochez</b> une carte sur votre défausse (vous pouvez ensuite la jouer), puis « Fin du tour ».</li></ul><p>Version simplifiée : pas de « crapette » obligatoire ni de pénalités pour les cartes oubliées.</p>',
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && !!(x as Etat).c && Array.isArray((x as Etat).c.colonnes),
  sauvegardable: (e) => !e.c.fini && e.c.tour === 0,
  demarre(h) {
    if (h.etat.c.tour === 1 && !h.etat.c.fini) tourAdverse(h);
  },
  vue(h) {
    const e = h.etat;
    const c = e.c;
    const mon = c.tour === 0 && !c.fini;
    const jouerVers = (d: Destination) => {
      if (!e.sel || !mon) return;
      if (peutJouer(c, 0, e.sel, d)) {
        jouer(c, 0, e.sel, d);
        e.sel = null;
        h.son('pose');
        e.texte = 'Bien joué.';
        if (verifierFin(h)) return;
        h.render();
        h.sauver();
      } else { h.son('erreur'); e.sel = null; h.render(); }
    };
    const selectionner = (s: Source) => {
      if (!mon || !carteSource(c, 0, s)) return;
      e.sel = meme(e.sel, s) ? null : s;
      h.son('clic');
      h.render();
    };
    const pile = (carte: Carte | undefined, n: number, onclick?: () => void, choisie = false, classe = '') => el('button', { class: `pioche-btn crap-pile ${classe}`, disabled: !onclick || undefined, onclick },
      carte ? elCarte(carte, { class: choisie ? 'choisie' : '' }) : el('div', { class: 'emplacement' }), el('span', { class: 'k-compte' }, String(n)));
    const cote = (j: 0 | 1) => {
      const k = c.cotes[j];
      const adverse = j === 1;
      return el('div', { class: 'crap-cote' },
        el('b', { class: 'blanc' }, adverse ? 'Ordinateur' : 'Vous'),
        pile(k.reserve[k.reserve.length - 1], k.reserve.length, adverse ? (e.sel ? () => jouerVers({ t: 'adverse', pile: 'reserve' }) : undefined) : () => selectionner({ t: 'reserve' }), !adverse && meme(e.sel, { t: 'reserve' }), 'reserve'),
        pile(k.defausse[k.defausse.length - 1], k.defausse.length, adverse ? (e.sel ? () => jouerVers({ t: 'adverse', pile: 'defausse' }) : undefined) : () => selectionner({ t: 'defausse' }), !adverse && meme(e.sel, { t: 'defausse' })),
        el('div', { class: 'pioche-btn crap-pile' }, k.pioche.length ? elCarte(null) : el('div', { class: 'emplacement' }), el('span', { class: 'k-compte' }, String(k.pioche.length))));
    };
    const fond = el('div', { class: 'crap-fond' }, ...c.fondations.map((f) => el('button', { class: 'pioche-btn', disabled: !e.sel || undefined, onclick: () => jouerVers({ t: 'fondation' }) }, f.length ? elCarte(f[f.length - 1]!) : el('div', { class: 'emplacement' }, '♔'))));
    const colonnes = el('div', { class: 'crap-colonnes' }, ...c.colonnes.map((col, i) => colonneCartes(col.map((carte, k) => ({
      carte, choisie: meme(e.sel, { t: 'colonne', i }) && k === col.length - 1,
      onclick: () => { if (k !== col.length - 1) return; if (e.sel && !meme(e.sel, { t: 'colonne', i })) jouerVers({ t: 'colonne', i }); else selectionner({ t: 'colonne', i }); },
    })), { cache: 22, visible: 22, onFond: () => jouerVers({ t: 'colonne', i }) })));
    h.ctx.conteneur.append(
      choix('Niveau :', (['facile', 'moyen', 'difficile'] as Difficulte[]).map((k) => [k, k[0]!.toUpperCase() + k.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Votre réserve', c.cotes[0].reserve.length], ['Réserve adverse', c.cotes[1].reserve.length], ['Tour', c.tours + 1]),
      message(e.texte, c.fini ? (e.gagne ? 'gagne' : 'perdu') : ''),
      el('div', { class: 'tapis crap-table' }, cote(1), fond, colonnes, cote(0)),
      el('div', { class: 'rangee' },
        el('button', { class: 'btn', disabled: !mon || c.aTire, onclick: () => { tirer(c, 0); e.sel = null; h.son('clic'); e.texte = 'Carte retournée sur votre défausse. Jouez-la si possible, puis terminez le tour.'; h.render(); } }, '🂠 Piocher une carte'),
        el('button', { class: 'btn primaire', disabled: !mon || !c.aTire, onclick: () => { finDuTour(c, 0); e.sel = null; tourAdverse(h); } }, 'Fin du tour')),
      astuce('Cliquez une carte à jouer (réserve, défausse ou bas de colonne), puis sa destination'),
    );
  },
});

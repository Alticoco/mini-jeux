import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { elCarte, type Carte } from '../../shared/cartes';
import type { Difficulte } from '../../core/types';
import { captures, choixOrdi, jouer, nouvelleManche, pointsManche, type Etat as EtatScopa, type Joueur } from './logique';

interface Etat { m: EtatScopa; niveau: Difficulte; total: [number, number]; donneur: Joueur; options: { i: number; liste: Carte[][] } | null; texte: string; manche: number; fini: boolean; gagne: boolean; bilan: string }

const OBJECTIF = 11;
const neufAvec = (niveau: Difficulte): Etat => ({ m: nouvelleManche(0), niveau, total: [0, 0], donneur: 1, options: null, texte: 'À vous : jouez une carte.', manche: 1, fini: false, gagne: false, bilan: '' });

function finManche(h: Hote<Etat>): void {
  const e = h.etat;
  const d = pointsManche(e.m);
  e.total[0] += d[0].points;
  e.total[1] += d[1].points;
  const ligne = (n: string, x: typeof d[0]) => `${n} : ${x.cartes} cartes, ${x.carreaux} carreaux, ${x.settebello ? 'settebello, ' : ''}primiera ${x.primiera}, ${x.scope} scopa → ${x.points} pt${x.points > 1 ? 's' : ''}`;
  e.bilan = `${ligne('Vous', d[0])}\n${ligne('Ordinateur', d[1])}`;
  if ((e.total[0] >= OBJECTIF || e.total[1] >= OBJECTIF) && e.total[0] !== e.total[1]) {
    e.fini = true;
    e.gagne = e.total[0] > e.total[1];
    e.texte = e.gagne ? `Victoire ${e.total[0]} à ${e.total[1]} !` : `Défaite ${e.total[0]} à ${e.total[1]}.`;
    h.son(e.gagne ? 'gagne' : 'perdu');
    h.fin({ victoire: e.gagne });
  } else {
    e.texte = 'Manche terminée. Cliquez sur « Manche suivante ».';
  }
  h.render();
  h.sauver();
}

function apres(h: Hote<Etat>, info: { scopa: boolean } | null, qui: string): void {
  const e = h.etat;
  e.options = null;
  e.texte = `${qui}${info?.scopa ? ' — SCOPA !' : ''}`;
  h.son(info?.scopa ? 'gagne' : 'pose');
  if (e.m.fini) return finManche(h);
  if (e.m.tour === 1) {
    h.render();
    h.delai(() => {
      const c = choixOrdi(e.m, 1, Math.random, e.niveau);
      const carte = e.m.mains[1][c.i]!;
      const r = jouer(e.m, 1, c.i, c.prise);
      e.texte = `L'ordinateur joue ${nomCourt(carte)}${r?.capture.length ? ` et prend ${r.capture.length} carte${r.capture.length > 1 ? 's' : ''}` : ''}${r?.scopa ? ' — SCOPA !' : ''}.`;
      h.son(r?.scopa ? 'erreur' : 'pose');
      if (e.m.fini) return finManche(h);
      h.render();
      h.sauver();
    }, 800);
  } else { h.render(); h.sauver(); }
}

const nomCourt = (c: Carte): string => `${c.rang === 1 ? 'l\'as' : c.rang === 11 ? 'le valet' : c.rang === 12 ? 'la dame' : c.rang === 13 ? 'le roi' : `le ${c.rang}`} de ${({ pique: 'pique', coeur: 'cœur', carreau: 'carreau', trefle: 'trèfle' })[c.couleur]}`;

export const jeuScopa = fabrique<Etat>({
  id: 'scopa', nom: 'Scopa', famille: 'Cartes contre l\'ordi', icone: '🪙',
  description: 'Le grand jeu de prises italien.',
  regles: `<p>Jeu de <b>40 cartes</b> (valeurs 1 à 7, valet = 8, dame = 9, roi = 10). Chacun reçoit 3 cartes, 4 sont posées sur la table.</p><ul><li>À votre tour, jouez une carte. Si elle a la <b>même valeur</b> qu'une carte de la table, vous la <b>prenez</b>. Sinon vous pouvez prendre un groupe de cartes dont la <b>somme</b> égale la valeur jouée. S'il y a une carte de même valeur, vous devez la prendre en priorité.</li><li>Sans prise possible, la carte reste sur la table.</li><li><b>Scopa</b> : vider la table d'un coup rapporte 1 point (sauf à la dernière carte).</li></ul><p>En fin de manche, 1 point pour : le plus de <b>cartes</b> ; le plus de <b>carreaux</b> ; le <b>7 de carreau</b> (« settebello ») ; la meilleure <b>primiera</b> (un meilleur 7 / 6 / as / 5 dans chaque couleur). Premier à ${OBJECTIF} points.</p>`,
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && !!(x as Etat).m && Array.isArray((x as Etat).m.table),
  sauvegardable: (e) => !e.fini && e.m.tour === 0,
  vue(h) {
    const e = h.etat;
    const m = e.m;
    const mon = m.tour === 0 && !m.fini && !e.fini;
    const table = el('div', { class: 'scopa-table' }, ...m.table.map((c) => elCarte(c, { class: e.options?.liste.some((o) => o.includes(c)) ? 'jouable' : '' })), ...(m.table.length ? [] : [el('span', { class: 'gros' }, 'Table vide')]));
    const jouerCarte = (i: number, prise?: Carte[]) => {
      const carte = m.mains[0][i]!;
      const r = jouer(m, 0, i, prise);
      if (r) apres(h, r, `Vous jouez ${nomCourt(carte)}${r.capture.length ? ` et prenez ${r.capture.length} carte${r.capture.length > 1 ? 's' : ''}` : ''}.`);
    };
    const main = el('div', { class: 'main-cartes' }, ...m.mains[0].map((c, i) => elCarte(c, {
      class: mon ? 'jouable' : '', onclick: () => {
        if (!mon) return;
        const opts = captures(m.table, c);
        if (opts.length > 1) { e.options = { i, liste: opts }; e.texte = 'Plusieurs prises possibles : choisissez.'; h.render(); return; }
        jouerCarte(i, opts[0]);
      },
    })));
    const choixPrise = e.options
      ? el('div', { class: 'rangee' }, ...e.options.liste.map((o) => el('button', { class: 'btn', onclick: () => jouerCarte(e.options!.i, o) }, `Prendre ${o.map((c) => `${c.rang >= 11 ? ['V', 'D', 'R'][c.rang - 11] : c.rang}${({ pique: '♠', coeur: '♥', carreau: '♦', trefle: '♣' })[c.couleur]}`).join(' + ')}`)), el('button', { class: 'btn', onclick: () => { e.options = null; e.texte = 'À vous.'; h.render(); } }, 'Annuler'))
      : null;
    h.ctx.conteneur.append(
      choix('Niveau :', (['facile', 'moyen', 'difficile'] as Difficulte[]).map((k) => [k, k[0]!.toUpperCase() + k.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Vous', e.total[0]], ['Ordinateur', e.total[1]], ['Manche', e.manche], ['Scope', `${m.scope[0]} - ${m.scope[1]}`]),
      message(e.texte, e.fini ? (e.gagne ? 'gagne' : 'perdu') : ''),
      el('div', { class: 'tapis centre-table' },
        el('div', { class: 'main-cartes dos-main' }, ...m.mains[1].map(() => elCarte(null))),
        table,
        el('div', { class: 'infos blanc' }, el('span', {}, `Pioche : ${m.pioche.length}`), el('span', {}, `Vos cartes prises : ${m.prises[0].length}`), el('span', {}, `Ordinateur : ${m.prises[1].length}`))),
      ...(choixPrise ? [choixPrise] : []),
      main,
      ...(e.bilan ? [el('pre', { class: 'bilan-pre' }, e.bilan)] : []),
      ...(m.fini && !e.fini ? [el('button', { class: 'btn primaire', onclick: () => {
        e.donneur = e.donneur === 0 ? 1 : 0;
        e.m = nouvelleManche(e.donneur === 0 ? 1 : 0);
        e.manche++;
        e.bilan = '';
        e.texte = e.m.tour === 0 ? 'À vous : jouez une carte.' : 'L\'ordinateur commence…';
        h.render();
        if (e.m.tour === 1) apres(h, null, 'L\'ordinateur commence.');
        h.sauver();
      } }, 'Manche suivante')] : []),
      astuce('Cliquez une de vos cartes ; la table s\'éclaire quand une prise est possible'),
    );
  },
  demarre(h) {
    const e = h.etat;
    if (e.m.tour === 1 && !e.m.fini && !e.fini) apres(h, null, 'L\'ordinateur joue.');
  },
});

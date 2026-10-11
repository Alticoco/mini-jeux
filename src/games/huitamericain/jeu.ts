import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { COULEURS, SYMBOLE, elCarte, type Couleur } from '../../shared/cartes';
import { cartesJouables, dessus, jouable, jouerCarte, nouvelle, passer, peutPiocher, piocher, tourOrdi, type Etat as Jeu8 } from './logique';

interface Etat extends Jeu8 { texte: string; choix8: number | null; fini: boolean }

const neuf = (): Etat => ({ ...nouvelle(), texte: 'À vous de jouer.', choix8: null, fini: false });

function apresCoupJoueur(h: Hote<Etat>): void {
  const e = h.etat;
  if (e.gagnant === 0) return finir(h);
  h.render();
  h.delai(() => {
    e.texte = tourOrdi(e);
    h.son('pose');
    if (e.gagnant === 1) return finir(h);
    e.texte += ' À vous.';
    h.render();
    h.sauver();
  }, 700);
}

function finir(h: Hote<Etat>): void {
  const e = h.etat;
  e.fini = true;
  const gagne = e.gagnant === 0;
  e.texte = gagne ? 'Bravo, vous avez posé toutes vos cartes !' : 'L\'ordinateur a posé toutes ses cartes.';
  h.son(gagne ? 'gagne' : 'perdu');
  h.fin({ victoire: gagne });
  h.render();
}

export const jeuHuitAmericain = fabrique<Etat>({
  id: 'huitamericain', nom: '8 américain', famille: 'Cartes contre l\'ordi', icone: '8️⃣',
  description: 'Videz votre main en premier.',
  regles: '<p>Chacun reçoit <b>7 cartes</b>. À son tour, on pose une carte de la <b>même couleur</b> ou de la <b>même valeur</b> que celle du dessus de la défausse.</p><ul><li>Le <b>8</b> est un joker : on peut le poser sur n\'importe quelle carte et on <b>choisit la nouvelle couleur</b>.</li><li>Si on ne peut pas jouer, on <b>pioche</b> (cliquez sur la pioche) jusqu\'à pouvoir poser une carte.</li></ul><p>Le premier qui n\'a plus de cartes gagne.</p>',
  neuf,
  valide: (x) => !!x && Array.isArray((x as Etat).mains) && Array.isArray((x as Etat).pioche),
  sauvegardable: (e) => !e.fini && e.tour === 0,
  vue(h) {
    const e = h.etat;
    const mon = e.tour === 0 && !e.fini && e.choix8 === null;
    const jou = new Set(cartesJouables(e, 0));
    const main = el('div', { class: 'main-cartes' }, ...e.mains[0].map((c, i) =>
      elCarte(c, {
        class: mon && jou.has(i) ? 'jouable' : mon ? 'grisee' : '',
        onclick: () => {
          if (!mon || !jouable(e, c)) { h.son('erreur'); return; }
          if (c.rang === 8) { e.choix8 = i; h.render(); return; }
          jouerCarte(e, 0, i);
          e.texte = '';
          h.son('pose');
          apresCoupJoueur(h);
        },
      })));
    const aucune = mon && jou.size === 0;
    const pioche = el('button', {
      class: `pioche-btn${aucune ? ' conseillee' : ''}`, disabled: !mon, 'aria-label': 'Piocher une carte',
      onclick: () => {
        if (!peutPiocher(e)) { passer(e, 0); e.texte = 'Plus de pioche : vous passez.'; apresCoupJoueur(h); return; }
        piocher(e, 0);
        h.son('clic');
        h.render();
      },
    }, elCarte(null), el('span', { class: 'k-compte' }, String(e.pioche.length)));
    const choixCouleur = e.choix8 !== null
      ? el('div', { class: 'rangee' }, el('span', {}, 'Choisissez la couleur :'), ...COULEURS.map((col: Couleur) => el('button', {
        class: `btn couleur-${col}`, 'aria-label': col, onclick: () => { jouerCarte(e, 0, e.choix8!, col); e.choix8 = null; h.son('pose'); apresCoupJoueur(h); },
      }, SYMBOLE[col])))
      : null;
    h.ctx.conteneur.append(
      infos(['Cartes de l\'ordinateur', e.mains[1].length], ['Pioche', e.pioche.length]),
      message(e.texte, e.fini ? (e.gagnant === 0 ? 'gagne' : 'perdu') : ''),
      el('div', { class: 'tapis centre-table' },
        el('div', { class: 'main-cartes dos-main' }, ...e.mains[1].slice(0, 12).map(() => elCarte(null))),
        el('div', { class: 'rangee' }, pioche, elCarte(dessus(e)), el('div', { class: `couleur-active couleur-${e.couleur}`, title: 'Couleur demandée' }, SYMBOLE[e.couleur])),
      ),
      ...(choixCouleur ? [choixCouleur] : []),
      main,
      astuce(aucune ? 'Aucune carte jouable : cliquez sur la pioche' : 'Cliquez une carte pour la jouer'),
    );
  },
});

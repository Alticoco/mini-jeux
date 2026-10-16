import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { elCarte, nomRang, SYMBOLE, type Carte } from '../../shared/cartes';
import type { Difficulte } from '../../core/types';
import { NB, choixOrdi, fini, jouer, nouvelle, passer, poses, posePossible, type Etat as EtatPres } from './logique';

interface Etat { p: EtatPres; niveau: Difficulte; sel: number[]; texte: string; fini: boolean; rang: number }

const NOMS = ['Vous', 'Léa', 'Hugo', 'Inès'];
const TITRES = ['Président', 'Vice-président', 'Vice-trou du cul', 'Trou du cul'];
const neufAvec = (niveau: Difficulte): Etat => { const p = nouvelle(); return { p, niveau, sel: [], texte: p.tour === 0 ? 'Vous commencez (3 de trèfle).' : `${NOMS[p.tour]} commence.`, fini: false, rang: 0 }; };
const texteCartes = (cs: readonly Carte[]) => `${cs.length} × ${nomRang(cs[0]!.rang)}${SYMBOLE[cs[0]!.couleur]}`;

function suite(h: Hote<Etat>): void {
  const e = h.etat;
  const p = e.p;
  if (fini(p)) {
    e.fini = true;
    e.rang = p.classement.indexOf(0);
    const ok = e.rang <= 1;
    e.texte = `Partie terminée : vous êtes ${TITRES[e.rang]!.toLowerCase()} (${e.rang + 1}ᵉ).`;
    h.son(ok ? 'gagne' : 'perdu');
    h.fin({ victoire: ok, score: 4 - e.rang });
    h.render();
    return;
  }
  h.render();
  if (p.tour !== 0) h.delai(() => tourOrdi(h), 900);
  else h.sauver();
}

function tourOrdi(h: Hote<Etat>): void {
  const e = h.etat;
  const j = e.p.tour;
  if (j === 0 || e.fini) return;
  const pose = choixOrdi(e.p, j, e.niveau);
  if (pose) {
    jouer(e.p, j, pose);
    e.texte = `${NOMS[j]} pose ${texteCartes(pose)}${e.p.mains[j]!.length === 0 ? ' et sort !' : ''}.`;
    h.son('pose');
  } else {
    passer(e.p, j);
    e.texte = `${NOMS[j]} passe.`;
    h.son('clic');
  }
  suite(h);
}

export const jeuPresident = fabrique<Etat>({
  id: 'president', nom: 'Président', famille: 'Cartes contre l\'ordi', icone: '👑',
  description: 'Soyez le premier à vider votre main.',
  regles: '<p>À 4 joueurs, 13 cartes chacun. Le but : <b>se débarrasser de toutes ses cartes</b> en premier (on devient Président) ; le dernier à garder des cartes est le « Trou du cul ».</p><ul><li>Valeur des cartes, de la plus faible à la plus forte : <b>3, 4, 5 … 10, V, D, R, As, 2</b>.</li><li>Le joueur qui ouvre pose une ou plusieurs cartes <b>de même valeur</b> (1 à 4). Chacun doit ensuite poser <b>le même nombre de cartes</b>, d\'une valeur <b>strictement supérieure</b>, ou <b>passer</b>.</li><li>Quand tout le monde passe, la pile est ramassée et le dernier à avoir posé rouvre.</li><li>Un <b>2</b> coupe la pile : on la ramasse et on rejoue immédiatement.</li></ul><p>Cliquez vos cartes pour les sélectionner, puis « Jouer ». Vous gagnez si vous finissez 1ᵉʳ ou 2ᵉ.</p>',
  score: { libelle: 'meilleure place', sens: 'haut', suffixe: ' pts' },
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && !!(x as Etat).p && Array.isArray((x as Etat).p.mains),
  sauvegardable: (e) => !e.fini && e.p.tour === 0,
  demarre(h) {
    if (h.etat.p.tour !== 0 && !h.etat.fini) h.delai(() => tourOrdi(h), 900);
  },
  vue(h) {
    const e = h.etat;
    const p = e.p;
    const mon = p.tour === 0 && !e.fini && !p.classement.includes(0);
    const main = el('div', { class: 'main-cartes' }, ...p.mains[0]!.map((c, i) => elCarte(c, {
      class: e.sel.includes(i) ? 'choisie' : mon && poses(p, 0).some((o) => o.includes(c)) ? 'jouable' : '',
      onclick: () => {
        if (!mon) return;
        if (e.sel.includes(i)) e.sel = e.sel.filter((k) => k !== i);
        else if (e.sel.length && p.mains[0]![e.sel[0]!]!.rang !== c.rang) e.sel = [i];
        else e.sel = [...e.sel, i];
        h.son('clic');
        h.render();
      },
    })));
    const selection = e.sel.map((i) => p.mains[0]![i]!);
    const valide = mon && posePossible(p, 0, selection);
    const sieges = el('div', { class: 'pres-sieges' }, ...[1, 2, 3].map((j) => el('div', { class: `pres-siege${p.tour === j && !e.fini ? ' actif' : ''}` },
      el('b', {}, NOMS[j]!), el('span', {}, p.classement.includes(j) ? `Sorti (${p.classement.indexOf(j) + 1}ᵉ)` : `${p.mains[j]!.length} cartes`),
      el('div', { class: 'main-cartes dos-main petite' }, ...p.mains[j]!.slice(0, 8).map(() => elCarte(null))))));
    h.ctx.conteneur.append(
      choix('Niveau :', (['facile', 'moyen', 'difficile'] as Difficulte[]).map((k) => [k, k[0]!.toUpperCase() + k.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Vos cartes', p.mains[0]!.length], ['Joueurs sortis', p.classement.length]),
      message(e.texte, e.fini ? (e.rang <= 1 ? 'gagne' : 'perdu') : ''),
      sieges,
      el('div', { class: 'tapis centre-table' }, el('div', { class: 'rangee' }, ...(p.pli ? p.pli.cartes.map((c) => elCarte(c)) : [el('div', { class: 'emplacement' })]), el('span', { class: 'gros' }, p.pli ? `${NOMS[p.pli.joueur]} : ${texteCartes(p.pli.cartes)}` : 'Pile vide : ouverture libre'))),
      el('div', { class: 'rangee' },
        el('button', { class: 'btn primaire', disabled: !valide, onclick: () => { const s = selection; jouer(p, 0, s); e.sel = []; e.texte = `Vous posez ${texteCartes(s)}${p.mains[0]!.length === 0 ? ' et sortez !' : ''}.`; h.son('pose'); suite(h); } }, `Jouer la sélection (${selection.length})`),
        el('button', { class: 'btn', disabled: !mon || !p.pli, onclick: () => { passer(p, 0); e.sel = []; e.texte = 'Vous passez.'; suite(h); } }, 'Passer')),
      main,
      ...(e.fini ? [el('ol', { class: 'bilan' }, ...p.classement.map((j, i) => el('li', {}, `${TITRES[i]} : ${NOMS[j]}`)))] : []),
      astuce(`${NB} joueurs · sélectionnez des cartes de même valeur`),
    );
  },
});

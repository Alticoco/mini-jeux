import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { SYMBOLE } from '../../shared/cartes';
import type { Difficulte } from '../../core/types';
import {
  CONTRATS, NB, NOM_CONTRAT, cartesJouables, choixCarte, choixEnchere, ecartIA, ecartValide, ecarter, encherir, jouerCarte, meilleurContrat, nouvelleDonne,
  type CarteT, type Contrat, type Etat as EtatTarot,
} from './logique';

interface Etat { t: EtatTarot; niveau: Difficulte; texte: string; visuPli: Array<{ joueur: number; carte: CarteT }>; sel: CarteT[]; pause: boolean; cumul: number }

const NOMS = ['Vous', 'Léa', 'Camille', 'Hugo'];
const neufAvec = (niveau: Difficulte): Etat => ({ t: nouvelleDonne(3), niveau, texte: 'Enchères : à vous de parler.', visuPli: [], sel: [], pause: false, cumul: 0 });
const RANGS_COULEUR: Record<number, string> = { 11: 'V', 12: 'C', 13: 'D', 14: 'R' };

export function elTarot(c: CarteT | null, attrs: Record<string, string | boolean | EventListener | undefined> = {}): HTMLElement {
  if (!c) return el('div', { class: 'carte dos tarot', 'aria-label': 'carte cachée', ...attrs });
  const { class: extra, ...reste } = attrs;
  if (c.t === 'e') return el('div', { class: `carte tarot excuse${extra ? ` ${extra}` : ''}`, 'aria-label': 'Excuse', ...reste }, el('span', { class: 'centre' }, '🃏'), el('span', {}, 'Excuse'));
  if (c.t === 'a') return el('div', { class: `carte tarot atout${c.n === 1 || c.n === 21 ? ' bout' : ''}${extra ? ` ${extra}` : ''}`, 'aria-label': `Atout ${c.n}`, ...reste }, el('span', { class: 'haut' }, String(c.n)), el('span', { class: 'centre' }, '★'), el('span', { class: 'bas' }, String(c.n)));
  const rouge = c.couleur === 'coeur' || c.couleur === 'carreau';
  const rang = RANGS_COULEUR[c.n] ?? String(c.n);
  return el('div', { class: `carte tarot${rouge ? ' rouge' : ''}${extra ? ` ${extra}` : ''}`, 'aria-label': `${rang} de ${c.couleur}`, ...reste }, el('span', { class: 'haut' }, `${rang}${SYMBOLE[c.couleur]}`), el('span', { class: 'centre' }, SYMBOLE[c.couleur]), el('span', { class: 'bas' }, `${rang}${SYMBOLE[c.couleur]}`));
}

function suivant(h: Hote<Etat>, delai = 700): void {
  const e = h.etat;
  const t = e.t;
  h.render();
  if (t.phase === 'redonne') {
    e.texte = 'Personne ne prend : on redonne.';
    h.render();
    h.delai(() => { e.t = nouvelleDonne((t.donneur + 1) % NB, t.scores); e.texte = 'Nouvelle donne.'; suivant(h, 400); }, 1400);
    return;
  }
  if (t.phase === 'fini') return;
  if (t.phase === 'chien' && t.preneur !== 0) {
    e.texte = `${NOMS[t.preneur]} prend (${NOM_CONTRAT[t.contrat]}) et fait son écart.`;
    h.render();
    h.delai(() => { ecarter(t, ecartIA(t)); suivant(h, 500); }, 1400);
    return;
  }
  if (t.phase === 'chien') return; // à vous d'écarter
  if (t.tour !== 0) h.delai(() => tourIA(h), delai);
}

function tourIA(h: Hote<Etat>): void {
  const e = h.etat;
  const t = e.t;
  const j = t.tour;
  if (j === 0 || e.pause) return;
  if (t.phase === 'encheres') {
    const c = choixEnchere(t, j, e.niveau);
    encherir(t, j, c);
    e.texte = c ? `${NOMS[j]} : ${NOM_CONTRAT[c]}.` : `${NOMS[j]} passe.`;
    h.son(c ? 'pose' : 'clic');
    return annoncePreneur(h);
  }
  if (t.phase === 'jeu') jouer(h, j, choixCarte(t, j, e.niveau));
}

function annoncePreneur(h: Hote<Etat>): void {
  const e = h.etat;
  if (e.t.phase === 'jeu' || e.t.phase === 'chien') e.texte += ` ${NOMS[e.t.preneur]} est le preneur (${NOM_CONTRAT[e.t.contrat]}).`;
  suivant(h);
}

function jouer(h: Hote<Etat>, j: number, carte: CarteT): void {
  const e = h.etat;
  const t = e.t;
  if (e.visuPli.length === NB) e.visuPli = [];
  const r = jouerCarte(t, j, carte);
  if (!r) return;
  h.son('pose');
  if (r.pliFini) {
    e.visuPli = r.pliFini.cartes;
    e.texte = `${NOMS[r.pliFini.gagnant]} remporte le pli.`;
    e.pause = true;
    h.render();
    h.delai(() => { e.pause = false; if (r.donneFinie) finDonne(h); else suivant(h, 200); }, 1200);
    return;
  }
  suivant(h);
}

function finDonne(h: Hote<Etat>): void {
  const e = h.etat;
  const r = e.t.resultat!;
  const mon = r.gains[0]!;
  e.cumul = e.t.scores[0]!;
  e.texte = `${NOMS[e.t.preneur]} ${r.reussi ? 'réussit' : 'chute'} : ${r.points} points avec ${r.oudlers} bout${r.oudlers > 1 ? 's' : ''} (contrat à ${r.requis}). Votre gain : ${mon > 0 ? '+' : ''}${mon}.`;
  h.son(mon > 0 ? 'gagne' : 'perdu');
  h.fin({ victoire: mon > 0, score: mon });
  h.render();
  h.sauver();
}

export const jeuTarot = fabrique<Etat>({
  id: 'tarot', nom: 'Tarot', famille: 'Cartes contre l\'ordi', icone: '🔮',
  description: 'Le tarot français à quatre joueurs.',
  regles: '<p>Tarot à 4 joueurs, <b>78 cartes</b> : 21 atouts, l\'<b>Excuse</b> et 4 couleurs de 14 cartes. Un <b>preneur</b> joue seul contre les trois autres.</p><ul><li><b>Enchères</b> : passer, Petite (×1), Garde (×2), Garde sans le chien (×4), Garde contre (×6). Le plus haut contrat gagne. Avec Petite ou Garde, le preneur prend le <b>chien</b> (6 cartes) et <b>écarte 6 cartes</b> (ni roi ni bout).</li><li><b>Les bouts</b> : Excuse, 1 d\'atout (le petit) et 21. Valeurs : roi 4,5 · dame 3,5 · cavalier 2,5 · valet 1,5 · autres 0,5 (91 points au total).</li><li><b>Contrat</b> : 56 points avec 0 bout, 51 avec 1, 41 avec 2, 36 avec 3.</li><li><b>Jeu</b> : fournir la couleur ; sinon couper à l\'atout (et monter si possible) ; sinon défausser. L\'Excuse se joue quand on veut et reste à son camp. « Petit au bout » : +10 × contrat au camp qui gagne le dernier pli contenant le petit.</li></ul><p>Cette version n\'a ni poignée ni chelem. Après chaque donne, les gains sont cumulés (partie à somme nulle).</p>',
  score: { libelle: 'meilleur gain', sens: 'haut', suffixe: ' pts' },
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && !!(x as Etat).t && Array.isArray((x as Etat).t.mains),
  sauvegardable: (e) => e.t.phase !== 'fini' && (e.t.phase === 'chien' || e.t.tour === 0),
  demarre(h) {
    const e = h.etat;
    e.visuPli = [];
    e.pause = false;
    e.sel = [];
    if (e.t.phase !== 'fini') suivant(h);
  },
  vue(h) {
    const e = h.etat;
    const t = e.t;
    const monTour = t.tour === 0 && !e.pause;
    const jouables = t.phase === 'jeu' && monTour ? cartesJouables(t, 0) : [];
    const ecartPhase = t.phase === 'chien' && t.preneur === 0;
    const main = el('div', { class: 'main-cartes tarot-main' }, ...t.mains[0]!.map((c) => elTarot(c, {
      class: e.sel.includes(c) ? 'choisie' : jouables.includes(c) ? 'jouable' : t.phase === 'jeu' && monTour ? 'grisee' : '',
      onclick: () => {
        if (ecartPhase) { e.sel = e.sel.includes(c) ? e.sel.filter((x) => x !== c) : e.sel.length < 6 ? [...e.sel, c] : e.sel; h.render(); return; }
        if (!jouables.includes(c)) { if (t.phase === 'jeu' && monTour) h.son('erreur'); return; }
        e.sel = [];
        jouer(h, 0, c);
      },
    })));
    const pliAffiche = t.pli.length ? t.pli : e.visuPli.length === NB ? e.visuPli : [];
    const place = (j: number) => pliAffiche.find((p) => p.joueur === j)?.carte;
    const siege = (j: number, classe: string) => el('div', { class: `bel-siege ${classe}${t.tour === j && t.phase !== 'fini' ? ' actif' : ''}` },
      el('b', {}, `${NOMS[j]}${t.preneur === j ? ' ⚔' : ''}`), el('span', {}, `${t.mains[j]!.length} cartes`), el('div', { class: 'main-cartes dos-main petite' }, ...t.mains[j]!.slice(0, 9).map(() => elTarot(null))));
    const carteTable = (j: number, classe: string) => el('div', { class: `bel-pose ${classe}` }, place(j) ? elTarot(place(j)!) : '');
    const centre = el('div', { class: 'bel-centre' }, carteTable(2, 'haut'), carteTable(1, 'gauche'), carteTable(3, 'droite'), carteTable(0, 'bas'));
    const meilleur = meilleurContrat(t);
    const encheres = t.phase === 'encheres' && monTour
      ? el('div', { class: 'rangee' }, el('button', { class: 'btn', onclick: () => { encherir(t, 0, 0); e.texte = 'Vous passez.'; suivant(h); } }, 'Passe'),
        ...CONTRATS.map((c: Contrat) => el('button', { class: 'btn primaire', disabled: c <= meilleur, onclick: () => { encherir(t, 0, c); e.texte = `Vous annoncez ${NOM_CONTRAT[c]}.`; h.son('pose'); annoncePreneur(h); } }, NOM_CONTRAT[c])))
      : null;
    const ecart = ecartPhase
      ? el('div', { class: 'rangee' }, el('span', { class: 'gros' }, `Chien : ${t.chien.length ? '' : 'pris'}`), ...t.chien.map((c) => elTarot(c)),
        el('button', { class: 'btn primaire', disabled: !ecartValide(t, e.sel), onclick: () => { ecarter(t, e.sel); e.sel = []; e.texte = 'Écart effectué. Vous entamez ou jouez après Léa.'; suivant(h, 400); } }, `Écarter ${e.sel.length}/6 cartes`))
      : null;
    const suite = t.phase === 'fini' ? el('button', { class: 'btn primaire', onclick: () => { e.t = nouvelleDonne((t.donneur + 1) % NB, t.scores); e.visuPli = []; e.sel = []; e.texte = 'Nouvelle donne.'; suivant(h, 400); h.sauver(); } }, 'Donne suivante') : null;
    const bilan = t.phase === 'fini' && t.resultat
      ? el('ul', { class: 'bilan' }, ...t.resultat.gains.map((g, i) => el('li', {}, `${NOMS[i]}${i === t.preneur ? ' (preneur)' : ''} : ${g > 0 ? '+' : ''}${g} → total ${t.scores[i]}`)))
      : null;
    h.ctx.conteneur.append(
      choix('Niveau :', (['facile', 'moyen', 'difficile'] as Difficulte[]).map((k) => [k, k[0]!.toUpperCase() + k.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Contrat', t.contrat ? NOM_CONTRAT[t.contrat] : '–'], ['Preneur', t.preneur >= 0 ? NOMS[t.preneur]! : '–'], ['Plis', t.nbPlis], ['Votre cumul', t.scores[0]!]),
      message(e.texte, t.phase === 'fini' ? ((t.resultat?.gains[0] ?? 0) > 0 ? 'gagne' : 'perdu') : ''),
      el('div', { class: 'tapis bel-table' }, siege(2, 'haut'), siege(1, 'gauche'), centre, siege(3, 'droite')),
      ...(encheres ? [encheres] : []), ...(ecart ? [ecart] : []), ...(suite ? [suite] : []), ...(bilan ? [bilan] : []),
      main,
      astuce('Cliquez une carte jouable (surélevée) · en écart, sélectionnez 6 cartes'),
    );
  },
});

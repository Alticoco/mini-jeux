import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { COULEURS, SYMBOLE, elCarte, type Carte, type Couleur } from '../../shared/cartes';
import type { Difficulte } from '../../core/types';
import { OBJECTIF, cartesJouables, choixCarte, choixEnchere, equipe, jouerCarte, nouvelleDonne, partieFinie, passer, prendre, type Etat as EtatBelote } from './logique';

interface Etat { b: EtatBelote; niveau: Difficulte; texte: string; visuPli: Array<{ joueur: number; carte: Carte }>; fini: boolean; gagne: boolean; pause: boolean }

const NOMS = ['Vous', 'Léa', 'Camille (partenaire)', 'Hugo'];
const NOM_COULEUR: Record<Couleur, string> = { pique: 'pique', coeur: 'cœur', carreau: 'carreau', trefle: 'trèfle' };
const neufAvec = (niveau: Difficulte): Etat => {
  const b = nouvelleDonne(3);
  return { b, niveau, texte: 'Enchères : prenez-vous à ' + NOM_COULEUR[b.retournee.couleur] + ' ?', visuPli: [], fini: false, gagne: false, pause: false };
};

function suivant(h: Hote<Etat>, delai = 700): void {
  const e = h.etat;
  const b = e.b;
  h.render();
  if (b.phase === 'redonne') {
    e.texte = 'Personne ne prend : on redonne.';
    h.render();
    h.delai(() => { e.b = nouvelleDonne((b.donneur + 1) % 4, b.scores); e.texte = 'Nouvelle donne.'; suivant(h, 400); }, 1400);
    return;
  }
  if (b.phase === 'donneFinie') return;
  if (b.tour !== 0) h.delai(() => tourIA(h), delai);
}

function tourIA(h: Hote<Etat>): void {
  const e = h.etat;
  const b = e.b;
  const j = b.tour;
  if (j === 0 || e.fini) return;
  if (b.phase === 'enchere1' || b.phase === 'enchere2') {
    const c = choixEnchere(b, j, e.niveau);
    if (c) { prendre(b, j, c); e.texte = `${NOMS[j]} prend à ${NOM_COULEUR[c]}.`; h.son('pose'); }
    else { passer(b, j); e.texte = `${NOMS[j]} passe.`; h.son('clic'); }
    return suivant(h);
  }
  jouerIA(h, j);
}

function jouerIA(h: Hote<Etat>, j: number): void {
  const e = h.etat;
  const b = e.b;
  const carte = choixCarte(b, j, e.niveau);
  if (e.visuPli.length === 4) e.visuPli = [];
  const r = jouerCarte(b, j, carte);
  if (!r) return;
  h.son('pose');
  if (r.annonce) e.texte = `${NOMS[j]} : ${r.annonce}`;
  traiter(h, r);
}

function traiter(h: Hote<Etat>, r: NonNullable<ReturnType<typeof jouerCarte>>): void {
  const e = h.etat;
  if (r.pliFini) {
    e.visuPli = r.pliFini.cartes;
    e.texte = `${NOMS[r.pliFini.gagnant]} remporte le pli (${r.pliFini.points} points).`;
    e.pause = true;
    h.render();
    h.delai(() => { e.pause = false; if (r.donneFinie) finDonne(h); else suivant(h, 200); }, 1300);
    return;
  }
  suivant(h);
}

function finDonne(h: Hote<Etat>): void {
  const e = h.etat;
  const b = e.b;
  const r = b.resultat!;
  const nous = equipe(0);
  const gagnant = partieFinie(b);
  e.texte = `${r.reussi ? `${NOMS[r.preneur]} (équipe ${equipe(r.preneur) === nous ? 'vôtre' : 'adverse'}) réussit son contrat` : `Contrat de ${NOMS[r.preneur]} chuté`} : ${r.points[0]} contre ${r.points[1]}.`;
  if (gagnant !== null) {
    e.fini = true;
    e.gagne = gagnant === 0;
    e.texte += e.gagne ? ' Victoire !' : ' Défaite.';
    h.son(e.gagne ? 'gagne' : 'perdu');
    h.fin({ victoire: e.gagne });
  }
  h.render();
  h.sauver();
}

export const jeuBelote = fabrique<Etat>({
  id: 'belote', nom: 'Belote', famille: 'Cartes contre l\'ordi', icone: '🂮',
  description: 'La belote à quatre, avec votre partenaire.',
  regles: `<p>Belote à 4 joueurs, <b>vous (bas) et Camille (haut) contre Léa et Hugo</b>. Jeu de 32 cartes, 8 par joueur.</p><ul><li><b>Enchères</b> : une carte est retournée. Au 1ᵉʳ tour, on peut <b>prendre</b> à sa couleur (qui devient l'atout) ; au 2ᵉ tour, à <b>une autre couleur</b>. Sans preneur, on redonne.</li><li><b>Valeurs</b> — atout : Valet 20, 9 14, As 11, 10 10, Roi 4, Dame 3 ; autres couleurs : As 11, 10 10, Roi 4, Dame 3, Valet 2. <b>10 de der</b> : +10 au dernier pli.</li><li><b>Obligations</b> : fournir la couleur demandée ; sinon <b>couper</b> (et surcouper si possible) sauf si le partenaire est maître ; à l'atout, <b>monter</b> si possible.</li><li><b>Belote-rebelote</b> : roi + dame d'atout dans la même main : +20.</li></ul><p>Le preneur doit réaliser au moins <b>82 points</b> sur 162, sinon l'adversaire marque tout (« dedans »). Partie en <b>${OBJECTIF} points</b>.</p>`,
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && !!(x as Etat).b && Array.isArray((x as Etat).b.mains),
  sauvegardable: (e) => !e.fini && (e.b.phase === 'donneFinie' || e.b.tour === 0),
  demarre(h) {
    const e = h.etat;
    e.visuPli = [];
    e.pause = false;
    if (e.b.phase !== 'donneFinie' && e.b.tour !== 0 && !e.fini) suivant(h);
  },
  vue(h) {
    const e = h.etat;
    const b = e.b;
    const monTour = b.tour === 0 && !e.fini && !e.pause;
    const jouables = b.phase === 'jeu' && monTour ? cartesJouables(b, 0) : [];
    const main = el('div', { class: 'main-cartes' }, ...b.mains[0]!.map((c) => elCarte(c, {
      class: jouables.includes(c) ? 'jouable' : b.phase === 'jeu' && monTour ? 'grisee' : '',
      onclick: () => {
        if (!jouables.includes(c)) { if (b.phase === 'jeu' && monTour) h.son('erreur'); return; }
        if (e.visuPli.length === 4) e.visuPli = [];
        const r = jouerCarte(b, 0, c);
        if (!r) return;
        h.son('pose');
        if (r.annonce) e.texte = `Vous : ${r.annonce}`;
        traiter(h, r);
      },
    })));
    // pli en cours (ou le dernier pli terminé)
    const pliAffiche = b.pli.length ? b.pli : e.visuPli.length === 4 ? e.visuPli : [];
    const place = (j: number) => pliAffiche.find((p) => p.joueur === j)?.carte;
    const siege = (j: number, classe: string) => el('div', { class: `bel-siege ${classe}${b.tour === j && !e.fini ? ' actif' : ''}` },
      el('b', {}, NOMS[j]!), ...(j === 0 ? [] : [el('div', { class: 'main-cartes dos-main petite' }, ...b.mains[j]!.map(() => elCarte(null)))]));
    const carteTable = (j: number, classe: string) => el('div', { class: `bel-pose ${classe}` }, place(j) ? elCarte(place(j)!) : '');
    const centre = el('div', { class: 'bel-centre' }, carteTable(2, 'haut'), carteTable(1, 'gauche'), carteTable(3, 'droite'), carteTable(0, 'bas'));
    let actions: HTMLElement | null = null;
    if ((b.phase === 'enchere1' || b.phase === 'enchere2') && monTour) {
      actions = el('div', { class: 'rangee' },
        ...(b.phase === 'enchere1'
          ? [el('button', { class: 'btn primaire', onclick: () => { prendre(b, 0); e.texte = `Vous prenez à ${NOM_COULEUR[b.retournee.couleur]}.`; h.son('pose'); suivant(h); } }, `Prendre à ${SYMBOLE[b.retournee.couleur]} ${NOM_COULEUR[b.retournee.couleur]}`)]
          : COULEURS.filter((c) => c !== b.retournee.couleur).map((c) => el('button', { class: 'btn', onclick: () => { prendre(b, 0, c); e.texte = `Vous prenez à ${NOM_COULEUR[c]}.`; h.son('pose'); suivant(h); } }, `Prendre à ${SYMBOLE[c]}`))),
        el('button', { class: 'btn', onclick: () => { passer(b, 0); e.texte = 'Vous passez.'; suivant(h); } }, 'Passer'));
    }
    const carteRetournee = b.phase === 'enchere1' || b.phase === 'enchere2' ? el('div', { class: 'rangee' }, el('span', { class: 'gros' }, 'Carte retournée :'), elCarte(b.retournee)) : null;
    const suite = b.phase === 'donneFinie' && !e.fini ? el('button', { class: 'btn primaire', onclick: () => { e.b = nouvelleDonne((b.donneur + 1) % 4, b.scores); e.visuPli = []; e.texte = `Nouvelle donne. ${NOMS[(e.b.donneur + 1) % 4]} parle en premier.`; suivant(h, 500); h.sauver(); } }, 'Donne suivante') : null;
    h.ctx.conteneur.append(
      choix('Niveau :', (['facile', 'moyen', 'difficile'] as Difficulte[]).map((k) => [k, k[0]!.toUpperCase() + k.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Nous', b.scores[0]], ['Eux', b.scores[1]], ['Atout', b.atout ? `${SYMBOLE[b.atout]} ${NOM_COULEUR[b.atout]}` : '–'], ['Preneur', b.preneur >= 0 ? NOMS[b.preneur]!.split(' ')[0]! : '–']),
      message(e.texte, e.fini ? (e.gagne ? 'gagne' : 'perdu') : ''),
      el('div', { class: 'tapis bel-table' }, siege(2, 'haut'), siege(1, 'gauche'), centre, siege(3, 'droite')),
      ...(carteRetournee ? [carteRetournee] : []),
      ...(actions ? [actions] : []),
      ...(suite ? [suite] : []),
      main,
      astuce(`Première équipe à ${OBJECTIF} points · vos cartes jouables sont surélevées`),
    );
  },
});

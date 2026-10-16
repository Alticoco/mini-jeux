import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import type { Difficulte } from '../../core/types';
import { cleePosition, coupsLegaux, depart, enEchec, caseRoi, finDePartie, jouer, meilleurCoup, nomCase, notation, type Coup, type Etat as EtatEchecs, type Fin } from './logique';

interface Instantane { e: EtatEchecs; cles: string[]; dernier: [number, number] | null; coups: string[] }
interface Etat extends Instantane { niveau: Difficulte; historique: Instantane[]; sel: number | null; choixPromo: Coup[] | null; phase: 'joueur' | 'ordi' | 'fini'; texte: string; fin: Fin; gagne: boolean }

const GLYPHES = ['', '♟', '♞', '♝', '♜', '♛', '♚'];
const neufAvec = (niveau: Difficulte): Etat => {
  const e = depart();
  return { e, cles: [cleePosition(e)], dernier: null, niveau, historique: [], sel: null, choixPromo: null, phase: 'joueur', texte: 'À vous de jouer (blancs).', fin: null, gagne: false, coups: [] };
};
const TEXTE_FIN: Record<Exclude<Fin, null>, string> = { mat: 'Échec et mat', pat: 'Pat : partie nulle', cinquante: 'Règle des 50 coups : partie nulle', materiel: 'Matériel insuffisant : partie nulle', repetition: 'Triple répétition : partie nulle' };

function apresCoup(h: Hote<Etat>, coup: Coup, joueur: boolean): void {
  const e = h.etat;
  if (joueur) e.historique.push({ e: e.e, cles: [...e.cles], dernier: e.dernier, coups: [...e.coups] });
  e.e = jouer(e.e, coup);
  e.cles.push(cleePosition(e.e));
  e.dernier = [coup.de, coup.vers];
  e.coups.push(notation(coup));
  e.sel = null;
  e.choixPromo = null;
  h.son('pose');
  const fin = finDePartie(e.e, e.cles);
  if (fin) {
    e.phase = 'fini';
    e.fin = fin;
    const nulle = fin !== 'mat';
    e.gagne = fin === 'mat' && joueur;
    e.texte = fin === 'mat' ? `${TEXTE_FIN.mat} ! ${joueur ? 'Vous gagnez.' : "L'ordinateur gagne."}` : TEXTE_FIN[fin];
    h.son(nulle ? 'clic' : e.gagne ? 'gagne' : 'perdu');
    if (!nulle) h.fin({ victoire: e.gagne });
    h.render();
    h.sauver();
    return;
  }
  e.texte = enEchec(e.e) ? (joueur ? 'Échec à l\'ordinateur !' : 'Vous êtes en échec !') : joueur ? '' : 'À vous de jouer.';
  if (joueur) {
    e.phase = 'ordi';
    e.texte = (enEchec(e.e) ? 'Échec ! ' : '') + 'L\'ordinateur réfléchit…';
    h.render();
    h.delai(() => {
      const m = meilleurCoup(e.e, e.niveau);
      if (m) apresCoup(h, m, false);
    }, 80);
  } else {
    e.phase = 'joueur';
    h.render();
  }
  h.sauver();
}

export const jeuEchecs = fabrique<Etat>({
  id: 'echecs', nom: 'Échecs', famille: 'Contre l\'ordi', icone: '♞',
  description: 'La partie royale contre l\'ordinateur.',
  regles: '<p>Vous jouez les <b>blancs</b> (en bas), l\'ordinateur les noirs. Le but : mettre le roi adverse <b>échec et mat</b> (menacé sans pouvoir parer).</p><ul><li>Cliquez une de vos pièces : ses déplacements possibles s\'affichent. Cliquez la case de destination.</li><li>Toutes les règles sont gérées : <b>roque</b>, <b>prise en passant</b>, <b>promotion</b> (vous choisissez la pièce), échec, mat, pat.</li><li>Parties nulles : pat, matériel insuffisant, <b>50 coups</b> sans prise ni coup de pion, <b>triple répétition</b>.</li></ul><p>Le niveau règle la profondeur de réflexion de l\'ordinateur (facile : il joue parfois au hasard ; difficile : jusqu\'à 2 secondes par coup). « Annuler » reprend votre dernier coup.</p>',
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && !!(x as Etat).e && Array.isArray((x as Etat).e.b) && (x as Etat).e.b.length === 64,
  sauvegardable: (e) => e.phase !== 'fini',
  demarre(h) {
    const e = h.etat;
    if (e.phase === 'ordi') {
      const m = meilleurCoup(e.e, e.niveau);
      if (m) apresCoup(h, m, false);
    }
  },
  vue(h) {
    const e = h.etat;
    const legaux = e.phase === 'joueur' ? coupsLegaux(e.e) : [];
    const sources = new Set(legaux.map((c) => c.de));
    const cibles = new Map<number, Coup[]>();
    for (const c of legaux) if (c.de === e.sel) cibles.set(c.vers, [...(cibles.get(c.vers) ?? []), c]);
    const roiEchec = enEchec(e.e) ? caseRoi(e.e.b, e.e.tour) : -1;
    const plateau = el('div', { class: 'ec-plateau', role: 'grid', 'aria-label': 'Échiquier' });
    for (let i = 0; i < 64; i++) {
      const v = e.e.b[i]!;
      const sombre = ((i >> 3) + (i & 7)) % 2 === 1;
      plateau.append(el('button', {
        class: `ec-case${sombre ? ' sombre' : ''}${e.sel === i ? ' choisie' : ''}${cibles.has(i) ? ' cible' : ''}${e.dernier && e.dernier.includes(i) ? ' dernier' : ''}${roiEchec === i ? ' echec' : ''}`,
        disabled: !(sources.has(i) || cibles.has(i)), 'aria-label': `${nomCase(i)}${v ? `, pièce ${v > 0 ? 'blanche' : 'noire'}` : ''}`,
        onclick: () => {
          const choix = cibles.get(i);
          if (choix) {
            if (choix.length > 1) { e.choixPromo = choix; h.render(); return; }
            apresCoup(h, choix[0]!, true);
            return;
          }
          if (sources.has(i)) { e.sel = e.sel === i ? null : i; h.son('clic'); h.render(); }
        },
      }, v ? el('span', { class: `ec-piece ${v > 0 ? 'blanche' : 'noire'}` }, GLYPHES[Math.abs(v)]!) : cibles.has(i) ? el('span', { class: 'point' }) : ''));
    }
    const promo = e.choixPromo
      ? el('div', { class: 'rangee' }, el('span', {}, 'Promouvoir en :'), ...e.choixPromo.map((c) => el('button', { class: 'btn', onclick: () => apresCoup(h, c, true) }, ['', '', 'Cavalier ♞', 'Fou ♝', 'Tour ♜', 'Dame ♛'][c.promo!]!)))
      : null;
    h.ctx.conteneur.append(
      choix('Niveau :', (['facile', 'moyen', 'difficile'] as Difficulte[]).map((k) => [k, k[0]!.toUpperCase() + k.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Coup n°', e.e.num], ['Dernier coups', e.coups.slice(-4).join(' ') || '–']),
      message(e.texte, e.phase === 'fini' ? (e.gagne ? 'gagne' : e.fin === 'mat' ? 'perdu' : '') : ''),
      ...(promo ? [promo] : []),
      plateau,
      astuce('Cliquez une pièce, puis la case de destination'),
    );
  },
  annuler(h) {
    const e = h.etat;
    if (e.phase === 'ordi' || !e.historique.length) return;
    const prec = e.historique.pop()!;
    Object.assign(e, prec, { phase: 'joueur', sel: null, choixPromo: null, fin: null, gagne: false, texte: 'Coup annulé. À vous de jouer.' });
    h.render();
    h.sauver();
  },
});

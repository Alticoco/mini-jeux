import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { elCarte, SYMBOLE, type Carte } from '../../shared/cartes';
import type { Difficulte } from '../../core/types';
import { OUVERTURE, ajouter, completer, defausser, finirSansDefausse, nouvelle, piocher, poser, tourOrdi, valeurMain, type Etat as EtatRami } from './logique';

interface Etat { r: EtatRami; niveau: Difficulte; sel: number[]; cible: number | null; texte: string; gagne: boolean }

const neufAvec = (niveau: Difficulte): Etat => ({ r: nouvelle(), niveau, sel: [], cible: null, texte: 'À vous : piochez dans le talon ou prenez la défausse.', gagne: false });
const trier = (m: Carte[]) => m.sort((a, b) => (a.rang === 0 ? 1 : 0) - (b.rang === 0 ? 1 : 0) || a.couleur.localeCompare(b.couleur) || a.rang - b.rang);

function apresMonTour(h: Hote<Etat>): void {
  const e = h.etat;
  e.sel = [];
  e.cible = null;
  if (e.r.fini) return fin(h);
  e.texte = `${e.texte} L'ordinateur joue…`;
  h.render();
  h.delai(() => {
    const t = tourOrdi(e.r, e.niveau);
    e.texte = `L'ordinateur ${t}.`;
    h.son('pose');
    if (e.r.fini) return fin(h);
    e.texte += ' À vous : piochez.';
    h.render();
    h.sauver();
  }, 1000);
}

function fin(h: Hote<Etat>): void {
  const e = h.etat;
  const r = e.r;
  e.gagne = r.gagnant === 0;
  e.texte = r.gagnant === null ? 'Partie nulle (plus de cartes à piocher).' : e.gagne ? `Rami ! Vous avez gagné (l'ordinateur garde ${r.points[1]} points).` : `L'ordinateur a gagné (il vous reste ${r.points[0]} points en main).`;
  h.son(e.gagne ? 'gagne' : 'perdu');
  if (r.gagnant !== null) h.fin({ victoire: e.gagne, score: e.gagne ? r.points[1] : undefined });
  h.render();
  h.sauver();
}

const nomCarte = (c: Carte) => (c.rang === 0 ? '🃏' : `${c.rang === 1 ? 'A' : c.rang === 11 ? 'V' : c.rang === 12 ? 'D' : c.rang === 13 ? 'R' : c.rang}${SYMBOLE[c.couleur]}`);

export const jeuRami = fabrique<Etat>({
  id: 'rami', nom: 'Rami', famille: 'Cartes contre l\'ordi', icone: '🃏',
  description: 'Posez vos combinaisons, videz votre main.',
  regles: `<p>Rami à deux. 106 cartes (2 jeux + 2 jokers 🃏), <b>13 cartes</b> chacun. Le but : <b>poser toutes vos cartes</b> en combinaisons.</p><ul><li><b>Brelan / carré</b> : 3 ou 4 cartes de <b>même valeur</b> et de couleurs différentes.</li><li><b>Suite</b> : 3 cartes ou plus <b>consécutives de la même couleur</b> (A-2-3 ou D-R-A, pas de R-A-2).</li><li>Un <b>joker</b> remplace une carte (un par combinaison).</li></ul><p>À votre tour : <b>piochez</b> (talon ou haut de la défausse), <b>posez</b> des combinaisons (sélectionnez les cartes puis « Poser »), <b>complétez</b> les combinaisons de la table (sélectionnez une carte puis cliquez sur la combinaison), et enfin <b>défaussez</b> une carte.</p><p>Votre <b>première pose</b> doit totaliser au moins <b>${OUVERTURE} points</b> dans le même tour (valeurs : as 11, figures 10, autres = leur nombre ; as 1 dans A-2-3), sinon elle est annulée. Une carte restée en main en fin de partie coûte sa valeur (joker 25).</p>`,
  score: { libelle: 'meilleur décompte', sens: 'haut', suffixe: ' pts' },
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && !!(x as Etat).r && Array.isArray((x as Etat).r.mains),
  sauvegardable: (e) => !e.r.fini && e.r.tour === 0 && e.r.phase === 'piocher',
  demarre(h) {
    const e = h.etat;
    if (e.r.tour === 1 && !e.r.fini) apresMonTour(h);
  },
  vue(h) {
    const e = h.etat;
    const r = e.r;
    const mon = r.tour === 0 && !r.fini;
    const main = el('div', { class: 'main-cartes rami-main' }, ...r.mains[0].map((c, i) => elCarte(c.rang === 0 ? { rang: 13, couleur: 'pique' } : c, {
      class: `${e.sel.includes(i) ? 'choisie' : ''}${c.rang === 0 ? ' joker' : ''}`,
      onclick: () => { if (!mon || r.phase !== 'jouer') return; e.sel = e.sel.includes(i) ? e.sel.filter((k) => k !== i) : [...e.sel, i]; h.son('clic'); h.render(); },
    })));
    // les jokers affichés en carte spéciale
    main.querySelectorAll('.joker').forEach((n) => { n.innerHTML = '<span class="centre">🃏</span><span>Joker</span>'; });
    const selection = e.sel.map((i) => r.mains[0][i]!);
    const tableMelds = (proprio: 0 | 1) => el('div', { class: 'rami-poses' }, ...r.poses.filter((p) => p.proprio === proprio).map((p) => {
      const peutAjouter = mon && r.phase === 'jouer' && selection.length === 1 && !!ajouter(p, selection[0]!) && (r.ouvert[0] || r.provisoires.reduce((s, q) => s + q.points, 0) >= OUVERTURE);
      return el('button', { class: `rami-pose${peutAjouter ? ' cible' : ''}`, disabled: !peutAjouter, 'aria-label': `Combinaison ${p.type}`,
        onclick: () => { if (completer(r, 0, selection[0]!, p)) { e.sel = []; h.son('pose'); e.texte = 'Carte ajoutée à la combinaison.'; h.render(); } } },
      ...p.cartes.map((c) => el('span', { class: `mini${c.rang === 0 ? ' joker' : ''}${c.couleur === 'coeur' || c.couleur === 'carreau' ? ' rouge' : ''}` }, nomCarte(c))));
    }));
    const haut = r.defausse[r.defausse.length - 1];
    const pointsProv = r.provisoires.reduce((s, p) => s + p.points, 0);
    const actionPioche = mon && r.phase === 'piocher';
    const talon = el('button', { class: 'pioche-btn', disabled: !actionPioche, 'aria-label': 'Piocher dans le talon', onclick: () => { piocher(r, 0, false); trier(r.mains[0]); e.texte = 'Posez, complétez, puis défaussez une carte.'; h.son('clic'); h.render(); } }, elCarte(null), el('span', { class: 'k-compte' }, String(r.talon.length)));
    const defausseBtn = haut ? el('button', { class: 'pioche-btn', disabled: !actionPioche, 'aria-label': 'Prendre la défausse', onclick: () => { piocher(r, 0, true); trier(r.mains[0]); e.texte = 'Défausse prise. Posez, complétez, puis défaussez.'; h.son('clic'); h.render(); } }, elCarte(haut.rang === 0 ? { rang: 13, couleur: 'pique' } : haut)) : el('div', { class: 'emplacement' });
    const valide = selection.length >= 3 && mon && r.phase === 'jouer';
    h.ctx.conteneur.append(
      choix('Niveau :', (['facile', 'moyen', 'difficile'] as Difficulte[]).map((k) => [k, k[0]!.toUpperCase() + k.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Vos cartes', r.mains[0].length], ['Ordinateur', r.mains[1].length], ['Ouverture', r.ouvert[0] ? 'faite' : r.provisoires.length ? `${pointsProv} / ${OUVERTURE}` : `${OUVERTURE} pts requis`], ['Ordi ouvert', r.ouvert[1] ? 'oui' : 'non']),
      message(e.texte, r.fini ? (e.gagne ? 'gagne' : 'perdu') : ''),
      el('div', { class: 'tapis centre-table' },
        el('div', { class: 'muet blanc' }, 'Combinaisons de l\'ordinateur'), tableMelds(1),
        el('div', { class: 'rangee' }, talon, defausseBtn),
        el('div', { class: 'muet blanc' }, 'Vos combinaisons'), tableMelds(0)),
      el('div', { class: 'rangee' },
        el('button', { class: 'btn primaire', disabled: !valide, onclick: () => {
          const p = poser(r, 0, selection);
          if (!p) { h.son('erreur'); e.texte = 'Ces cartes ne forment pas une combinaison valide.'; h.render(); return; }
          e.sel = [];
          e.texte = `Combinaison posée (${p.points} points).${r.ouvert[0] ? '' : ` Ouverture : ${r.provisoires.reduce((s, q) => s + q.points, 0)} / ${OUVERTURE}.`}`;
          h.son('pose');
          if (!r.mains[0].length) { finirSansDefausse(r, 0) ? apresMonTour(h) : h.render(); return; }
          h.render();
        } }, `Poser la sélection (${selection.length})`),
        el('button', { class: 'btn', disabled: !(mon && r.phase === 'jouer' && selection.length === 1), onclick: () => {
          const c = selection[0]!;
          const res = defausser(r, 0, c);
          if (res === 'refus') return;
          e.texte = res === 'invalide' ? `Ouverture insuffisante (moins de ${OUVERTURE} points) : vos poses reviennent en main.` : `Vous défaussez ${nomCarte(c)}.`;
          h.son('clic');
          e.sel = [];
          if (r.fini) return fin(h);
          apresMonTour(h);
        } }, 'Défausser la carte sélectionnée'),
        el('button', { class: 'btn', onclick: () => { trier(r.mains[0]); e.sel = []; h.render(); } }, 'Trier')),
      main,
      ...(r.fini ? [el('div', { class: 'muet' }, `Cartes de l'ordinateur : ${r.mains[1].map((c) => nomCarte(c)).join(' ') || '–'} (valeur ${r.mains[1].reduce((s, c) => s + valeurMain(c), 0)})`)] : []),
      astuce('Sélectionnez des cartes, puis « Poser » (3 minimum) ou « Défausser » (1 carte)'),
    );
  },
});

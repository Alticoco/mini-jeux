import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { elCarte } from '../../shared/cartes';
import { MAX_RECYCLAGES, carteDe, coupPossible, gagne, idx, libre, nouvelle, piocher, retirerPaire, retirerRoi, type Etat as EtatP, type Ref } from './logique';

interface Etat { jeu: EtatP; historique: EtatP[]; sel: Ref | null; fini: boolean; perdu: boolean }

const neuf = (): Etat => ({ jeu: nouvelle(), historique: [], sel: null, fini: false, perdu: false });
const meme = (a: Ref | null, b: Ref) => !!a && JSON.stringify(a) === JSON.stringify(b);

function verifier(h: Hote<Etat>): void {
  const e = h.etat;
  if (gagne(e.jeu)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.jeu.coups }); }
  else if (!coupPossible(e.jeu)) { e.fini = e.perdu = true; h.son('perdu'); h.fin({ victoire: false }); }
  h.render();
  h.sauver();
}

function memoriser(e: Etat): void {
  e.historique.push(structuredClone(e.jeu));
  if (e.historique.length > 100) e.historique.shift();
}

function cliquer(h: Hote<Etat>, r: Ref): void {
  const e = h.etat;
  if (e.fini || !carteDe(e.jeu, r)) return;
  const c = carteDe(e.jeu, r)!;
  if (c.rang === 13) { memoriser(e); retirerRoi(e.jeu, r); e.sel = null; h.son('pose'); return verifier(h); }
  if (!e.sel) { e.sel = r; h.son('clic'); return h.render(); }
  if (meme(e.sel, r)) { e.sel = null; return h.render(); }
  memoriser(e);
  if (retirerPaire(e.jeu, e.sel, r)) { e.sel = null; h.son('pose'); return verifier(h); }
  e.historique.pop();
  h.son('erreur');
  e.sel = r;
  h.render();
}

export const jeuPyramide = fabrique<Etat>({
  id: 'pyramide', nom: 'Pyramide', famille: 'Cartes solo', icone: '🔺',
  description: 'Retirez les paires qui font 13.',
  regles: `<p>Démontez la pyramide en retirant des <b>paires de cartes dont la somme vaut 13</b> (As = 1, Valet = 11, Dame = 12). Un <b>Roi</b> (13) se retire seul d'un clic.</p><ul><li>Seules les cartes <b>libres</b> (non recouvertes) et le dessus de la défausse peuvent être utilisés.</li><li>Cliquez sur le <b>talon</b> pour retourner une carte dans la défausse. Quand il est vide, il peut être retourné ${MAX_RECYCLAGES} fois.</li></ul><p>Gagnez en vidant toute la pyramide.</p>`,
  neuf,
  valide: (x) => !!x && !!(x as Etat).jeu && Array.isArray((x as Etat).jeu.pyr),
  vue(h) {
    const e = h.etat;
    const j = e.jeu;
    const pyramide = el('div', { class: 'pyr' });
    for (let r = 0; r < 7; r++) {
      const ligne = el('div', { class: 'pyr-ligne' });
      for (let c = 0; c <= r; c++) {
        const i = idx(r, c);
        const carte = j.pyr[i];
        const ref: Ref = { type: 'pyr', i };
        ligne.append(carte
          ? elCarte(carte, { class: `${libre(j, i) ? 'libre' : 'bloquee'}${meme(e.sel, ref) ? ' choisie' : ''}`, onclick: libre(j, i) ? () => cliquer(h, ref) : undefined })
          : el('div', { class: 'carte-vide' }));
      }
      pyramide.append(ligne);
    }
    const defRef: Ref = { type: 'defausse' };
    const haut = j.defausse[j.defausse.length - 1];
    const talon = j.talon.length
      ? el('button', { class: 'pioche-btn', 'aria-label': 'Retourner une carte', onclick: () => { memoriser(e); piocher(j); e.sel = null; h.son('clic'); verifier(h); } }, elCarte(null), el('span', { class: 'k-compte' }, String(j.talon.length)))
      : el('button', { class: 'emplacement', 'aria-label': 'Reformer le talon', disabled: !j.defausse.length || j.recyclages >= MAX_RECYCLAGES, onclick: () => { memoriser(e); piocher(j); e.sel = null; verifier(h); } }, j.recyclages >= MAX_RECYCLAGES ? '' : '↻');
    h.ctx.conteneur.append(
      infos(['Cartes restantes', j.pyr.filter(Boolean).length], ['Talon', j.talon.length], ['Reformations', `${j.recyclages}/${MAX_RECYCLAGES}`]),
      message(e.fini ? (e.perdu ? 'Plus aucun coup possible : perdu. (Annuler pour reprendre)' : 'Bravo ! La pyramide est vidée.') : '', e.fini ? (e.perdu ? 'perdu' : 'gagne') : ''),
      el('div', { class: 'tapis centre-table' }, pyramide,
        el('div', { class: 'rangee' }, talon, haut ? elCarte(haut, { class: meme(e.sel, defRef) ? 'choisie' : '', onclick: () => cliquer(h, defRef) }) : el('div', { class: 'emplacement' }))),
      astuce('Sélectionnez deux cartes dont la somme vaut 13, ou un Roi seul'),
    );
  },
  annuler(h) {
    const e = h.etat;
    const p = e.historique.pop();
    if (!p) return;
    e.jeu = p;
    e.sel = null;
    e.fini = e.perdu = false;
    h.render();
    h.sauver();
  },
});

import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import { NB_TUILES, POSITIONS, coupsPossibles, gagne, libre, melangerRestantes, nouvelle, retirerPaire, type Etat as EtatM } from './logique';

interface Etat { jeu: EtatM; historique: Array<[number, number]>; sel: number | null; indice: [number, number] | null; secondes: number; fini: boolean }

const neuf = (): Etat => ({ jeu: nouvelle(), historique: [], sel: null, indice: null, secondes: 0, fini: false });

/** Caractère Unicode et famille (couleur) d'un type de tuile. */
function glyphe(t: number): { c: string; f: string } {
  if (t < 9) return { c: String.fromCodePoint(0x1f007 + t), f: 'car' };
  if (t < 18) return { c: String.fromCodePoint(0x1f010 + (t - 9)), f: 'bam' };
  if (t < 27) return { c: String.fromCodePoint(0x1f019 + (t - 18)), f: 'cer' };
  if (t < 31) return { c: String.fromCodePoint(0x1f000 + (t - 27)), f: 'vent' };
  if (t < 34) return { c: String.fromCodePoint(0x1f004 + (t - 31)), f: 'dragon' };
  if (t < 38) return { c: String.fromCodePoint(0x1f022 + (t - 34)), f: 'fleur' };
  return { c: String.fromCodePoint(0x1f026 + (t - 38)), f: 'saison' };
}

const L = 46; // largeur d'une tuile (px)
const H = 60;

function cliquer(h: Hote<Etat>, i: number): void {
  const e = h.etat;
  if (e.fini || !libre(e.jeu, i)) return;
  e.indice = null;
  if (e.sel === null) { e.sel = i; h.son('clic'); return h.render(); }
  if (e.sel === i) { e.sel = null; return h.render(); }
  const a = e.sel;
  if (retirerPaire(e.jeu, a, i)) {
    e.historique.push([a, i]);
    e.sel = null;
    h.son('pose');
    if (gagne(e.jeu)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.secondes }); }
    h.render();
    h.sauver();
  } else {
    h.son('erreur');
    e.sel = i;
    h.render();
  }
}

export const jeuMahjong = fabrique<Etat>({
  id: 'mahjong', nom: 'Mahjong solitaire', famille: 'Puzzles', icone: '🀄',
  description: 'Retirez les paires de tuiles identiques.',
  regles: '<p>Retirez toutes les tuiles du plateau en les associant <b>deux par deux</b> : deux tuiles identiques (les <b>fleurs</b> s\'associent entre elles, de même pour les <b>saisons</b>).</p><ul><li>Une tuile est <b>libre</b> si rien ne la recouvre <b>et</b> si elle a au moins un côté (gauche ou droite) dégagé. Les tuiles bloquées sont plus sombres.</li><li>Cliquez sur deux tuiles libres identiques pour les retirer.</li></ul><p>La donne est toujours <b>faisable</b>. Utilisez « Indice » en cas de blocage, « Mélanger » en dernier recours, et « Annuler » pour revenir en arrière.</p>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  neuf,
  valide: (x) => !!x && !!(x as Etat).jeu && Array.isArray((x as Etat).jeu.tuiles) && (x as Etat).jeu.tuiles.length === NB_TUILES,
  vue(h) {
    const e = h.etat;
    const j = e.jeu;
    const largeur = 12 * L + 40;
    const plateau = el('div', { class: 'mj-plateau', style: `width:${largeur}px;height:${7 * H + 30}px` });
    // les couches hautes sont dessinées après les basses
    const ordre = POSITIONS.map((p, i) => ({ p, i })).sort((a, b) => a.p.z - b.p.z);
    for (const { p, i } of ordre) {
      if (j.retirees[i]) continue;
      const g = glyphe(j.tuiles[i]!);
      const lib = libre(j, i);
      plateau.append(el('button', {
        class: `mj-tuile ${g.f}${lib ? '' : ' bloquee'}${e.sel === i ? ' choisie' : ''}${e.indice?.includes(i) ? ' indice' : ''}`,
        style: `left:${20 + p.x * L + p.z * 4}px;top:${10 + p.y * H - p.z * 5}px;z-index:${p.z * 10 + Math.round(p.y)}`,
        'aria-label': `Tuile ${j.tuiles[i]}${lib ? '' : ' bloquée'}`, onclick: () => cliquer(h, i),
      }, g.c));
    }
    const restantes = j.retirees.filter((r) => !r).length;
    const coups = e.fini ? [] : coupsPossibles(j);
    const bloque = !e.fini && coups.length === 0;
    h.ctx.conteneur.append(
      infos(['Tuiles', restantes], ['Paires possibles', coups.length], ['Temps', formaterTemps(e.secondes)]),
      message(e.fini ? `Bravo ! Plateau vidé en ${formaterTemps(e.secondes)}.` : bloque ? 'Plus de paire possible : annulez des coups ou mélangez.' : '', e.fini ? 'gagne' : bloque ? 'perdu' : ''),
      el('div', { class: 'defile-x' }, plateau),
      el('div', { class: 'rangee' },
        el('button', { class: 'btn', disabled: e.fini || !coups.length, onclick: () => { e.indice = coups[0]!; e.sel = null; h.render(); } }, '💡 Indice'),
        el('button', { class: 'btn', disabled: e.fini, onclick: () => { melangerRestantes(j); e.sel = null; e.indice = null; h.render(); h.sauver(); } }, '🔀 Mélanger')),
      astuce('Cliquez deux tuiles libres identiques'),
    );
  },
  demarre(h) {
    h.intervalle(() => {
      if (h.etat.fini) return;
      h.etat.secondes++;
      const t = h.ctx.conteneur.querySelectorAll('.infos .val')[2];
      if (t) t.textContent = formaterTemps(h.etat.secondes);
    }, 1000);
  },
  annuler(h) {
    const e = h.etat;
    const d = e.historique.pop();
    if (!d) return;
    e.jeu.retirees[d[0]] = e.jeu.retirees[d[1]] = false;
    e.sel = null;
    e.indice = null;
    e.fini = false;
    h.render();
    h.sauver();
  },
});

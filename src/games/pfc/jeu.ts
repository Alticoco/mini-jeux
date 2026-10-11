import { choisir } from '../../shared/alea';
import { astuce, fabrique, infos, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';

export type Coup = 'pierre' | 'feuille' | 'ciseaux';
export type Issue = 'gagne' | 'perdu' | 'nul';
interface Etat { victoires: number; defaites: number; nuls: number; dernier: { joueur: Coup; ordi: Coup; res: Issue } | null }

const ICONES: Record<Coup, string> = { pierre: '✊', feuille: '✋', ciseaux: '✌️' };
const BAT: Record<Coup, Coup> = { pierre: 'ciseaux', feuille: 'pierre', ciseaux: 'feuille' };

export function arbitrer(j: Coup, o: Coup): Issue {
  return j === o ? 'nul' : BAT[j] === o ? 'gagne' : 'perdu';
}

export const jeuPFC = fabrique<Etat>({
  id: 'pfc', nom: 'Pierre-feuille-ciseaux', famille: 'Hasard et mémoire', icone: '✊',
  description: 'Le duel classique contre l\'ordi.',
  regles: '<p>Choisissez <b>pierre</b>, <b>feuille</b> ou <b>ciseaux</b>. La pierre bat les ciseaux, les ciseaux battent la feuille, la feuille bat la pierre. Même choix : égalité.</p><p>Le score cumule les manches de la session en cours.</p>',
  neuf: () => ({ victoires: 0, defaites: 0, nuls: 0, dernier: null }),
  valide: (x) => !!x && typeof (x as Etat).victoires === 'number',
  sauvegardable: () => false,
  vue(h) {
    const e = h.etat;
    const jouer = (j: Coup) => {
      const o = choisir(['pierre', 'feuille', 'ciseaux'] as Coup[]);
      const res = arbitrer(j, o);
      e.dernier = { joueur: j, ordi: o, res };
      if (res === 'gagne') e.victoires++; else if (res === 'perdu') e.defaites++; else e.nuls++;
      if (res !== 'nul') h.fin({ victoire: res === 'gagne' });
      h.son(res === 'gagne' ? 'gagne' : res === 'perdu' ? 'perdu' : 'clic');
      h.render();
    };
    const d = e.dernier;
    h.ctx.conteneur.append(
      infos(['Victoires', e.victoires], ['Nuls', e.nuls], ['Défaites', e.defaites]),
      message(d ? (d.res === 'gagne' ? 'Gagné !' : d.res === 'perdu' ? 'Perdu…' : 'Égalité') : 'À vous de choisir !', d ? (d.res === 'gagne' ? 'gagne' : d.res === 'perdu' ? 'perdu' : '') : ''),
      el('div', { class: 'pfc-duel' }, el('div', { class: 'pfc-main' }, d ? ICONES[d.joueur] : '❔'), el('span', {}, 'contre'), el('div', { class: 'pfc-main' }, d ? ICONES[d.ordi] : '❔')),
      el('div', { class: 'rangee' }, ...(Object.keys(ICONES) as Coup[]).map((c) => el('button', { class: 'btn pfc-choix', onclick: () => jouer(c), 'aria-label': c }, `${ICONES[c]} ${c[0]!.toUpperCase() + c.slice(1)}`))),
      astuce('Vous à gauche, l\'ordinateur à droite'),
    );
  },
});

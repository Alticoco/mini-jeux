import { astuce, fabrique, infos, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';

interface Etat { pile: number; face: number; dernier: 'pile' | 'face' | null; serie: number }

export const jeuPileFace = fabrique<Etat>({
  id: 'pileface', nom: 'Pile ou face', famille: 'Hasard et mémoire', icone: '🪙',
  description: 'Lancez la pièce.',
  regles: '<p>Cliquez sur la pièce (ou sur le bouton) pour la lancer : <b>pile</b> ou <b>face</b>, une chance sur deux. Le compteur garde le total de la session et la série en cours.</p>',
  neuf: () => ({ pile: 0, face: 0, dernier: null, serie: 0 }),
  valide: (x) => !!x && typeof (x as Etat).pile === 'number',
  sauvegardable: () => false,
  vue(h) {
    const e = h.etat;
    const lancer = () => {
      const r = crypto.getRandomValues(new Uint8Array(1))[0]! % 2 === 0 ? 'pile' : 'face';
      e.serie = r === e.dernier ? e.serie + 1 : 1;
      e.dernier = r;
      if (r === 'pile') e.pile++; else e.face++;
      h.son('pose');
      h.render();
    };
    h.ctx.conteneur.append(
      infos(['Pile', e.pile], ['Face', e.face], ['Série', e.serie]),
      message(e.dernier ? (e.dernier === 'pile' ? 'Pile !' : 'Face !') : 'Lancez la pièce'),
      el('button', { class: `piece ${e.dernier ?? ''}`, onclick: lancer, 'aria-label': 'Lancer la pièce' }, e.dernier === 'face' ? '🙂' : e.dernier === 'pile' ? '€' : '?'),
      el('button', { class: 'btn primaire', onclick: lancer }, 'Lancer'),
      astuce('Chaque lancer est indépendant du précédent'),
    );
  },
});

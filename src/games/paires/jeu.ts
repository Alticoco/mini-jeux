import { entier, melanger } from '../../shared/alea';
import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { elCarte, nomCarte, type Carte } from '../../shared/cartes';
import { distribuer, retirerPaires, type Variante } from './logique';

interface Etat { variante: Variante; mains: [Carte[], Carte[]]; paires: number; tour: 0 | 1; texte: string; fini: boolean; gagne: boolean }

const neuf = (variante: Variante): Etat => {
  const d = distribuer(variante);
  return { variante, mains: d.mains, paires: d.paires, tour: 0, texte: 'À vous : piochez une carte dans la main de l\'ordinateur.', fini: false, gagne: false };
};

function verifierFin(h: Hote<Etat>): boolean {
  const e = h.etat;
  const vide = e.mains[0].length === 0 ? 0 : e.mains[1].length === 0 ? 1 : null;
  if (vide === null) return false;
  e.fini = true;
  e.gagne = vide === 0;
  const perdante = e.mains[vide === 0 ? 1 : 0][0];
  e.texte = e.gagne ? `Bravo ! L'ordinateur garde ${perdante ? nomCarte(perdante) : 'la dernière carte'}.` : `Perdu : vous gardez ${perdante ? nomCarte(perdante) : 'la dernière carte'}.`;
  h.son(e.gagne ? 'gagne' : 'perdu');
  h.fin({ victoire: e.gagne });
  h.render();
  return true;
}

function pioche(h: Hote<Etat>, de: 0 | 1, vers: 0 | 1, i: number): Carte {
  const e = h.etat;
  const [carte] = e.mains[de].splice(i, 1) as [Carte];
  e.mains[vers].push(carte);
  const r = retirerPaires(e.mains[vers], e.variante);
  e.mains[vers] = r.main;
  e.paires += r.paires;
  return carte;
}

export function creerPaires(variante: Variante, nom: string, icone: string, description: string, regles: string) {
  return fabrique<Etat>({
    id: variante, nom, famille: 'Cartes contre l\'ordi', icone, description, regles,
    neuf: () => neuf(variante),
    valide: (x) => !!x && Array.isArray((x as Etat).mains) && (x as Etat).variante === variante,
    sauvegardable: (e) => !e.fini && e.tour === 0,
    vue(h) {
      const e = h.etat;
      const monTour = e.tour === 0 && !e.fini;
      const ordi = el('div', { class: 'main-cartes' }, ...e.mains[1].map((_, i) => elCarte(null, {
        class: monTour ? 'jouable' : '', onclick: () => {
          if (!monTour) return;
          const c = pioche(h, 1, 0, i);
          e.texte = `Vous piochez ${nomCarte(c)}.`;
          h.son('pose');
          if (verifierFin(h)) return;
          e.tour = 1;
          e.mains[1] = melanger(e.mains[1]);
          h.render();
          h.delai(() => {
            const k = entier(e.mains[0].length);
            const prise = pioche(h, 0, 1, k);
            e.mains[1] = melanger(e.mains[1]);
            e.texte += ` L'ordinateur vous prend ${nomCarte(prise)}.`;
            h.son('clic');
            if (verifierFin(h)) return;
            e.tour = 0;
            h.render();
            h.sauver();
          }, 1000);
        },
      })));
    const moi = el('div', { class: 'main-cartes' }, ...e.mains[0].map((c) => elCarte(c)));
      h.ctx.conteneur.append(
        infos(['Vos cartes', e.mains[0].length], ['Ordinateur', e.mains[1].length], ['Paires posées', e.paires]),
        message(e.texte, e.fini ? (e.gagne ? 'gagne' : 'perdu') : ''),
        el('div', { class: 'tapis centre-table' }, el('h2', { class: 'blanc' }, 'Ordinateur (cliquez une carte à lui prendre)'), ordi),
        el('div', { class: 'tapis centre-table' }, el('h2', { class: 'blanc' }, 'Votre main'), moi),
        astuce('Les paires sont posées automatiquement'),
      );
    },
  });
}

export const jeuMistigri = creerPaires('mistigri', 'Mistigri', '🐱', 'Ne gardez pas le Valet de pique !',
  '<p>Les cartes sont distribuées et chacun pose ses <b>paires</b> (même valeur et même couleur : deux rouges ou deux noires). Le <b>Valet de trèfle</b> a été retiré : le <b>Valet de pique</b> n\'a donc pas de partenaire — c\'est le <b>Mistigri</b>.</p><p>À tour de rôle, vous piochez <b>une carte au hasard dans la main de l\'adversaire</b> ; si elle forme une paire avec une de vos cartes, la paire est posée. Le premier qui n\'a plus de cartes gagne ; l\'autre reste avec le Mistigri.</p>');

export const jeuPouilleux = creerPaires('pouilleux', 'Pouilleux', '🃏', 'Ne restez pas avec le Joker !',
  '<p>Un <b>Joker</b> est ajouté au paquet. Chacun pose ses <b>paires</b> (deux cartes de même valeur).</p><p>À tour de rôle, vous piochez <b>une carte au hasard dans la main de l\'adversaire</b> ; si elle forme une paire avec une de vos cartes, la paire est posée. Le premier qui n\'a plus de cartes gagne ; l\'autre reste avec le Joker : c\'est le <b>pouilleux</b> !</p>');

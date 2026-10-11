import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { elCarte, nomRang } from '../../shared/cartes';
import { choisirJeu, nouvelle, poser, repondre, veutContester, type Etat as EtatMenteur } from './logique';

interface Etat extends EtatMenteur { sel: number[]; texte: string; fini: boolean }

const neuf = (): Etat => ({ ...nouvelle(), sel: [], texte: 'À vous : posez des cartes face cachée en annonçant le rang demandé.', fini: false });
const nom = (r: number) => (r === 1 ? 'as' : r === 11 ? 'valet' : r === 12 ? 'dame' : r === 13 ? 'roi' : String(r));
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

function conclure(h: Hote<Etat>, resume: string): void {
  const e = h.etat;
  if (e.gagnant !== null) {
    e.fini = true;
    const gagne = e.gagnant === 0;
    e.texte = `${resume} ${gagne ? 'Vous n\'avez plus de cartes : victoire !' : 'L\'ordinateur n\'a plus de cartes : défaite.'}`;
    h.son(gagne ? 'gagne' : 'perdu');
    h.fin({ victoire: gagne });
    h.render();
    return;
  }
  e.texte = resume;
  h.render();
  h.sauver();
  if (e.tour === 1) h.delai(() => ordiJoue(h), 1200);
}

function ordiJoue(h: Hote<Etat>): void {
  const e = h.etat;
  if (e.fini || e.tour !== 1 || e.annonce) return;
  const rang = e.rang;
  poser(e, 1, choisirJeu(e, 1));
  e.texte = `L'ordinateur pose ${pluriel(e.annonce!.cartes.length, 'carte')} et annonce : ${pluriel(e.annonce!.cartes.length, nom(rang))}.`;
  h.son('pose');
  h.render();
}

export const jeuMenteur = fabrique<Etat>({
  id: 'menteur', nom: 'Menteur', famille: 'Cartes contre l\'ordi', icone: '🤥',
  description: 'Bluffez ou démasquez l\'ordinateur.',
  regles: '<p>Le paquet est partagé entre vous et l\'ordinateur. À chaque tour, un <b>rang est imposé</b> (as, 2, 3… roi, puis on recommence). Le joueur dont c\'est le tour pose <b>1 à 4 cartes face cachée</b> en annonçant qu\'elles sont de ce rang — il peut <b>mentir</b> !</p><ul><li>L\'adversaire peut dire <b>« Menteur ! »</b> : les cartes sont révélées. Si c\'était un mensonge, le menteur ramasse tout le tas ; sinon c\'est l\'accusateur qui le ramasse.</li><li>Sans contestation, les cartes rejoignent le tas.</li></ul><p>Le premier qui se débarrasse de toutes ses cartes gagne. Sélectionnez vos cartes (clic), puis « Poser ».</p>',
  neuf,
  valide: (x) => !!x && Array.isArray((x as Etat).mains) && Array.isArray((x as Etat).tas),
  sauvegardable: (e) => !e.fini,
  demarre(h) {
    const e = h.etat;
    if (!e.fini && e.tour === 1 && !e.annonce) h.delai(() => ordiJoue(h), 800);
  },
  vue(h) {
    const e = h.etat;
    const monTour = e.tour === 0 && !e.annonce && !e.fini;
    const repond = !!e.annonce && e.annonce.par === 1 && !e.fini;
    const main = el('div', { class: 'main-cartes' }, ...e.mains[0].map((c, i) =>
      elCarte(c, { class: e.sel.includes(i) ? 'choisie' : '', onclick: () => {
        if (!monTour) return;
        e.sel = e.sel.includes(i) ? e.sel.filter((k) => k !== i) : e.sel.length < 4 ? [...e.sel, i] : e.sel;
        h.son('clic');
        h.render();
      } })));
    const poserBtn = el('button', { class: 'btn primaire', disabled: !monTour || e.sel.length === 0, onclick: () => {
      const rang = e.rang;
      const n = e.sel.length;
      poser(e, 0, e.sel);
      e.sel = [];
      e.texte = `Vous posez ${pluriel(n, 'carte')} en annonçant : ${pluriel(n, nom(rang))}.`;
      h.son('pose');
      h.render();
      h.delai(() => {
        const conteste = veutContester(e, 1);
        const r = repondre(e, conteste);
        const base = `Vous annonciez ${pluriel(n, nom(rang))} : `;
        if (conteste) conclure(h, `${base}« Menteur ! » dit l'ordinateur. ${r.honnete ? `C'était vrai ! L'ordinateur ramasse le tas.` : `Vous mentiez ! Vous ramassez le tas.`}`);
        else conclure(h, `${base}l'ordinateur vous croit.`);
      }, 1100);
    } }, `Poser ${e.sel.length || ''} carte${e.sel.length > 1 ? 's' : ''} (annonce : ${nomRang(e.rang)})`);
    const decider = (conteste: boolean) => {
      const a = e.annonce!;
      const vu = a.cartes.map((c) => nomRang(c.rang)).join(' ');
      const r = repondre(e, conteste);
      if (conteste) conclure(h, `Les cartes étaient : ${vu}. ${r.honnete ? 'Il disait vrai : vous ramassez le tas !' : 'Il mentait : il ramasse le tas !'}`);
      else conclure(h, 'Vous le croyez, les cartes vont au tas.');
    };
    h.ctx.conteneur.append(
      infos(['Rang demandé', nomRang(e.rang)], ['Tas', e.tas.length + (e.annonce?.cartes.length ?? 0)], ['Cartes de l\'ordinateur', e.mains[1].length]),
      message(e.texte, e.fini ? (e.gagnant === 0 ? 'gagne' : 'perdu') : ''),
      el('div', { class: 'tapis centre-table' }, el('div', { class: 'rangee' },
        ...(e.annonce ? e.annonce.cartes.map(() => elCarte(null)) : [el('div', { class: 'emplacement' })]),
        el('span', { class: 'gros' }, e.annonce ? `annonce : ${pluriel(e.annonce.cartes.length, nom(e.annonce.rang))}` : ''))),
      ...(repond ? [el('div', { class: 'rangee' }, el('button', { class: 'btn danger', onclick: () => decider(true) }, '🤥 Menteur !'), el('button', { class: 'btn primaire', onclick: () => decider(false) }, '👍 Je le crois'))] : []),
      el('div', { class: 'rangee' }, poserBtn),
      main,
      astuce('Sélectionnez 1 à 4 cartes, puis posez-les : vous pouvez mentir !'),
    );
  },
});

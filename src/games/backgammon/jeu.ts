import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import type { Difficulte } from '../../core/types';
import { appliquer, choisirSequence, coupsAutorises, depart, fini, lancerDes, pips, type Coup, type Etat as EtatBg } from './logique';

interface Etat { jeu: EtatBg; niveau: Difficulte; phase: 'lancer' | 'jouer' | 'ordi' | 'fini'; sel: number | 'barre' | null; desLances: number[]; texte: string; gagne: boolean }

const neufAvec = (niveau: Difficulte): Etat => ({ jeu: depart(), niveau, phase: 'lancer', sel: null, desLances: [], texte: 'À vous : lancez les dés.', gagne: false });
const FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function verifierFin(h: Hote<Etat>): boolean {
  const e = h.etat;
  const f = fini(e.jeu);
  if (f === null) return false;
  e.phase = 'fini';
  e.gagne = f === 0;
  e.texte = e.gagne ? 'Victoire ! Tous vos pions sont sortis.' : 'Défaite : l\'ordinateur a sorti tous ses pions.';
  h.son(e.gagne ? 'gagne' : 'perdu');
  h.fin({ victoire: e.gagne });
  h.render();
  return true;
}

function tourOrdi(h: Hote<Etat>): void {
  const e = h.etat;
  e.phase = 'ordi';
  e.jeu.tour = 1;
  e.jeu.des = lancerDes();
  e.desLances = [...e.jeu.des];
  e.texte = `L'ordinateur a lancé ${e.desLances.join(' et ')}.`;
  h.son('pose');
  h.render();
  const coups: Coup[] = choisirSequence(e.jeu, e.niveau);
  if (!coups.length) {
    e.texte += ' Il ne peut pas jouer.';
    h.delai(() => { e.phase = 'lancer'; e.jeu.tour = 0; e.jeu.des = []; e.texte = 'À vous : lancez les dés.'; h.render(); h.sauver(); }, 1200);
    return;
  }
  coups.forEach((coup, k) => h.delai(() => {
    e.jeu = appliquer(e.jeu, 1, coup);
    h.son('clic');
    if (verifierFin(h)) return;
    h.render();
    if (k === coups.length - 1) h.delai(() => { e.phase = 'lancer'; e.jeu.tour = 0; e.jeu.des = []; e.desLances = []; e.texte = 'À vous : lancez les dés.'; h.render(); h.sauver(); }, 500);
  }, 700 + k * 600));
}

function apresCoupJoueur(h: Hote<Etat>): void {
  const e = h.etat;
  e.sel = null;
  if (verifierFin(h)) return;
  if (!e.jeu.des.length || !coupsAutorises(e.jeu, 0).length) {
    e.texte = 'L\'ordinateur joue…';
    h.render();
    h.delai(() => tourOrdi(h), 600);
    return;
  }
  e.texte = 'Continuez : cliquez un pion à jouer.';
  h.render();
}

export const jeuBackgammon = fabrique<Etat>({
  id: 'backgammon', nom: 'Backgammon', famille: 'Contre l\'ordi', icone: '🎲',
  description: 'Le grand classique des jeux de dés et de pions.',
  regles: '<p>Vos 15 pions <b>blancs</b> partent en haut à droite et doivent rejoindre votre maison (<b>en bas à droite</b>) puis <b>sortir</b> du plateau. Le premier à sortir tous ses pions gagne.</p><ul><li>Lancez les <b>deux dés</b> : chaque dé est un déplacement (un double se joue 4 fois). Les pions avancent dans le sens inverse des aiguilles d\'une montre.</li><li>On ne peut pas aller sur un point occupé par <b>2 pions adverses ou plus</b>. Sur un point avec <b>un seul pion</b> adverse, on le <b>capture</b> : il va sur la barre et doit rentrer avant tout autre coup.</li><li>On doit jouer le <b>maximum de dés possible</b>.</li><li>On ne peut sortir des pions que lorsque <b>tous</b> sont dans la maison.</li></ul><p>Cliquez un pion (ou la barre) puis sa destination (ou « Sortir »). Pas de videau ni de gammon dans cette version.</p>',
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && !!(x as Etat).jeu && Array.isArray((x as Etat).jeu.points),
  sauvegardable: (e) => e.phase === 'lancer' || (e.phase === 'jouer'),
  demarre(h) {
    if (h.etat.phase === 'ordi') tourOrdi(h);
  },
  vue(h) {
    const e = h.etat;
    const j = e.jeu;
    const autorises = e.phase === 'jouer' ? coupsAutorises(j, 0) : [];
    const sources = new Set(autorises.map((c) => c.de));
    const cibles = e.sel === null ? [] : autorises.filter((c) => c.de === e.sel);
    const ciblesPts = new Set(cibles.map((c) => c.vers));
    const jouer = (vers: number | 'hors') => {
      const coup = cibles.find((c) => c.vers === vers);
      if (!coup) return;
      e.jeu = appliquer(e.jeu, 0, coup);
      h.son('pose');
      apresCoupJoueur(h);
      h.sauver();
    };
    const pion = (n: number, camp: 'b' | 'n') => el('span', { class: `bg-pion ${camp}` }, n > 5 ? String(n) : '');
    const point = (i: number, haut: boolean) => {
      const n = Math.abs(j.points[i]!);
      const camp = j.points[i]! > 0 ? 'b' : 'n';
      const pions = Array.from({ length: Math.min(n, 5) }, (_, k) => pion(k === Math.min(n, 5) - 1 ? n : 0, camp));
      return el('button', {
        class: `bg-point ${haut ? 'haut' : 'bas'} ${i % 2 ? 'clair' : 'fonce'}${e.sel === i ? ' choisi' : ''}${ciblesPts.has(i) ? ' cible' : ''}${sources.has(i) && e.sel === null ? ' jouable' : ''}`,
        disabled: !(sources.has(i) || ciblesPts.has(i)), 'aria-label': `Point ${i + 1}, ${n} pion${n > 1 ? 's' : ''}`,
        onclick: () => {
          if (ciblesPts.has(i)) return jouer(i);
          if (sources.has(i)) { e.sel = e.sel === i ? null : i; h.render(); }
        },
      }, ...(haut ? pions : [...pions].reverse()));
    };
    const haut = el('div', { class: 'bg-rang' }, ...Array.from({ length: 6 }, (_, k) => point(12 + k, true)), el('div', { class: 'bg-barre-sep' }), ...Array.from({ length: 6 }, (_, k) => point(18 + k, true)));
    const bas = el('div', { class: 'bg-rang' }, ...Array.from({ length: 6 }, (_, k) => point(11 - k, false)), el('div', { class: 'bg-barre-sep' }), ...Array.from({ length: 6 }, (_, k) => point(5 - k, false)));
    const barre = el('div', { class: 'rangee' },
      el('button', { class: `btn${sources.has('barre') ? ' primaire' : ''}${e.sel === 'barre' ? ' actif' : ''}`, disabled: !sources.has('barre'), onclick: () => { e.sel = e.sel === 'barre' ? null : 'barre'; h.render(); } }, `Barre : ${j.barre[0]} (vous) · ${j.barre[1]} (ordi)`),
      el('button', { class: `btn${ciblesPts.has('hors') ? ' primaire' : ''}`, disabled: !ciblesPts.has('hors'), onclick: () => jouer('hors') }, `Sortir (sortis : ${j.hors[0]} / ${j.hors[1]})`));
    const des = el('div', { class: 'des' }, ...e.desLances.map((d) => el('span', { class: `de-mini${j.des.includes(d) ? '' : ' utilise'}`, role: 'img', 'aria-label': `dé ${d}` }, FACES[d]!)));
    h.ctx.conteneur.append(
      choix('Niveau :', (['facile', 'moyen', 'difficile'] as Difficulte[]).map((k) => [k, k[0]!.toUpperCase() + k.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Vos points à parcourir', pips(j, 0)], ['Ordinateur', pips(j, 1)]),
      message(e.texte, e.phase === 'fini' ? (e.gagne ? 'gagne' : 'perdu') : ''),
      el('div', { class: 'bg-plateau' }, haut, el('div', { class: 'bg-milieu' }, des), bas),
      barre,
      el('div', { class: 'rangee' }, el('button', { class: 'btn primaire', disabled: e.phase !== 'lancer', onclick: () => {
        j.des = lancerDes();
        j.tour = 0;
        e.desLances = [...j.des];
        h.son('pose');
        if (!coupsAutorises(j, 0).length) {
          e.texte = `Dés : ${e.desLances.join(' et ')}. Aucun coup possible, vous passez.`;
          e.phase = 'ordi';
          h.render();
          h.delai(() => tourOrdi(h), 1300);
          return;
        }
        e.phase = 'jouer';
        e.texte = `Vous avez lancé ${e.desLances.join(' et ')}. Cliquez un pion à déplacer.`;
        h.render();
      } }, '🎲 Lancer les dés')),
      astuce('Cliquez un pion (ou la barre), puis la destination éclairée'),
    );
  },
});

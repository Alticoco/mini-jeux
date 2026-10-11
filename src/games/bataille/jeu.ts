import type { ContexteJeu, Jeu } from '../../core/types';
import { el, vider } from '../../shared/dom';
import { elCarte } from '../../shared/cartes';
import { fini, jouerManche, nouvelle, vainqueur, type EtatBataille, type ResultatManche } from './logique';

let ctx: ContexteJeu | null = null;
let etat: EtatBataille | null = null;
let attente: EtatBataille | null = null;
let dernier: ResultatManche | null = null;
let auto: number | undefined;
let termineEnregistre = false;

function arreterAuto(): void {
  window.clearInterval(auto);
  auto = undefined;
}

function manche(): void {
  if (!etat || !ctx) return;
  dernier = jouerManche(etat) ?? dernier;
  ctx.jouerSon('pose');
  if (fini(etat) && !termineEnregistre) {
    termineEnregistre = true;
    arreterAuto();
    const v = vainqueur(etat) === 'joueur';
    ctx.jouerSon(v ? 'gagne' : 'perdu');
    ctx.terminer(v ? { victoire: true, score: etat.manches } : { victoire: false });
  }
  dessiner();
  ctx.sauvegardeAuto();
}

function basculerAuto(): void {
  if (auto !== undefined) arreterAuto();
  else auto = window.setInterval(() => (etat && !fini(etat) ? manche() : arreterAuto()), 450);
  dessiner();
}

function dessiner(): void {
  if (!etat || !ctx) return;
  const e = etat;
  const f = fini(e);
  const pile = (n: number) => el('div', { class: 'bataille-pile' }, n > 0 ? elCarte(null) : el('div', { class: 'emplacement' }), el('div', { class: 'infos' }, `${n} carte${n > 1 ? 's' : ''}`));
  const table = el('div', { class: 'bataille-table tapis' },
    el('div', { class: 'bataille-camp' }, el('h2', {}, 'Ordinateur'), pile(e.ordi.length), dernier?.carteOrdi ? elCarte(dernier.carteOrdi) : el('div', { class: 'emplacement' })),
    el('div', { class: 'bataille-camp' }, el('h2', {}, 'Vous'), pile(e.joueur.length), dernier?.carteJoueur ? elCarte(dernier.carteJoueur) : el('div', { class: 'emplacement' })),
  );
  let msg = 'Cliquez sur « Jouer une manche ».';
  if (f) {
    msg = vainqueur(e) === 'joueur' ? `Victoire en ${e.manches} manches !` : `Défaite après ${e.manches} manches.`;
    if (e.manches >= 2000) msg += ' (limite de manches atteinte : décompte des cartes)';
  } else if (dernier) {
    msg = `${dernier.batailles ? `Bataille${dernier.batailles > 1 ? ` ×${dernier.batailles}` : ''} ! ` : ''}${dernier.gagnant === 'joueur' ? 'Vous remportez' : "L'ordinateur remporte"} ${dernier.gain} cartes.`;
  }
  vider(ctx.conteneur);
  ctx.conteneur.append(
    el('div', { class: 'infos' }, el('span', {}, 'Manches : ', el('span', { class: 'val' }, String(e.manches)))),
    el('div', { class: `message${f ? (vainqueur(e) === 'joueur' ? ' gagne' : ' perdu') : ''}`, role: 'status' }, msg),
    table,
    el('div', { class: 'rangee' },
      el('button', { class: 'btn primaire', disabled: f, onclick: manche }, 'Jouer une manche'),
      el('button', { class: `btn${auto !== undefined ? ' actif' : ''}`, disabled: f, 'aria-pressed': auto !== undefined, onclick: basculerAuto }, auto !== undefined ? '⏸ Arrêter le jeu auto' : '▶ Jeu automatique'),
    ),
  );
}

export const jeuBataille: Jeu = {
  id: 'bataille',
  nom: 'Bataille',
  famille: 'Cartes contre l\'ordi',
  icone: '⚔️',
  description: 'Le classique : la plus forte carte gagne.',
  regles: '<p>Le paquet de 52 cartes est partagé : <b>26 cartes</b> chacun. À chaque manche, chacun retourne la carte du dessus ; la plus forte l\'emporte (l\'<b>as</b> est la plus forte) et le vainqueur ramasse les deux cartes.</p><p>En cas d\'<b>égalité</b>, c\'est la <b>bataille</b> : chacun pose une carte face cachée puis retourne une nouvelle carte ; le vainqueur ramasse tout. Celui qui n\'a plus de cartes a perdu. Votre score est le nombre de manches pour gagner.</p>',
  score: { libelle: 'moins de manches', sens: 'bas', suffixe: ' manches' },
  demarrer(c) {
    ctx = c;
    etat = attente ?? nouvelle();
    attente = null;
    dernier = null;
    termineEnregistre = fini(etat);
    dessiner();
  },
  arreter() {
    arreterAuto();
    ctx = null;
    etat = null;
    attente = null;
    dernier = null;
  },
  sauvegarder() {
    return etat && !fini(etat) && etat.manches > 0 ? etat : null;
  },
  charger(s) {
    const e = s as EtatBataille;
    if (!Array.isArray(e.joueur) || !Array.isArray(e.ordi) || e.joueur.length + e.ordi.length !== 52) throw new Error('sauvegarde invalide');
    attente = e;
  },
  nouvellePartie() {
    if (!ctx) return;
    arreterAuto();
    etat = nouvelle();
    dernier = null;
    termineEnregistre = false;
    dessiner();
  },
};

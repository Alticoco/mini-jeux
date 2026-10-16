import { astuce, choix, fabrique, infos, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import type { Difficulte } from '../../core/types';
import { REGLAGES, codeSecret, evaluer, type Reglage } from './logique';

interface Etat { niveau: Difficulte; secret: number[]; essais: number[][]; retours: Array<{ noirs: number; blancs: number }>; courant: number[]; fini: boolean; gagne: boolean }

const PALETTE = ['#e0443c', '#f2c230', '#3fae5a', '#3b82e0', '#8b5cd6', '#f08a2b', '#2fc4c4', '#e8749f'];
const NOMS = ['rouge', 'jaune', 'vert', 'bleu', 'violet', 'orange', 'turquoise', 'rose'];
const neufAvec = (niveau: Difficulte): Etat => ({ niveau, secret: codeSecret(REGLAGES[niveau]), essais: [], retours: [], courant: [], fini: false, gagne: false });

export const jeuMastermind = fabrique<Etat>({
  id: 'mastermind', nom: 'Mastermind', famille: 'Contre l\'ordi', icone: '🎯',
  description: 'Devinez le code secret de l\'ordinateur.',
  regles: '<p>L\'ordinateur a caché un <b>code de couleurs</b>. Proposez une combinaison : après chaque essai, des pions de retour vous renseignent.</p><ul><li><b>Pion noir ●</b> : une couleur est <b>bien placée</b>.</li><li><b>Pion blanc ○</b> : une couleur est dans le code mais <b>mal placée</b>.</li></ul><p>Trouvez le code avant d\'épuiser vos essais. Facile : pas de couleur en double ; Moyen : doublons possibles ; Difficile : 5 pions et 8 couleurs.</p>',
  score: { libelle: 'moins d\'essais', sens: 'bas', suffixe: ' essais' },
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && Array.isArray((x as Etat).secret) && Array.isArray((x as Etat).essais),
  vue(h) {
    const e = h.etat;
    const r: Reglage = REGLAGES[e.niveau];
    const pion = (c: number | undefined, onclick?: () => void) => el('button', { class: `mm-pion${c === undefined ? ' vide' : ''}`, style: c === undefined ? '' : `background:${PALETTE[c]}`, 'aria-label': c === undefined ? 'case vide' : NOMS[c], onclick, disabled: !onclick || undefined });
    const retour = (ret: { noirs: number; blancs: number }) => el('div', { class: 'mm-retour', 'aria-label': `${ret.noirs} bien placés, ${ret.blancs} mal placés` },
      ...Array.from({ length: r.positions }, (_, k) => el('span', { class: `mm-peg${k < ret.noirs ? ' noir' : k < ret.noirs + ret.blancs ? ' blanc' : ''}` })));
    const lignes = el('div', { class: 'mm-plateau' });
    for (let k = 0; k < r.essais; k++) {
      const fait = e.essais[k];
      const enCours = k === e.essais.length && !e.fini;
      lignes.append(el('div', { class: `mm-ligne${enCours ? ' courante' : ''}` },
        el('span', { class: 'mm-num' }, String(k + 1)),
        ...Array.from({ length: r.positions }, (_, i) => pion(fait ? fait[i] : enCours ? e.courant[i] : undefined, enCours && e.courant[i] !== undefined ? () => { e.courant.splice(i, 1); h.render(); } : undefined)),
        fait ? retour(e.retours[k]!) : el('span', {})));
    }
    const choixCouleurs = el('div', { class: 'rangee' }, ...Array.from({ length: r.couleurs }, (_, c) => el('button', {
      class: 'mm-pion', style: `background:${PALETTE[c]}`, 'aria-label': NOMS[c], disabled: e.fini || e.courant.length >= r.positions || (!r.doublons && e.courant.includes(c)),
      onclick: () => { e.courant.push(c); h.son('clic'); h.render(); },
    })));
    const valider = () => {
      if (e.courant.length < r.positions) return;
      const ret = evaluer(e.secret, e.courant);
      e.essais.push([...e.courant]);
      e.retours.push(ret);
      e.courant = [];
      h.son('pose');
      if (ret.noirs === r.positions) { e.fini = e.gagne = true; h.son('gagne'); h.fin({ victoire: true, score: e.essais.length }); }
      else if (e.essais.length >= r.essais) { e.fini = true; h.son('perdu'); h.fin({ victoire: false }); }
      h.render();
      h.sauver();
    };
    h.ctx.conteneur.append(
      choix('Niveau :', (Object.keys(REGLAGES) as Difficulte[]).map((k) => [k, k[0]!.toUpperCase() + k.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Essai', `${Math.min(e.essais.length + (e.fini ? 0 : 1), r.essais)} / ${r.essais}`]),
      message(e.fini ? (e.gagne ? `Bravo ! Code trouvé en ${e.essais.length} essais.` : 'Perdu ! Le code était :') : '', e.fini ? (e.gagne ? 'gagne' : 'perdu') : ''),
      ...(e.fini && !e.gagne ? [el('div', { class: 'rangee' }, ...e.secret.map((c) => pion(c)))] : []),
      lignes, choixCouleurs,
      el('div', { class: 'rangee' },
        el('button', { class: 'btn primaire', disabled: e.fini || e.courant.length < r.positions, onclick: valider }, 'Valider la combinaison'),
        el('button', { class: 'btn', disabled: e.fini || !e.courant.length, onclick: () => { e.courant.pop(); h.render(); } }, '⌫ Retirer')),
      astuce('Cliquez les couleurs pour composer votre essai ; cliquez un pion pour le retirer'),
    );
  },
});

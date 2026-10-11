import dictionnaire from '../../../assets/dictionnaire-fr.json';
import { choisir } from '../../shared/alea';
import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { normaliser } from '../pendu/logique';
import { etatsLettres, evaluer } from './logique';

interface Etat { mot: string; essais: string[]; courant: string; fini: boolean; gagne: boolean; erreur: string }

const ESSAIS = 6;
const LONGUEURS = { facile: 5, moyen: 6, difficile: 7 } as const;
const neufAvec = (longueur: number): Etat => {
  const mot = choisir((dictionnaire as string[]).filter((m) => m.length === longueur && normaliser(m).length === longueur));
  return { mot, essais: [], courant: normaliser(mot)[0]!.toUpperCase(), fini: false, gagne: false, erreur: '' };
};
const AZERTY = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];

function saisir(h: Hote<Etat>, touche: string): void {
  const e = h.etat;
  if (e.fini) return;
  const L = [...e.mot].length;
  e.erreur = '';
  if (touche === 'ENTREE') {
    if ([...e.courant].length !== L) { e.erreur = 'Mot incomplet.'; h.son('erreur'); h.render(); return; }
    e.essais.push(e.courant);
    const gagne = normaliser(e.courant) === normaliser(e.mot);
    h.son('pose');
    if (gagne || e.essais.length >= ESSAIS) {
      e.fini = true;
      e.gagne = gagne;
      h.son(gagne ? 'gagne' : 'perdu');
      h.fin({ victoire: gagne, score: e.essais.length });
    } else e.courant = normaliser(e.mot)[0]!.toUpperCase();
  } else if (touche === 'EFFACER') {
    if ([...e.courant].length > 1) e.courant = e.courant.slice(0, -1);
  } else if (/^[A-Z]$/.test(touche) && [...e.courant].length < L) e.courant += touche;
  h.render();
  h.sauver();
}

export const jeuMotus = fabrique<Etat>({
  id: 'motus', nom: 'Motus', famille: 'Mots', icone: '🟩',
  description: 'Devinez le mot en 6 essais.',
  regles: `<p>Trouvez le mot caché en <b>${ESSAIS} essais</b>. La <b>première lettre</b> est donnée. Après chaque proposition :</p><ul><li><b style="color:#2e9e5b">Vert</b> : lettre bien placée.</li><li><b style="color:#d6a010">Jaune</b> : lettre présente dans le mot, mais mal placée.</li><li><b>Gris</b> : lettre absente du mot.</li></ul><p>Tapez les lettres au clavier (sans accents), <b>Entrée</b> valide, <b>Retour arrière</b> efface. Le niveau règle la longueur du mot (5, 6 ou 7 lettres). Les mots proposés ne sont pas vérifiés dans un dictionnaire.</p>`,
  score: { libelle: 'moins d\'essais', sens: 'bas', suffixe: ' essais' },
  neuf: (o) => neufAvec(LONGUEURS[o.difficulte]),
  valide: (x) => !!x && typeof (x as Etat).mot === 'string' && Array.isArray((x as Etat).essais),
  demarre(h) {
    h.clavier((ev) => {
      if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
      if (ev.key === 'Enter') saisir(h, 'ENTREE');
      else if (ev.key === 'Backspace') saisir(h, 'EFFACER');
      else if (ev.key.length === 1) {
        const l = normaliser(ev.key).toUpperCase();
        if (/^[A-Z]$/.test(l)) saisir(h, l);
      }
    });
  },
  vue(h) {
    const e = h.etat;
    const L = [...e.mot].length;
    const grille = el('div', { class: 'motus-grille' });
    for (let r = 0; r < ESSAIS; r++) {
      const ligne = el('div', { class: 'motus-ligne', style: `grid-template-columns: repeat(${L}, 1fr)` });
      const essai = e.essais[r];
      const ev = essai ? evaluer(essai, e.mot) : null;
      const saisie = r === e.essais.length && !e.fini ? e.courant : '';
      for (let k = 0; k < L; k++) {
        const lettre = essai ? essai[k]! : saisie[k] ?? '';
        ligne.append(el('div', { class: `motus-case${ev ? ` ${ev[k]}` : ''}` }, lettre));
      }
      grille.append(ligne);
    }
    const etats = etatsLettres(e.essais, e.mot);
    const clavier = el('div', { class: 'motus-clavier' }, ...AZERTY.map((rangee, i) => el('div', { class: 'rangee' },
      ...(i === 2 ? [el('button', { class: 'btn', onclick: () => saisir(h, 'ENTREE') }, '⏎')] : []),
      ...[...rangee].map((l) => el('button', { class: `btn touche ${etats.get(l.toLowerCase()) ?? ''}`, onclick: () => saisir(h, l) }, l)),
      ...(i === 2 ? [el('button', { class: 'btn', onclick: () => saisir(h, 'EFFACER'), 'aria-label': 'Effacer' }, '⌫')] : []))));
    h.ctx.conteneur.append(
      choix('Longueur :', [[5, '5 lettres'], [6, '6 lettres'], [7, '7 lettres']] as Array<[number, string]>, L, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Essai', `${Math.min(e.essais.length + (e.fini ? 0 : 1), ESSAIS)} / ${ESSAIS}`]),
      message(e.fini ? (e.gagne ? `Bravo ! Trouvé en ${e.essais.length} essai${e.essais.length > 1 ? 's' : ''}.` : `Perdu ! Le mot était « ${e.mot} ».`) : e.erreur, e.fini ? (e.gagne ? 'gagne' : 'perdu') : ''),
      grille, clavier, astuce('Clavier physique ou boutons ci-dessus'),
    );
  },
});

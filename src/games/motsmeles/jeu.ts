import dictionnaire from '../../../assets/dictionnaire-fr.json';
import { astuce, choix, fabrique, infos, message } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import { CONFIGS, genererGrille, segment, trouverMot, type MotPlace } from './logique';

type Niveau = keyof typeof CONFIGS;
interface Etat { niveau: Niveau; n: number; grille: string[]; mots: MotPlace[]; debut: number | null; secondes: number; fini: boolean }

const neufAvec = (niveau: Niveau): Etat => {
  const cfg = CONFIGS[niveau];
  const { grille, mots } = genererGrille(dictionnaire as string[], cfg);
  return { niveau, n: cfg.n, grille, mots, debut: null, secondes: 0, fini: false };
};

export const jeuMotsMeles = fabrique<Etat>({
  id: 'motsmeles', nom: 'Mots mêlés', famille: 'Mots', icone: '🔤',
  description: 'Retrouvez les mots cachés dans la grille.',
  regles: '<p>Des mots sont cachés dans la grille de lettres. Retrouvez-les tous : <b>cliquez sur la première lettre</b> d\'un mot, puis sur sa <b>dernière lettre</b>.</p><p>Les mots peuvent aller vers la droite, le bas et, selon le niveau, en diagonale ou à l\'envers. La liste des mots à trouver est affichée ; ceux déjà trouvés sont barrés.</p>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && Array.isArray((x as Etat).grille) && Array.isArray((x as Etat).mots),
  vue(h) {
    const e = h.etat;
    const trouvees = new Set(e.mots.filter((m) => m.trouve).flatMap((m) => m.cases));
    const clic = (i: number) => {
      if (e.fini) return;
      if (e.debut === null) { e.debut = i; h.son('clic'); h.render(); return; }
      const seg = e.debut === i ? null : segment(e.n, e.debut, i);
      e.debut = null;
      const m = seg && trouverMot(e.mots, seg);
      if (m) {
        m.trouve = true;
        h.son('pose');
        if (e.mots.every((k) => k.trouve)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true, score: e.secondes }); }
      } else h.son('erreur');
      h.render();
      h.sauver();
    };
    const grille = el('div', { class: 'plateau mm-grille', style: `grid-template-columns: repeat(${e.n}, 1fr); width: min(${e.n * 40}px, 94vw)` },
      ...e.grille.map((l, i) => el('button', { class: `case mm-case${trouvees.has(i) ? ' trouvee' : ''}${e.debut === i ? ' debut' : ''}`, onclick: () => clic(i), 'aria-label': `Lettre ${l}` }, l)));
    const liste = el('ul', { class: 'mm-liste' }, ...e.mots.map((m) => el('li', { class: m.trouve ? 'barre' : '' }, m.mot)));
    h.ctx.conteneur.append(
      choix('Niveau :', (Object.keys(CONFIGS) as Niveau[]).map((k) => [k, k[0]!.toUpperCase() + k.slice(1)] as [Niveau, string]), e.niveau, (k) => h.recommencer(() => neufAvec(k))),
      infos(['Trouvés', `${e.mots.filter((m) => m.trouve).length} / ${e.mots.length}`], ['Temps', formaterTemps(e.secondes)]),
      message(e.fini ? `Bravo ! Tous les mots en ${formaterTemps(e.secondes)}.` : e.debut !== null ? 'Cliquez maintenant sur la dernière lettre du mot.' : '', e.fini ? 'gagne' : ''),
      el('div', { class: 'mm-zone' }, grille, liste),
      astuce('Première lettre, puis dernière lettre'),
    );
  },
  demarre(h) {
    h.intervalle(() => {
      if (h.etat.fini) return;
      h.etat.secondes++;
      const t = h.ctx.conteneur.querySelectorAll('.infos .val')[1];
      if (t) t.textContent = formaterTemps(h.etat.secondes);
    }, 1000);
  },
});

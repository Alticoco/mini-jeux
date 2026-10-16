import { astuce, choix, fabrique, infos, message } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import type { Difficulte } from '../../core/types';
import { BORNES, MANCHES, melangerMot, pointsManche, solutions, tirerMots, valider } from './logique';

interface Etat { niveau: Difficulte; mots: string[]; melanges: string[]; manche: number; saisie: string; indices: number; erreurs: number; score: number; texte: string; fini: boolean }

const neufAvec = (niveau: Difficulte): Etat => {
  const mots = tirerMots(niveau);
  return { niveau, mots, melanges: mots.map((m) => melangerMot(m)), manche: 0, saisie: '', indices: 0, erreurs: 0, score: 0, texte: 'Remettez les lettres dans l\'ordre pour former un mot.', fini: false };
};

export const jeuAnagrammes = fabrique<Etat>({
  id: 'anagrammes', nom: 'Anagrammes', famille: 'Mots', icone: '🔀',
  description: 'Retrouvez le mot caché dans les lettres.',
  regles: `<p>Cinq manches. À chaque manche, des <b>lettres mélangées</b> sont affichées : trouvez un mot français qui les utilise <b>toutes, exactement une fois</b>.</p><ul><li>Tapez le mot (sans accent) puis <b>Entrée</b>.</li><li><b>Indice</b> : révèle une lettre mais coûte des points. Chaque erreur en coûte aussi.</li><li>Une manche réussie rapporte au maximum 100 points.</li></ul><p>Le niveau règle la longueur des mots : facile (4-5 lettres), moyen (6-7), difficile (8 et plus).</p>`,
  score: { libelle: 'meilleur score', sens: 'haut', suffixe: ' pts' },
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && Array.isArray((x as Etat).mots) && Array.isArray((x as Etat).melanges),
  vue(h) {
    const e = h.etat;
    const lettres = e.melanges[e.manche]!;
    const mot = e.mots[e.manche]!;
    const soumettre = () => {
      const p = e.saisie.toLowerCase();
      e.saisie = '';
      if (valider(p, lettres)) {
        const pts = pointsManche(e.indices, e.erreurs);
        e.score += pts;
        e.texte = `Bien joué ! « ${p.toUpperCase()} » : +${pts} points.`;
        h.son('pose');
        if (e.manche === MANCHES - 1) { e.fini = true; e.texte = `Terminé ! Score final : ${e.score} points.`; h.son('gagne'); h.fin({ victoire: true, score: e.score }); }
        else { e.manche++; e.indices = 0; e.erreurs = 0; }
      } else {
        e.erreurs++;
        e.texte = p.length !== lettres.length ? `Il faut utiliser les ${lettres.length} lettres.` : 'Ce n\'est pas un mot connu avec ces lettres.';
        h.son('erreur');
      }
      h.render();
      h.sauver();
    };
    const champ = el('input', { type: 'text', class: 'boggle-champ', value: e.saisie, autocomplete: 'off', maxlength: lettres.length, 'aria-label': 'Votre réponse', disabled: e.fini, oninput: () => { e.saisie = champ.value.toUpperCase().replace(/[^A-Z]/g, ''); champ.value = e.saisie; } });
    champ.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); e.saisie = champ.value; soumettre(); } });
    h.ctx.conteneur.append(
      choix('Niveau :', (Object.keys(BORNES) as Difficulte[]).map((k) => [k, `${k[0]!.toUpperCase() + k.slice(1)}`] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Manche', `${Math.min(e.manche + 1, MANCHES)} / ${MANCHES}`], ['Score', e.score]),
      message(e.texte, e.fini ? 'gagne' : ''),
      el('div', { class: 'ana-lettres' }, ...[...lettres].map((l) => el('span', { class: 'ana-tuile' }, l.toUpperCase()))),
      ...(e.indices ? [el('div', { class: 'muet' }, `Indice : le mot commence par « ${mot.slice(0, e.indices).toUpperCase()} »`)] : []),
      el('div', { class: 'rangee' }, champ,
        el('button', { class: 'btn primaire', disabled: e.fini, onclick: () => { e.saisie = champ.value; soumettre(); } }, 'Valider'),
        el('button', { class: 'btn', disabled: e.fini || e.indices >= mot.length - 1, onclick: () => { e.indices++; h.render(); } }, '💡 Indice'),
        el('button', { class: 'btn', disabled: e.fini, onclick: () => { e.melanges[e.manche] = melangerMot(mot); h.render(); } }, '🔀 Remélanger')),
      ...(e.fini ? [el('div', { class: 'muet' }, `Mots à trouver : ${e.mots.map((m) => m.toUpperCase()).join(', ')}`)] : []),
      astuce(`Il peut y avoir plusieurs solutions (ici ${solutions(lettres).length} dans le dictionnaire)`),
    );
    if (!e.fini) setTimeout(() => champ.focus(), 0);
  },
});

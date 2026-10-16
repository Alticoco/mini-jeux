import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { MANCHES, evaluer, meilleursMots, tirage } from './logique';

interface Etat { tirages: string[]; manche: number; saisie: string; score: number; reste: number; texte: string; fini: boolean; bilan: string[] }

const DUREE = 45;
const neuf = (): Etat => ({ tirages: Array.from({ length: MANCHES }, () => tirage()), manche: 0, saisie: '', score: 0, reste: DUREE, texte: 'Formez le mot le plus long possible avec ces lettres.', fini: false, bilan: [] });

function cloturer(h: Hote<Etat>): void {
  const e = h.etat;
  const lettres = e.tirages[e.manche]!;
  const r = evaluer(e.saisie, lettres);
  const meilleurs = meilleursMots(lettres);
  e.score += r.ok ? r.points : 0;
  e.bilan.push(`${lettres} : ${r.ok ? `${e.saisie.toUpperCase()} (+${r.points})` : 'aucun mot'} — meilleur : ${meilleurs[0]?.toUpperCase() ?? '–'} (${meilleurs[0]?.length ?? 0} lettres)`);
  e.saisie = '';
  h.son(r.ok ? 'pose' : 'erreur');
  if (e.manche === MANCHES - 1) {
    e.fini = true;
    e.texte = `Terminé ! Score : ${e.score} points.`;
    h.son('gagne');
    h.fin({ victoire: e.score > 0, score: e.score });
  } else { e.manche++; e.reste = DUREE; e.texte = r.ok ? `+${r.points} points !` : r.raison; }
  h.render();
  h.sauver();
}

export const jeuMotLong = fabrique<Etat>({
  id: 'motlong', nom: 'Le mot le plus long', famille: 'Mots', icone: '📏',
  description: 'Un tirage de lettres, trouvez le plus long mot.',
  regles: `<p>Trois manches de <b>${DUREE} secondes</b>. À chaque manche, 10 lettres sont tirées : formez le <b>mot le plus long possible</b> en n'utilisant chaque lettre qu'<b>une seule fois</b> au maximum.</p><ul><li>Tapez votre mot (sans accent) puis <b>Entrée</b> pour valider (ou attendez la fin du temps : le mot saisi est alors pris en compte).</li><li>Un mot de N lettres rapporte N × N points.</li></ul><p>À la fin, le bilan montre le meilleur mot possible de chaque tirage dans le dictionnaire embarqué.</p>`,
  score: { libelle: 'meilleur score', sens: 'haut', suffixe: ' pts' },
  neuf,
  valide: (x) => !!x && Array.isArray((x as Etat).tirages),
  sauvegardable: () => false,
  vue(h) {
    const e = h.etat;
    const lettres = e.tirages[e.manche]!;
    const champ = el('input', { type: 'text', class: 'boggle-champ', value: e.saisie, autocomplete: 'off', 'aria-label': 'Votre mot', disabled: e.fini, oninput: () => { e.saisie = champ.value.toUpperCase().replace(/[^A-Z]/g, ''); champ.value = e.saisie; } });
    champ.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); e.saisie = champ.value; cloturer(h); } });
    h.ctx.conteneur.append(
      infos(['Manche', `${Math.min(e.manche + 1, MANCHES)} / ${MANCHES}`], ['Temps', e.reste], ['Score', e.score]),
      message(e.texte, e.fini ? 'gagne' : ''),
      el('div', { class: 'ana-lettres' }, ...[...lettres].map((l) => el('span', { class: 'ana-tuile' }, l))),
      el('div', { class: 'rangee' }, champ, el('button', { class: 'btn primaire', disabled: e.fini, onclick: () => { e.saisie = champ.value; cloturer(h); } }, 'Valider')),
      ...(e.fini ? [el('ul', { class: 'bilan' }, ...e.bilan.map((b) => el('li', {}, b)))] : []),
      astuce('Chaque lettre ne peut servir qu\'autant de fois qu\'elle apparaît'),
    );
    if (!e.fini) setTimeout(() => champ.focus(), 0);
  },
  demarre(h) {
    h.intervalle(() => {
      const e = h.etat;
      if (e.fini) return;
      e.reste--;
      if (e.reste <= 0) { cloturer(h); return; }
      const t = h.ctx.conteneur.querySelectorAll('.infos .val')[1];
      if (t) t.textContent = String(e.reste);
    }, 1000);
  },
});

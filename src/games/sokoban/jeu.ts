import { astuce, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { deplacer, gagne, genererNiveau, type Dir, type Niveau } from './logique';

interface Etat { numero: number; niveau: Niveau; boites: number[]; joueur: number; coups: number; poussees: number; historique: Array<{ boites: number[]; joueur: number; coups: number; poussees: number }>; fini: boolean }

const MAX = 40;
const neufAvec = (numero: number): Etat => {
  const niveau = genererNiveau(numero);
  return { numero, niveau, boites: [...niveau.boites], joueur: niveau.joueur, coups: 0, poussees: 0, historique: [], fini: false };
};
const TOUCHES: Record<string, Dir> = { ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite', z: 'haut', s: 'bas', q: 'gauche', d: 'droite' };

function bouger(h: Hote<Etat>, d: Dir): void {
  const e = h.etat;
  if (e.fini) return;
  const r = deplacer(e.niveau, e.boites, e.joueur, d);
  if (!r) return;
  e.historique.push({ boites: e.boites, joueur: e.joueur, coups: e.coups, poussees: e.poussees });
  e.boites = r.boites;
  e.joueur = r.joueur;
  e.coups++;
  if (r.pousse) e.poussees++;
  h.son(r.pousse ? 'pose' : 'clic');
  if (gagne(e.niveau, e.boites)) { e.fini = true; h.son('gagne'); h.fin({ victoire: true }); }
  h.render();
  h.sauver();
}

export const jeuSokoban = fabrique<Etat>({
  id: 'sokoban', nom: 'Sokoban', famille: 'Puzzles', icone: '📦',
  description: 'Poussez les caisses sur les cibles.',
  regles: `<p>Vous êtes l'<b>employé d'entrepôt</b> 🧑. Poussez toutes les <b>caisses</b> 📦 sur les <b>cibles</b> 🎯.</p><ul><li>Déplacement : <b>flèches</b> du clavier (ou clic sur une case voisine).</li><li>Vous ne pouvez que <b>pousser</b> une caisse (pas la tirer), une seule à la fois, et pas contre un mur ou une autre caisse.</li><li>Attention à ne pas coincer une caisse dans un coin !</li></ul><p>Les ${MAX} niveaux sont générés avec une solution garantie, de plus en plus grands. Le bouton « Annuler » rattrape les erreurs.</p>`,
  neuf: () => neufAvec(1),
  valide: (x) => !!x && typeof (x as Etat).numero === 'number' && !!(x as Etat).niveau && Array.isArray((x as Etat).boites),
  sauvegardable: () => true,
  vue(h) {
    const e = h.etat;
    const n = e.niveau;
    const plateau = el('div', { class: 'plateau sokoban-grille', style: `grid-template-columns: repeat(${n.l}, 1fr); width: min(${n.l * 52}px, 94vw)` },
      ...n.murs.map((m, i) => {
        let contenu = '';
        let classe = 'sok-case';
        if (m) classe += ' mur';
        if (n.objectifs.includes(i)) { classe += ' cible'; contenu = '🎯'; }
        if (e.boites.includes(i)) { classe += n.objectifs.includes(i) ? ' caisse-ok' : ' caisse'; contenu = '📦'; }
        if (e.joueur === i) contenu = '🧑';
        const lj = Math.floor(e.joueur / n.l), cj = e.joueur % n.l, l = Math.floor(i / n.l), c = i % n.l;
        const adj = Math.abs(lj - l) + Math.abs(cj - c) === 1;
        return el('div', { class: classe, onclick: adj ? () => bouger(h, l < lj ? 'haut' : l > lj ? 'bas' : c < cj ? 'gauche' : 'droite') : undefined }, contenu);
      }));
    h.ctx.conteneur.append(
      infos(['Niveau', `${e.numero} / ${MAX}`], ['Déplacements', e.coups], ['Poussées', e.poussees]),
      message(e.fini ? `Niveau ${e.numero} réussi en ${e.coups} déplacements !` : '', e.fini ? 'gagne' : ''),
      plateau,
      el('div', { class: 'rangee' },
        el('button', { class: 'btn', disabled: e.numero <= 1, onclick: () => h.recommencer(() => neufAvec(e.numero - 1)) }, '◀ Niveau précédent'),
        el('button', { class: 'btn', onclick: () => h.recommencer(() => neufAvec(e.numero)) }, '⟲ Recommencer le niveau'),
        el('button', { class: `btn${e.fini ? ' primaire' : ''}`, disabled: e.numero >= MAX, onclick: () => h.recommencer(() => neufAvec(e.numero + 1)) }, 'Niveau suivant ▶')),
      astuce('Flèches pour se déplacer · Annuler pour revenir en arrière'),
    );
  },
  demarre(h) {
    h.clavier((ev) => {
      const d = TOUCHES[ev.key];
      if (!d) return;
      ev.preventDefault();
      bouger(h, d);
    });
  },
  annuler(h) {
    const e = h.etat;
    const p = e.historique.pop();
    if (!p) return;
    e.boites = p.boites;
    e.joueur = p.joueur;
    e.coups = p.coups;
    e.poussees = p.poussees;
    e.fini = false;
    h.render();
    h.sauver();
  },
});

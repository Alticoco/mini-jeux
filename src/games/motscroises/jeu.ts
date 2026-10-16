import banqueJson from '../../../assets/grilles-mots-croises.json';
import { choisir } from '../../shared/alea';
import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el, formaterTemps } from '../../shared/dom';
import type { Difficulte } from '../../core/types';
import { casesDuMot, complet, estVide, fausses, lettre, motEn, type Banque, type Grille, type MotGrille } from './logique';

interface Etat { niveau: Difficulte; grille: Grille; saisie: string[]; x: number; y: number; dir: 'H' | 'V'; verif: boolean; aides: number; secondes: number; fini: boolean }

const BANQUE = banqueJson as unknown as Banque;
const neufAvec = (niveau: Difficulte): Etat => {
  const g = choisir(BANQUE[niveau]);
  const m = g.mots[0]!;
  return { niveau, grille: g, saisie: Array<string>(g.n * g.n).fill(''), x: m.x, y: m.y, dir: m.dir, verif: false, aides: 0, secondes: 0, fini: false };
};

function motCourant(e: Etat): MotGrille | undefined {
  return motEn(e.grille, e.x, e.y, e.dir) ?? motEn(e.grille, e.x, e.y, e.dir === 'H' ? 'V' : 'H');
}

function apresSaisie(h: Hote<Etat>): void {
  const e = h.etat;
  e.verif = false;
  if (complet(e.grille, e.saisie)) {
    e.fini = true;
    h.son('gagne');
    h.fin({ victoire: true, ...(e.aides === 0 ? { score: e.secondes } : {}) });
  }
  h.render();
  h.sauver();
}

function ecrire(h: Hote<Etat>, l: string): void {
  const e = h.etat;
  if (e.fini || estVide(e.grille, e.x, e.y)) return;
  e.saisie[e.y * e.grille.n + e.x] = l;
  h.son('clic');
  // avance dans le mot
  const m = motCourant(e);
  if (m) {
    const cases = casesDuMot(m);
    const k = cases.findIndex(([cx, cy]) => cx === e.x && cy === e.y);
    const suivante = cases[k + 1];
    if (suivante && l) { e.x = suivante[0]; e.y = suivante[1]; }
    e.dir = m.dir;
  }
  apresSaisie(h);
}

function deplacer(h: Hote<Etat>, dx: number, dy: number): void {
  const e = h.etat;
  const x = e.x + dx;
  const y = e.y + dy;
  if (x < 0 || y < 0 || x >= e.grille.n || y >= e.grille.n || estVide(e.grille, x, y)) return;
  e.x = x;
  e.y = y;
  if (dx && motEn(e.grille, x, y, 'H')) e.dir = 'H';
  if (dy && motEn(e.grille, x, y, 'V')) e.dir = 'V';
  h.render();
}

export const jeuMotsCroises = fabrique<Etat>({
  id: 'motscroises', nom: 'Mots croisés', famille: 'Mots', icone: '📰',
  description: 'Des grilles avec définitions, 120 en réserve.',
  regles: '<p>Remplissez la grille avec les mots correspondant aux <b>définitions</b> (Horizontalement → et Verticalement ↓). Les <b>numéros</b> dans la grille renvoient aux définitions.</p><ul><li>Cliquez une case : le mot courant est surligné. Cliquez-la de nouveau pour <b>changer de sens</b>. Cliquez une définition pour aller à son mot.</li><li>Tapez les lettres (sans accent) ; <b>Retour arrière</b> efface ; les flèches déplacent le curseur.</li><li><b>Vérifier</b> : surligne les lettres fausses. <b>Révéler</b> une lettre ou un mot : votre temps ne comptera plus pour le record.</li></ul><p>Les 120 grilles sont préparées à l\'avance et vérifiées par un script (aucun mot parasite).</p>',
  score: { libelle: 'meilleur temps', sens: 'bas', suffixe: ' s' },
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && !!(x as Etat).grille && Array.isArray((x as Etat).saisie),
  vue(h) {
    const e = h.etat;
    const g = e.grille;
    const courant = motCourant(e);
    const casesCourantes = new Set((courant ? casesDuMot(courant) : []).map(([x, y]) => y * g.n + x));
    const faux = e.verif ? fausses(g, e.saisie) : new Set<number>();
    const numeros = new Map<string, number>();
    for (const m of g.mots) numeros.set(`${m.x},${m.y}`, m.n);
    const plateau = el('div', { class: 'mc-grille', style: `grid-template-columns: repeat(${g.n}, 1fr); width: min(${g.n * 44}px, 94vw)` });
    for (let y = 0; y < g.n; y++) {
      for (let x = 0; x < g.n; x++) {
        if (estVide(g, x, y)) { plateau.append(el('div', { class: 'mc-noire' })); continue; }
        const i = y * g.n + x;
        const num = numeros.get(`${x},${y}`);
        plateau.append(el('button', {
          class: `mc-case${casesCourantes.has(i) ? ' mot' : ''}${e.x === x && e.y === y ? ' curseur' : ''}${faux.has(i) ? ' faux' : ''}`, disabled: e.fini, 'aria-label': `Ligne ${y + 1} colonne ${x + 1}`,
          onclick: () => {
            if (e.x === x && e.y === y) e.dir = e.dir === 'H' ? 'V' : 'H';
            else { e.x = x; e.y = y; if (!motEn(g, x, y, e.dir)) e.dir = e.dir === 'H' ? 'V' : 'H'; }
            h.render();
          },
        }, num ? el('span', { class: 'mc-num' }, String(num)) : '', e.saisie[i] ?? ''));
      }
    }
    const liste = (dir: 'H' | 'V', titre: string) => el('div', { class: 'mc-defs' }, el('h2', {}, titre),
      ...g.mots.filter((m) => m.dir === dir).map((m) => el('button', { class: `mc-def${courant === m ? ' actif' : ''}`, onclick: () => { e.x = m.x; e.y = m.y; e.dir = m.dir; h.render(); } },
        el('b', {}, `${m.n}. `), `${m.def} (${m.mot.length})`)));
    const reveler = (tout: boolean) => {
      if (e.fini || !courant) return;
      e.aides++;
      for (const [cx, cy] of tout ? casesDuMot(courant) : [[e.x, e.y] as [number, number]]) e.saisie[cy * g.n + cx] = lettre(g, cx, cy);
      apresSaisie(h);
    };
    h.ctx.conteneur.append(
      choix('Grille :', (['facile', 'moyen', 'difficile'] as Difficulte[]).map((k) => [k, k[0]!.toUpperCase() + k.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      infos(['Temps', formaterTemps(e.secondes)], ['Aides', e.aides]),
      message(e.fini ? `Bravo ! Grille terminée en ${formaterTemps(e.secondes)}${e.aides ? ' (avec aides : temps non retenu)' : ''}.` : courant ? `${courant.n} ${courant.dir === 'H' ? '→' : '↓'} ${courant.def} (${courant.mot.length} lettres)` : '', e.fini ? 'gagne' : ''),
      el('div', { class: 'mc-zone' }, el('div', { class: 'defile-x' }, plateau), el('div', { class: 'mc-listes' }, liste('H', 'Horizontalement →'), liste('V', 'Verticalement ↓'))),
      el('div', { class: 'rangee' },
        el('button', { class: 'btn', disabled: e.fini, onclick: () => { e.verif = true; h.render(); } }, '🔍 Vérifier'),
        el('button', { class: 'btn', disabled: e.fini, onclick: () => reveler(false) }, 'Révéler une lettre'),
        el('button', { class: 'btn', disabled: e.fini, onclick: () => reveler(true) }, 'Révéler le mot')),
      astuce('Tapez les lettres · clic sur la case courante : changer de sens'),
    );
  },
  demarre(h) {
    h.clavier((ev) => {
      if (ev.ctrlKey || ev.altKey || ev.metaKey || h.etat.fini) return;
      if (/^[a-zA-Z]$/.test(ev.key)) { ev.preventDefault(); ecrire(h, ev.key.toUpperCase()); }
      else if (ev.key === 'Backspace') {
        ev.preventDefault();
        const e = h.etat;
        const i = e.y * e.grille.n + e.x;
        if (e.saisie[i]) { e.saisie[i] = ''; h.render(); }
        else if (e.dir === 'H') { deplacer(h, -1, 0); const j = h.etat.y * h.etat.grille.n + h.etat.x; h.etat.saisie[j] = ''; h.render(); }
        else { deplacer(h, 0, -1); const j = h.etat.y * h.etat.grille.n + h.etat.x; h.etat.saisie[j] = ''; h.render(); }
      }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); deplacer(h, -1, 0); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); deplacer(h, 1, 0); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); deplacer(h, 0, -1); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); deplacer(h, 0, 1); }
    });
    h.intervalle(() => {
      if (h.etat.fini) return;
      h.etat.secondes++;
      const t = h.ctx.conteneur.querySelector('.infos .val');
      if (t) t.textContent = formaterTemps(h.etat.secondes);
    }, 1000);
  },
});

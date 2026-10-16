import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import type { Difficulte } from '../../core/types';
import { FLOTTE, N, NOMS_NAVIRES, casesNavire, choixTir, flotteCoulee, naviresRestants, nouveauPlateau, peutPlacer, placerAleatoire, tirer, type Plateau } from './logique';

interface Etat { niveau: Difficulte; phase: 'placement' | 'combat' | 'fini'; joueur: Plateau; ordi: Plateau; horizontal: boolean; texte: string; gagne: boolean; tourOrdi: boolean }

const neufAvec = (niveau: Difficulte): Etat => ({ niveau, phase: 'placement', joueur: nouveauPlateau(), ordi: placerAleatoire(), horizontal: true, texte: 'Placez votre flotte : cliquez sur la grille pour poser le navire.', gagne: false, tourOrdi: false });
const MESSAGES = { eau: 'à l\'eau', touche: 'touché', coule: 'coulé' } as const;

function tourOrdi(h: Hote<Etat>): void {
  const e = h.etat;
  const i = choixTir(e.joueur.tirs, naviresRestants(e.joueur), e.niveau);
  const r = tirer(e.joueur, i);
  const col = String.fromCharCode(65 + (i % N));
  const msg = `L'ordinateur tire en ${col}${Math.floor(i / N) + 1} : ${MESSAGES[r.resultat as keyof typeof MESSAGES]}${r.resultat === 'coule' ? ` (votre ${NOMS_NAVIRES[FLOTTE.indexOf(r.navire!.taille)]?.toLowerCase() ?? 'navire'})` : ''}.`;
  h.son(r.resultat === 'eau' ? 'clic' : 'erreur');
  if (flotteCoulee(e.joueur)) {
    e.phase = 'fini';
    e.texte = `${msg} Votre flotte est détruite : défaite.`;
    h.son('perdu');
    h.fin({ victoire: false });
  } else {
    e.tourOrdi = false;
    e.texte = `${msg} À vous de tirer !`;
  }
  h.render();
  h.sauver();
}

export const jeuBatailleNavale = fabrique<Etat>({
  id: 'bataillenavale', nom: 'Bataille navale', famille: 'Contre l\'ordi', icone: '🚢',
  description: 'Coulez la flotte ennemie avant qu\'elle ne coule la vôtre.',
  regles: '<p>Chaque camp possède une flotte de <b>5 navires</b> (de 5, 4, 3, 3 et 2 cases) cachée sur une grille de 10×10. Les navires ne se touchent pas.</p><ul><li><b>Placement</b> : cliquez la grille pour poser chaque navire (bouton « Orientation » pour tourner) ou utilisez « Au hasard ».</li><li><b>Combat</b> : à tour de rôle, tirez sur une case de la grille ennemie. Vous saurez si c\'est <b>à l\'eau</b>, <b>touché</b> ou <b>coulé</b>.</li></ul><p>Le premier qui coule toute la flotte adverse gagne. Le niveau règle l\'intelligence de l\'ordinateur.</p>',
  neuf: (o) => neufAvec(o.difficulte),
  valide: (x) => !!x && !!(x as Etat).joueur && !!(x as Etat).ordi,
  sauvegardable: (e) => e.phase !== 'fini',
  demarre(h) {
    if (h.etat.phase === 'combat' && h.etat.tourOrdi) h.delai(() => tourOrdi(h), 600);
  },
  vue(h) {
    const e = h.etat;
    const suivant = e.joueur.navires.length;
    const grille = (p: Plateau, adverse: boolean) => {
      const sunk = new Set(p.navires.filter((n) => n.cases.every((c) => p.tirs[c] === 3)).flatMap((n) => n.cases));
      const montrer = new Set(adverse ? (e.phase === 'fini' ? p.navires.flatMap((n) => n.cases) : []) : p.navires.flatMap((n) => n.cases));
      const plateau = el('div', { class: `bn-grille${adverse ? ' adverse' : ''}`, style: `grid-template-columns: 22px repeat(${N}, 1fr)` });
      plateau.append(el('span', {}), ...Array.from({ length: N }, (_, c) => el('span', { class: 'bn-ent' }, String.fromCharCode(65 + c))));
      for (let l = 0; l < N; l++) {
        plateau.append(el('span', { class: 'bn-ent' }, String(l + 1)));
        for (let c = 0; c < N; c++) {
          const i = l * N + c;
          const t = p.tirs[i]!;
          let classe = 'bn-case';
          let contenu = '';
          if (t === 1) { classe += ' eau'; contenu = '•'; }
          else if (t === 2) { classe += ' touche'; contenu = '✖'; }
          else if (t === 3) { classe += ' coule'; contenu = '✖'; }
          else if (montrer.has(i)) classe += ' navire';
          if (adverse && sunk.has(i) && t === 3) classe += ' navire';
          const cliquable = adverse ? e.phase === 'combat' && !e.tourOrdi && t === 0 : e.phase === 'placement' && suivant < FLOTTE.length;
          plateau.append(el('button', {
            class: classe, disabled: !cliquable, 'aria-label': `${String.fromCharCode(65 + c)}${l + 1}`,
            onclick: () => {
              if (adverse) {
                const r = tirer(e.ordi, i);
                h.son(r.resultat === 'eau' ? 'clic' : 'pose');
                const msg = `Votre tir : ${MESSAGES[r.resultat as keyof typeof MESSAGES]}${r.resultat === 'coule' ? ` (${NOMS_NAVIRES[FLOTTE.indexOf(r.navire!.taille)]?.toLowerCase()} ennemi)` : ''}.`;
                if (flotteCoulee(e.ordi)) { e.phase = 'fini'; e.gagne = true; e.texte = `${msg} Flotte ennemie détruite : victoire !`; h.son('gagne'); h.fin({ victoire: true }); h.render(); h.sauver(); return; }
                e.tourOrdi = true;
                e.texte = `${msg} L'ordinateur réfléchit…`;
                h.render();
                h.delai(() => tourOrdi(h), 700);
              } else {
                const cases = casesNavire(i, FLOTTE[suivant]!, e.horizontal);
                if (!peutPlacer(e.joueur, cases)) { h.son('erreur'); e.texte = 'Placement impossible ici (hors grille ou trop près d\'un autre navire).'; h.render(); return; }
                e.joueur.navires.push({ taille: FLOTTE[suivant]!, cases: cases! });
                h.son('pose');
                if (e.joueur.navires.length === FLOTTE.length) { e.phase = 'combat'; e.texte = 'Flotte en place. À vous de tirer !'; }
                else e.texte = `Placez : ${NOMS_NAVIRES[e.joueur.navires.length]} (${FLOTTE[e.joueur.navires.length]} cases).`;
                h.render();
                h.sauver();
              }
            },
          }, contenu));
        }
      }
      return plateau;
    };
    const restantsOrdi = naviresRestants(e.ordi);
    h.ctx.conteneur.append(
      choix('Niveau :', (['facile', 'moyen', 'difficile'] as Difficulte[]).map((k) => [k, k[0]!.toUpperCase() + k.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      ...(e.phase === 'combat' || e.phase === 'fini' ? [infos(['Navires ennemis restants', restantsOrdi.length], ['Vos navires restants', naviresRestants(e.joueur).length])] : []),
      message(e.texte, e.phase === 'fini' ? (e.gagne ? 'gagne' : 'perdu') : ''),
      ...(e.phase === 'placement' ? [el('div', { class: 'rangee' },
        el('button', { class: 'btn', onclick: () => { e.horizontal = !e.horizontal; h.render(); } }, `↻ Orientation : ${e.horizontal ? 'horizontale' : 'verticale'}`),
        el('button', { class: 'btn', onclick: () => { e.joueur = placerAleatoire(); e.phase = 'combat'; e.texte = 'Flotte en place. À vous de tirer !'; h.render(); h.sauver(); } }, '🎲 Au hasard'),
        el('button', { class: 'btn', disabled: !e.joueur.navires.length, onclick: () => { e.joueur = nouveauPlateau(); e.texte = 'Placez votre flotte : cliquez sur la grille.'; h.render(); } }, 'Réinitialiser'))] : []),
      el('div', { class: 'bn-zone' },
        ...(e.phase === 'placement' ? [] : [el('div', {}, el('h2', { class: 'bn-titre' }, 'Flotte ennemie'), grille(e.ordi, true))]),
        el('div', {}, el('h2', { class: 'bn-titre' }, 'Votre flotte'), grille(e.joueur, false))),
      astuce(e.phase === 'placement' ? 'Cliquez la case de départ du navire' : 'Cliquez une case de la grille ennemie pour tirer'),
    );
  },
});

import type { Difficulte } from '../../core/types';
import { astuce, choix, fabrique, infos, message, type Hote } from '../../shared/fabrique';
import { el } from '../../shared/dom';
import { selecteurMode, type Mode } from '../../shared/mode';
import { appliquer, coupOrdi, coupsLegaux, depart, type Camp, type Coup, type Plateau } from './logique';

interface Etat { p: Plateau; tour: Camp; sel: number | null; niveau: Difficulte; sansPrise: number; dernier: number; texte: string; fini: boolean; mode?: Mode }

/** Mode courant, conservé pour « Nouvelle partie ». En mode à deux : 'joueur' = clairs, 'ordi' = foncés. */
let modeCourant: Mode = 'ordi';
const nomCamp = (c: Camp): string => (c === 'joueur' ? 'Clairs' : 'Foncés');

const neufAvec = (niveau: Difficulte, mode: Mode = 'ordi'): Etat => ({ p: depart(), tour: 'joueur', sel: null, niveau, sansPrise: 0, dernier: -1, texte: mode === 'deux' ? 'Au tour des Clairs.' : 'À vous de jouer (pions clairs).', fini: false, mode });

function jouerCoup(h: Hote<Etat>, c: Coup): void {
  const e = h.etat;
  const etaitDame = e.p[c.de] === 2 || e.p[c.de] === 4;
  e.p = appliquer(e.p, c);
  e.dernier = c.vers;
  e.sansPrise = c.pris.length === 0 && etaitDame ? e.sansPrise + 1 : 0;
  e.sel = null;
  h.son(c.pris.length ? 'pose' : 'clic');
  const suivant: Camp = e.tour === 'joueur' ? 'ordi' : 'joueur';
  e.tour = suivant;
  if (e.sansPrise >= 40) {
    e.fini = true;
    e.texte = 'Partie nulle (40 coups de dames sans prise).';
    h.render();
    return;
  }
  if (!coupsLegaux(e.p, suivant).length) {
    e.fini = true;
    if (e.mode === 'deux') {
      e.texte = `Victoire des ${nomCamp(suivant === 'ordi' ? 'joueur' : 'ordi')} ! Les ${nomCamp(suivant)} ne peuvent plus jouer.`;
      h.son('gagne');
      h.render();
      return;
    }
    const gagne = suivant === 'ordi';
    e.texte = gagne ? 'Victoire ! L\'ordinateur ne peut plus jouer.' : 'Défaite : vous ne pouvez plus jouer.';
    h.son(gagne ? 'gagne' : 'perdu');
    h.fin({ victoire: gagne });
    h.render();
    return;
  }
  if (e.mode === 'deux') {
    e.texte = `Au tour des ${nomCamp(suivant)}.`;
    h.render();
    return;
  }
  e.texte = suivant === 'ordi' ? 'L\'ordinateur réfléchit…' : 'À vous de jouer.';
  h.render();
  if (suivant === 'ordi') h.delai(() => { jouerCoup(h, coupOrdi(e.p, e.niveau)); h.sauver(); }, 500);
}

export const jeuDames = fabrique<Etat>({
  id: 'dames', nom: 'Dames', famille: 'Contre l\'ordi', icone: '♟️',
  description: 'Dames 8×8 contre l\'ordinateur ou à deux.',
  regles: '<p>Choisissez <b>Contre l\'ordinateur</b> ou <b>À deux</b> (même PC, chacun son tour : les clairs commencent).</p><p>Contre l\'ordinateur, vous jouez les pions <b>clairs</b> (en bas), l\'ordinateur les <b>foncés</b>. Les pions avancent d\'une case en <b>diagonale</b> vers l\'avant.</p><ul><li><b>Prise obligatoire</b> : si vous pouvez sauter par-dessus un pion adverse (case d\'arrivée libre), vous devez le faire. Les prises peuvent s\'enchaîner, et vous devez choisir la rafle qui prend le <b>plus de pions</b>.</li><li>Les pions peuvent prendre <b>en arrière</b>.</li><li>Un pion qui atteint la dernière rangée devient une <b>dame</b> (♛) : elle se déplace et prend de <b>loin</b>, en diagonale.</li></ul><p>Gagnez en capturant ou en bloquant tous les pions adverses. Cliquez un pion (les pions jouables sont entourés), puis sa destination. Partie nulle après 40 coups de dames sans prise.</p>',
  neuf: (o) => neufAvec(o.difficulte, modeCourant),
  arrete() { modeCourant = 'ordi'; },
  valide: (x) => !!x && Array.isArray((x as Etat).p) && (x as Etat).p.length === 64,
  demarre(h) {
    if (h.etat.mode !== 'deux' && h.etat.tour === 'ordi' && !h.etat.fini) h.delai(() => jouerCoup(h, coupOrdi(h.etat.p, h.etat.niveau)), 400);
  },
  vue(h) {
    const e = h.etat;
    modeCourant = e.mode ?? 'ordi';
    const deux = e.mode === 'deux';
    const legaux = (deux || e.tour === 'joueur') && !e.fini ? coupsLegaux(e.p, e.tour) : [];
    const origines = new Set(legaux.map((c) => c.de));
    const cibles = new Map(legaux.filter((c) => c.de === e.sel).map((c) => [c.vers, c]));
    const plateau = el('div', { class: 'plateau dames-grille', style: 'grid-template-columns: repeat(8, 1fr)' });
    for (let i = 0; i < 64; i++) {
      const l = Math.floor(i / 8);
      const c = i % 8;
      const sombre = (l + c) % 2 === 1;
      const v = e.p[i]!;
      const jouable = origines.has(i);
      const case_ = el('button', {
        class: `dame-case${sombre ? ' sombre' : ''}${e.sel === i ? ' choisie' : ''}${cibles.has(i) ? ' cible' : ''}${e.dernier === i ? ' dernier' : ''}`,
        disabled: !sombre || (!jouable && !cibles.has(i)), 'aria-label': `Ligne ${l + 1} colonne ${c + 1}`,
        onclick: () => {
          if (cibles.has(i)) { jouerCoup(h, cibles.get(i)!); h.sauver(); return; }
          if (jouable) { e.sel = e.sel === i ? null : i; h.render(); }
        },
      }, v ? el('span', { class: `dpion ${v <= 2 ? 'clair' : 'fonce'}${jouable ? ' jouable' : ''}` }, v === 2 || v === 4 ? '♛' : '') : cibles.has(i) ? el('span', { class: 'point' }) : '');
      plateau.append(case_);
    }
    const n1 = e.p.filter((v) => v === 1 || v === 2).length;
    const n2 = e.p.filter((v) => v === 3 || v === 4).length;
    h.ctx.conteneur.append(
      selecteurMode(e.mode ?? 'ordi', (m) => h.recommencer(() => neufAvec(e.niveau, m))),
      deux ? el('div') : choix('Niveau :', (['facile', 'moyen', 'difficile'] as Difficulte[]).map((n) => [n, n[0]!.toUpperCase() + n.slice(1)] as [Difficulte, string]), e.niveau, (n) => h.recommencer(() => neufAvec(n))),
      deux ? infos(['Clairs', n1], ['Foncés', n2]) : infos(['Vos pions', n1], ['Ordinateur', n2]),
      message(e.texte, e.fini ? (e.texte.startsWith('Victoire') ? 'gagne' : e.texte.startsWith('Défaite') ? 'perdu' : '') : ''),
      plateau, astuce('Prise obligatoire · pions jouables entourés'),
    );
  },
});

import type { ContexteJeu, Famille, InfoScore, Jeu, NomSon, Options, ResultatPartie } from '../core/types';
import { el, vider } from './dom';

/** Accès simplifié au cadre pour un jeu ; les minuteurs et écouteurs créés par ici sont nettoyés automatiquement. */
export interface Hote<E> {
  readonly ctx: ContexteJeu;
  etat: E;
  /** Reconstruit l'affichage (appelle vue()). */
  render(): void;
  /** Sauvegarde automatique de la partie. */
  sauver(): void;
  fin(r: ResultatPartie): void;
  son(n: NomSon): void;
  note(frequence: number, duree?: number): void;
  intervalle(fn: () => void, ms: number): number;
  stop(id: number): void;
  delai(fn: () => void, ms: number): number;
  clavier(fn: (e: KeyboardEvent) => void, type?: 'keydown' | 'keyup'): void;
  /** Boucle d'animation ; renvoie une fonction d'arrêt. dt en millisecondes. */
  boucle(fn: (dt: number) => void): () => void;
  /** Nouvelle partie (avec un état particulier si fourni). */
  recommencer(creer?: () => E): void;
}

export interface Def<E> {
  id: string;
  nom: string;
  famille: Famille;
  icone: string;
  description: string;
  regles: string;
  score?: InfoScore;
  neuf(o: Options): E;
  valide(x: unknown): boolean;
  /** Construit l'interface dans h.ctx.conteneur (déjà vidé). */
  vue(h: Hote<E>): void;
  /** Appelé après le premier affichage (démarrer minuteurs, boucle…). */
  demarre?(h: Hote<E>): void;
  arrete?(h: Hote<E>): void;
  /** Par défaut : sauvegarde tant que l'état n'a pas une propriété `fini` vraie. */
  sauvegardable?(e: E): boolean;
  annuler?(h: Hote<E>): void;
}

export function fabrique<E>(def: Def<E>): Jeu {
  let ctx: ContexteJeu | null = null;
  let etat: E | null = null;
  let attente: E | null = null;
  let hote: Hote<E> | null = null;
  let intervalles: number[] = [];
  let delais: number[] = [];
  let touches: Array<[string, (e: KeyboardEvent) => void]> = [];
  let arretsBoucle: Array<() => void> = [];

  const nettoyer = () => {
    intervalles.forEach((i) => window.clearInterval(i));
    delais.forEach((d) => window.clearTimeout(d));
    touches.forEach(([t, f]) => document.removeEventListener(t, f as EventListener));
    arretsBoucle.forEach((f) => f());
    intervalles = [];
    delais = [];
    touches = [];
    arretsBoucle = [];
  };

  const creerHote = (c: ContexteJeu): Hote<E> => {
    const h: Hote<E> = {
      ctx: c,
      get etat() { return etat as E; },
      set etat(v: E) { etat = v; },
      render() {
        if (!ctx) return;
        vider(ctx.conteneur);
        def.vue(h);
      },
      sauver: () => c.sauvegardeAuto(),
      fin: (r) => c.terminer(r),
      son: (n) => c.jouerSon(n),
      note: (f, d) => c.jouerNote(f, d),
      intervalle(fn, ms) {
        const id = window.setInterval(fn, ms);
        intervalles.push(id);
        return id;
      },
      stop(id) {
        window.clearInterval(id);
        window.clearTimeout(id);
      },
      delai(fn, ms) {
        const id = window.setTimeout(fn, ms);
        delais.push(id);
        return id;
      },
      clavier(fn, type = 'keydown') {
        touches.push([type, fn]);
        document.addEventListener(type, fn);
      },
      boucle(fn) {
        let actif = true;
        let precedent = performance.now();
        const tour = (t: number) => {
          if (!actif) return;
          const dt = Math.min(64, t - precedent);
          precedent = t;
          fn(dt);
          if (actif) requestAnimationFrame(tour);
        };
        requestAnimationFrame(tour);
        const arret = () => { actif = false; };
        arretsBoucle.push(arret);
        return arret;
      },
      recommencer(creer) {
        if (!ctx) return;
        nettoyer();
        etat = creer ? creer() : def.neuf(ctx.options);
        lancer();
        c.sauvegardeAuto();
      },
    };
    return h;
  };

  const lancer = () => {
    if (!ctx || !hote) return;
    hote.render();
    def.demarre?.(hote);
  };

  return {
    id: def.id,
    nom: def.nom,
    famille: def.famille,
    icone: def.icone,
    description: def.description,
    regles: def.regles,
    score: def.score,
    demarrer(c) {
      ctx = c;
      hote = creerHote(c);
      etat = attente ?? def.neuf(c.options);
      attente = null;
      lancer();
    },
    arreter() {
      nettoyer();
      if (hote) def.arrete?.(hote);
      ctx = null;
      etat = null;
      attente = null;
      hote = null;
    },
    sauvegarder() {
      if (etat === null) return null;
      const ok = def.sauvegardable ? def.sauvegardable(etat) : !(etat as { fini?: boolean }).fini;
      return ok ? etat : null;
    },
    charger(s) {
      if (!def.valide(s)) throw new Error('sauvegarde invalide');
      attente = s as E;
    },
    nouvellePartie() {
      hote?.recommencer();
    },
    annuler: def.annuler ? () => hote && def.annuler?.(hote) : undefined,
  };
}

/* ------------------------------ Éléments d'interface ------------------------------ */

export function choix<T extends string | number>(libelle: string, valeurs: Array<[T, string]>, courant: T, f: (v: T) => void): HTMLElement {
  return el('div', { class: 'choix' }, el('span', {}, libelle),
    ...valeurs.map(([v, l]) => el('button', { class: `btn${v === courant ? ' actif' : ''}`, onclick: () => f(v) }, l)));
}

export function message(texte: string, type: '' | 'gagne' | 'perdu' = ''): HTMLElement {
  return el('div', { class: `message${type ? ` ${type}` : ''}`, role: 'status' }, texte);
}

export function infos(...paires: Array<[string, string | number]>): HTMLElement {
  return el('div', { class: 'infos' }, ...paires.map(([l, v]) => el('span', {}, `${l} : `, el('span', { class: 'val' }, String(v)))));
}

export function astuce(texte: string): HTMLElement {
  return el('div', { class: 'muet' }, texte);
}

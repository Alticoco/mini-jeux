/** Contrat commun à tous les jeux (voir CLAUDE.md). */

export type Famille = 'Cartes solo' | 'Cartes contre l\'ordi' | 'Puzzles' | 'Mots' | 'Contre l\'ordi' | 'Arcade' | 'Hasard et mémoire';

export type Difficulte = 'facile' | 'moyen' | 'difficile';

export type ThemeChoix = 'auto' | 'clair' | 'sombre';

export interface Options {
  theme: ThemeChoix;
  son: boolean;
  tailleCartes: number; // 70 à 130 (pourcentage)
  difficulte: Difficulte;
}

export interface ResultatPartie {
  victoire: boolean;
  /** Score ou valeur à comparer au meilleur (temps, coups, points…). */
  score?: number;
}

export interface ContexteJeu {
  conteneur: HTMLElement;
  options: Options;
  /** Enregistre la fin d'une partie dans les statistiques. */
  terminer(resultat: ResultatPartie): void;
  /** À appeler après chaque coup : écrit jeu.sauvegarder() sur disque. */
  sauvegardeAuto(): void;
  jouerSon(nom: NomSon): void;
}

export type NomSon = 'clic' | 'pose' | 'gagne' | 'perdu' | 'erreur';

export interface InfoScore {
  libelle: string;
  /** 'haut' : plus grand = meilleur ; 'bas' : plus petit = meilleur. */
  sens: 'haut' | 'bas';
  suffixe?: string;
}

export interface Jeu {
  readonly id: string;
  readonly nom: string;
  readonly famille: Famille;
  readonly icone: string;
  readonly description: string;
  /** Règles en HTML simple, affichées dans la fenêtre « Règles ». */
  readonly regles: string;
  readonly score?: InfoScore;
  /** Affiche le jeu dans ctx.conteneur (reprend l'état fourni par charger(), sinon nouvelle partie). */
  demarrer(ctx: ContexteJeu): void;
  /** Nettoie timers, écouteurs clavier, etc. */
  arreter(): void;
  /** État à stocker, ou null si aucune partie en cours à reprendre. */
  sauvegarder(): unknown | null;
  /** Fournit l'état sauvegardé ; appelé avant demarrer(). */
  charger(etat: unknown): void;
  nouvellePartie(): void;
  annuler?(): void;
}

export interface StatsJeu {
  parties: number;
  victoires: number;
  meilleur?: number;
}

export interface Donnees {
  version: 1;
  options: Options;
  stats: Record<string, StatsJeu>;
  sauvegardes: Record<string, unknown>;
  favoris: string[];
  recents: string[];
}

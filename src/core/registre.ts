import type { Famille, Jeu } from './types';

/** Registre des jeux : ajouter un jeu = importer son module et l'ajouter à la liste. */
export const jeux: Jeu[] = [];

export function enregistrerJeu(j: Jeu): void {
  jeux.push(j);
}

export function jeuParId(id: string): Jeu | undefined {
  return jeux.find((j) => j.id === id);
}

const ordreFamilles: Famille[] = ['Cartes solo', 'Cartes contre l\'ordi', 'Puzzles', 'Mots', 'Contre l\'ordi', 'Arcade', 'Hasard et mémoire'];

export function familles(): Famille[] {
  return ordreFamilles.filter((f) => jeux.some((j) => j.famille === f));
}

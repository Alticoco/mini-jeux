import { enregistrerJeu } from '../core/registre';
import { jeuKlondike } from './klondike/jeu';
import { jeuBataille } from './bataille/jeu';
import { jeuSudoku } from './sudoku/jeu';
import { jeuDemineur } from './demineur/jeu';
import { jeu2048 } from './g2048/jeu';
import { jeuTaquin } from './taquin/jeu';
import { jeuPendu } from './pendu/jeu';
import { morpion } from './morpion/jeu';
import { jeuP4 } from './puissance4/jeu';
import { jeuSnake } from './snake/jeu';

/** Ordre d'affichage dans le menu (par famille). */
[jeuKlondike, jeuBataille, jeuSudoku, jeuDemineur, jeu2048, jeuTaquin, jeuPendu, morpion, jeuP4, jeuSnake].forEach(enregistrerJeu);

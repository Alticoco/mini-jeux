import { enregistrerJeu } from '../core/registre';
import { morpion } from './morpion/jeu';
import { jeuP4 } from './puissance4/jeu';
import { jeuSnake } from './snake/jeu';
import { jeuDemineur } from './demineur/jeu';
import { jeu2048 } from './g2048/jeu';
import { jeuTaquin } from './taquin/jeu';

[morpion, jeuP4, jeuSnake, jeuDemineur, jeu2048, jeuTaquin].forEach(enregistrerJeu);

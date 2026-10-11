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
import { jeuHanoi } from './hanoi/jeu';
import { jeuLightsOut } from './lightsout/jeu';
import { jeuFloodIt } from './floodit/jeu';
import { jeuPFC } from './pfc/jeu';
import { jeuPileFace } from './pileface/jeu';
import { jeuMemory } from './memory/jeu';
import { jeuSimon } from './simon/jeu';
import { jeuYams } from './yams/jeu';
import { jeuFarkle } from './farkle/jeu';

import { jeuBinairo } from './binairo/jeu';
import { jeuPicross } from './picross/jeu';
import { jeuSokoban } from './sokoban/jeu';
import { jeuMotsMeles } from './motsmeles/jeu';
import { jeuMotus } from './motus/jeu';

import { jeuReversi } from './reversi/jeu';
import { jeuDames } from './dames/jeu';
import { jeuHuitAmericain } from './huitamericain/jeu';
import { jeuMenteur } from './menteur/jeu';
import { jeuMistigri, jeuPouilleux } from './paires/jeu';

import { jeuFreeCell } from './freecell/jeu';
import { jeuSpider } from './spider/jeu';
import { jeuPyramide } from './pyramide/jeu';
import { jeuMahjong } from './mahjong/jeu';

/** Ordre d'affichage dans le menu (par famille). */
[
  jeuKlondike, jeuFreeCell, jeuSpider, jeuPyramide, jeuBataille, jeuHuitAmericain, jeuMenteur, jeuMistigri, jeuPouilleux, jeuDames, jeuReversi, jeuSudoku, jeuDemineur, jeu2048, jeuTaquin, jeuPendu, morpion, jeuP4, jeuSnake,
  jeuMahjong, jeuHanoi, jeuLightsOut, jeuBinairo, jeuPicross, jeuSokoban, jeuMotsMeles, jeuMotus, jeuFloodIt, jeuPFC, jeuPileFace, jeuMemory, jeuSimon, jeuYams, jeuFarkle,
].forEach(enregistrerJeu);

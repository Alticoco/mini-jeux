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

import { jeuTetris } from './tetris/jeu';
import { jeuCasseBriques } from './cassebriques/jeu';
import { jeuPong } from './pong/jeu';

import { jeuGolf } from './golf/jeu';
import { jeuTriPeaks } from './tripeaks/jeu';
import { jeuScorpion } from './scorpion/jeu';
import { jeuYukon } from './yukon/jeu';

import { jeuFutoshiki } from './futoshiki/jeu';
import { jeuHitori } from './hitori/jeu';
import { jeuNurikabe } from './nurikabe/jeu';
import { jeuKakuro } from './kakuro/jeu';

import { jeuBoggle } from './boggle/jeu';
import { jeuAnagrammes } from './anagrammes/jeu';
import { jeuMotLong } from './motlong/jeu';
import { jeuMotsCroises } from './motscroises/jeu';

import { jeuMastermind } from './mastermind/jeu';
import { jeuBatailleNavale } from './bataillenavale/jeu';
import { jeuBackgammon } from './backgammon/jeu';
import { jeuEchecs } from './echecs/jeu';

import { jeuInvaders } from './invaders/jeu';
import { jeuPacman } from './pacman/jeu';
import { jeuFlappy } from './flappy/jeu';

/** Ordre d'affichage dans le menu (par famille). */
[
  jeuKlondike, jeuFreeCell, jeuSpider, jeuPyramide, jeuGolf, jeuTriPeaks, jeuScorpion, jeuYukon, jeuBataille, jeuHuitAmericain, jeuMenteur, jeuMistigri, jeuPouilleux, jeuDames, jeuReversi, jeuSudoku, jeuDemineur, jeu2048, jeuTaquin, jeuPendu, jeuMotsCroises, jeuAnagrammes, jeuBoggle, jeuMotLong, morpion, jeuP4, jeuEchecs, jeuBackgammon, jeuBatailleNavale, jeuMastermind, jeuSnake, jeuTetris, jeuCasseBriques, jeuPong, jeuInvaders, jeuPacman, jeuFlappy,
  jeuMahjong, jeuHanoi, jeuLightsOut, jeuBinairo, jeuKakuro, jeuFutoshiki, jeuHitori, jeuNurikabe, jeuPicross, jeuSokoban, jeuMotsMeles, jeuMotus, jeuFloodIt, jeuPFC, jeuPileFace, jeuMemory, jeuSimon, jeuYams, jeuFarkle,
].forEach(enregistrerJeu);

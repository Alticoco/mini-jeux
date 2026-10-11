# Mini-Jeux

Application Windows 100 % hors ligne qui regroupe des jeux simples. Pas de compte, pas de pub, pas de réseau.

## V1 + V2 : 37 jeux

| Famille | Jeux |
| --- | --- |
| Cartes solo | Klondike, FreeCell, Spider (1, 2 ou 4 couleurs), Pyramide |
| Cartes contre l'ordi | Bataille, 8 américain, Menteur, Mistigri, Pouilleux |
| Puzzles | Sudoku (4 niveaux), Démineur, 2048, Taquin, Mahjong solitaire, Picross, Sokoban (40 niveaux), Tours de Hanoï, Lights Out, Flood-It, Binairo |
| Mots | Pendu, Mots mêlés, Motus |
| Contre l'ordi | Morpion, Puissance 4, Dames, Reversi |
| Arcade | Snake, Tetris, Casse-briques, Pong |
| Hasard et mémoire | Yams, Farkle, Memory, Simon, Pierre-feuille-ciseaux, Pile ou face |

Fonctions communes : menu avec recherche, favoris et derniers joués · règles dans chaque jeu · sauvegarde automatique des parties en cours · annuler le dernier coup quand c'est pertinent · scores et statistiques · thème clair/sombre · sons synthétisés (désactivables) · export/import des données entre deux PC.

## Lancer

- **Installer** : `src-tauri/target/release/bundle/nsis/Mini-Jeux_1.0.0_x64-setup.exe` (installation sans droits administrateur, raccourci dans le menu Démarrer).
- **Sans installer** : double-cliquer sur `src-tauri/target/release/mini-jeux.exe`.

## Développer

Prérequis : Node.js, Rust (rustup) et les Build Tools Visual Studio (charge de travail C++).

```bash
npm install
npm run dev          # dans le navigateur
npm run tauri dev    # fenêtre native
npm test             # tests de la logique des jeux
npm run tauri build  # installateur
```

Voir `CLAUDE.md` pour l'architecture et la marche à suivre pour ajouter un jeu, et `CAHIER.md` pour le cahier des charges (V3 : jeux restants, mots croisés).

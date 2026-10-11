# Mini-Jeux

Application Windows 100 % hors ligne qui regroupe des jeux simples. Pas de compte, pas de pub, pas de réseau.

## V1 : 10 jeux

| Famille | Jeux |
| --- | --- |
| Cartes solo | Solitaire Klondike |
| Cartes contre l'ordi | Bataille |
| Puzzles | Sudoku (4 niveaux), Démineur, 2048, Taquin |
| Mots | Pendu |
| Contre l'ordi | Morpion, Puissance 4 |
| Arcade | Snake |

Fonctions communes : menu avec recherche, favoris et derniers joués · règles dans chaque jeu · sauvegarde automatique des parties en cours · scores et statistiques · thème clair/sombre · sons synthétisés (désactivables) · export/import des données entre deux PC.

## Installer

L'installateur est généré dans `src-tauri/target/release/bundle/nsis/Mini-Jeux_1.0.0_x64-setup.exe` (environ 1 Mo, installation sans droits administrateur).

## Développer

Prérequis : Node.js, Rust (rustup) et les Build Tools Visual Studio (charge de travail C++).

```bash
npm install
npm run dev          # dans le navigateur
npm run tauri dev    # fenêtre native
npm test             # tests de la logique des jeux
npm run tauri build  # installateur
```

Voir `CLAUDE.md` pour l'architecture et la marche à suivre pour ajouter un jeu, et `CAHIER.md` pour le cahier des charges (V2 et V3).

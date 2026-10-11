# Cahier des charges – Appli de mini-jeux hors ligne

Oct 11, 2026 · @Alexis

## Contexte et objectifs

On construit une seule application Windows, 100 % hors ligne, qui regroupe des dizaines de jeux simples (cartes, puzzles, mots, arcade) pour s'occuper sans connexion internet.

- **Usage :** installée sur le PC fixe et le PC portable, lancée comme n'importe quel programme.
- **Principe :** un menu principal, puis chaque jeu s'ouvre en un clic. Aucune inscription, aucun compte, aucune publicité.
- **Esprit :** le catalogue de ces sites de « 1000 jeux en ligne », mais en local et sans rien à télécharger de plus.
- **Mode de réalisation :** projet perso, construit avec Claude Code, par ajouts successifs (un jeu à la fois).

## Contraintes

L'application doit fonctionner sans internet, rester légère (moins de 100 Mo) et s'installer en un clic sur Windows.

- **Hors ligne total :** aucun appel réseau, aucune ressource chargée depuis le web (polices, sons, images embarqués).
- **Plateforme :** Windows (PC fixe et portable). Autres systèmes à confirmer.
- **Taille cible :** 30 à 100 Mo installée.
- **Langue :** interface et dictionnaires en français.
- **Simplicité :** jeux faciles à prendre en main, sessions courtes, règles rappelées dans chaque jeu.
- **Données :** scores et sauvegardes stockés localement sur chaque machine, avec export/import pour passer d'un PC à l'autre.
- **Performance :** démarrage rapide, fluide sur un PC portable modeste.
- **Pas de serveur, pas de compte, pas de télémétrie.**

## Catalogue des jeux

Plus de 50 jeux sont réalisables, répartis en 6 familles. La V1 vise 10 jeux faciles pour valider le cadre, la V2 ajoute les classiques, la V3 les jeux plus complexes (IA, règles longues).

| Jeu | Famille | Version | Difficulté de dev |
| --- | --- | --- | --- |
| Solitaire Klondike | Cartes solo | V1 | Moyenne |
| FreeCell | Cartes solo | V2 | Moyenne |
| Spider (1, 2 et 4 couleurs) | Cartes solo | V2 | Moyenne |
| Pyramide | Cartes solo | V2 | Facile |
| Golf, Tri-Peaks, Scorpion, Yukon | Cartes solo | V3 | Facile à moyenne |
| Bataille | Cartes vs ordi | V1 | Facile |
| 8 américain (Crazy Eights) | Cartes vs ordi | V2 | Moyenne |
| Menteur, Mistigri, Pouilleux | Cartes vs ordi | V2 | Facile |
| Crapette | Cartes vs ordi | V3 | Difficile |
| Belote, Tarot, Rami, Scopa, Président | Cartes vs ordi | V3 | Difficile (IA) |
| Sudoku (4 niveaux) | Puzzles | V1 | Moyenne |
| Démineur | Puzzles | V1 | Facile |
| 2048 | Puzzles | V1 | Facile |
| Taquin | Puzzles | V1 | Facile |
| Mahjong solitaire | Puzzles | V2 | Moyenne |
| Picross (nonogrammes) | Puzzles | V2 | Moyenne |
| Sokoban | Puzzles | V2 | Moyenne (niveaux à fournir) |
| Tours de Hanoï, Lights Out, Flood-It, Binairo | Puzzles | V2 | Facile |
| Kakuro, Futoshiki, Hitori, Nurikabe | Puzzles | V3 | Moyenne |
| Pendu | Mots | V1 | Facile |
| Mots mêlés | Mots | V2 | Facile |
| Motus / Wordle en français | Mots | V2 | Facile |
| Anagrammes, Boggle, mot le plus long | Mots | V3 | Moyenne |
| Mots croisés | Mots | V3 | Moyenne (grilles à fournir) |
| Morpion, Puissance 4 | Vs ordi | V1 | Facile |
| Dames, Reversi (Othello) | Vs ordi | V2 | Moyenne |
| Échecs | Vs ordi | V3 | Difficile |
| Bataille navale, Backgammon, Mastermind | Vs ordi | V3 | Moyenne |
| Snake | Arcade | V1 | Facile |
| Tetris, Casse-briques, Pong | Arcade | V2 | Moyenne |
| Space Invaders, Pac-Man like, Flappy-like | Arcade | V3 | Moyenne |
| Dés (Yams, Farkle), Memory, Simon | Hasard et mémoire | V2 | Facile |
| Pierre-feuille-ciseaux, Pile ou face | Hasard et mémoire | V2 | Très facile |

Chaque jeu respecte la même interface (voir Architecture), donc l'ordre de réalisation reste libre.

## Mots croisés

Les mots croisés sont faisables hors ligne avec des grilles pré-générées embarquées, mais ils ne sont pas dans la V1 : la qualité des définitions est le vrai travail.

- **Option recommandée :** 200 à 500 grilles créées à l'avance avec Claude, vérifiées par un script (mots valides, grille cohérente), stockées en JSON. Quelques Mo seulement.
- **Pourquoi pas de génération locale :** un dictionnaire sait remplir une grille, mais pas écrire de bonnes définitions. Les grilles à définitions sont donc à préparer en amont.
- **Variante sans définitions :** mots fléchés à indices courts (synonymes, catégories), plus faciles à produire.
- **Alternative immédiate :** mots mêlés, Motus et pendu se génèrent localement avec une simple liste de mots.
- **Extension possible :** ajouter un pack de grilles plus tard sans toucher au code, grâce au format JSON.

## Architecture technique

Une application web (HTML, CSS, TypeScript) empaquetée avec Tauri : un seul code, un installateur Windows léger, aucun serveur.

- **Coque :** Tauri v2 (5 à 10 Mo), fenêtre native, mode plein écran possible.
- **Interface :** Vite + TypeScript, sans gros framework au départ. Canvas pour l'arcade, HTML/CSS pour les cartes et les grilles.
- **Un jeu = un module indépendant** qui expose la même interface : `id`, `nom`, `famille`, `regles`, `demarrer()`, `arreter()`, `sauvegarder()`, `charger()`.
- **Registre de jeux :** le menu lit la liste des modules. Ajouter un jeu = ajouter un dossier et une ligne dans le registre.
- **Données :** dictionnaire français, grilles et niveaux en fichiers JSON dans `assets/`.
- **Stockage local :** fichier JSON dans le dossier de données de l'application (scores, sauvegardes, options).

Structure du projet visée :

```
mini-jeux/
  CLAUDE.md            règles du projet pour Claude Code
  src/
    core/              menu, registre, sauvegarde, options, thème
    games/
      klondike/
      sudoku/
      demineur/
      ...
    shared/            cartes, grilles, sons, utilitaires
  assets/
    dictionnaire-fr.json
    grilles/
    niveaux/
  src-tauri/           configuration Tauri et installateur
  tests/
```

## Fonctionnalités communes

Le cadre commun fournit tout ce qui n'est pas propre à un jeu, pour que chaque jeu reste court à écrire.

- **Menu principal :** grille de jeux par famille, recherche par nom, favoris, « derniers joués ».
- **Écran de jeu :** bouton retour, règles accessibles en un clic, pause, nouvelle partie, annuler le dernier coup quand c'est pertinent.
- **Sauvegarde automatique :** reprise d'une partie en cours pour les jeux longs (solitaire, sudoku, échecs).
- **Scores et statistiques :** meilleur score, parties jouées, taux de victoire, par jeu.
- **Options :** thème clair/sombre, son on/off, taille des cartes, difficulté par défaut, plein écran.
- **Export / import :** un fichier de sauvegarde pour transférer scores et parties entre PC fixe et portable.
- **Accessibilité de base :** contrastes corrects, jeu au clavier ou à la souris, grands boutons.
- **Sons légers (optionnel) :** quelques effets courts, désactivables.

## Plan de réalisation

On avance en 6 phases, chacune se terminant par une application qui se lance et se teste, pour ne jamais rester avec un projet cassé.

| Phase | Contenu | Critère de fin |
| --- | --- | --- |
| 0. Cadrage | Trancher les questions ouvertes, écrire CLAUDE.md | Décisions notées, dossier prêt |
| 1. Squelette | Projet Tauri + Vite + TypeScript, menu vide, registre de jeux, thème | La fenêtre s'ouvre et affiche le menu |
| 2. Socle | Sauvegarde locale, scores, options, écran de jeu commun | Un jeu factice sauvegarde et affiche un score |
| 3. Premier jeu | Morpion, puis Snake et Démineur pour valider l'interface | 3 jeux jouables depuis le menu |
| 4. V1 | Klondike, Sudoku, 2048, Taquin, Pendu, Bataille, Puissance 4 | 10 jeux jouables, installateur Windows généré |
| 5. V2 puis V3 | Ajout des jeux par lots de 3 à 5, grilles de mots croisés en dernier | Chaque lot testé et installable |

Une fois la phase 4 atteinte, l'application est déjà utilisable au quotidien. Les phases suivantes n'ajoutent que des jeux.

## Méthode avec Claude Code

Le secret est de donner à Claude Code un cadre fixe, puis de lui demander un jeu à la fois.

1. **Coller ce cahier des charges** dans le dossier du projet (fichier `CAHIER.md`) et créer un `CLAUDE.md` court : stack, structure, interface d'un jeu, règles de style, commande pour lancer et tester.
2. **Démarrer par la phase 1** : demander le squelette Tauri + menu + registre, et vérifier qu'il se lance avant d'aller plus loin.
3. **Écrire l'interface d'un jeu en premier** (le contrat commun), puis un jeu témoin simple. Tous les jeux suivants le copient.
4. **Un prompt = un jeu** : « Ajoute le Démineur en suivant l'interface de `src/games/_modele`, avec règles, scores et sauvegarde. »
5. **Tester à chaque jeu** : tests unitaires sur la logique pure (règles, victoire, génération de grille), séparée de l'affichage.
6. **Committer après chaque jeu** (git) pour pouvoir revenir en arrière.
7. **Garder les données à part** : dictionnaire, grilles et niveaux générés par script, jamais écrits à la main dans le code.

**Contenu type de `CLAUDE.md` :** objectif de l'appli, stack (Tauri, Vite, TypeScript), interdiction de tout appel réseau, structure des dossiers, interface obligatoire d'un jeu, commandes `dev`, `test` et `build`, et la règle « logique de jeu séparée de l'affichage ».

## Questions à trancher demain

- [ ] Windows uniquement, ou aussi macOS / Linux ?
- [ ] Interface 100 % en français ?
- [ ] Style visuel : simple et propre, rétro, ou proche d'un jeu de société ?
- [ ] Adversaires IA dès la V1 (dames, belote) ou seulement du solo au début ?
- [ ] Sons et musique : oui, non, ou effets seulement ?
- [ ] Souris seule, ou aussi clavier et manette ?
- [ ] Nom de l'application
- [ ] Mots croisés : grilles classiques, mots fléchés, ou les deux ?
- [ ] Combien de jeux pour la V1 : les 10 proposés, ou moins pour démarrer plus vite ?

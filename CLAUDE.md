# Mini-Jeux

Application Windows 100 % hors ligne regroupant des mini-jeux (cartes, puzzles, mots, arcade). Cahier des charges : `CAHIER.md`.

## Règles
- **Aucun appel réseau**, aucune ressource web (polices, sons, images embarqués ; sons synthétisés via WebAudio). CSP stricte dans `src-tauri/tauri.conf.json`.
- Interface et textes en **français**. Pas de compte, pas de télémétrie.
- **Logique de jeu séparée de l'affichage** : `logique.ts` (pur, testé) + `jeu.ts` (DOM/canvas).
- Données (dictionnaires, grilles, niveaux) en JSON dans `assets/`, générées par script dans `scripts/`.

## Stack
Tauri v2 + Vite + TypeScript (sans framework). Tests : Vitest. Stockage : `localStorage` du webview (dossier de données de l'app), export/import JSON.

## Structure
- `src/core/` : menu, registre, stockage, stats, options, sons, écran de jeu (`app.ts`).
- `src/games/<id>/` : `logique.ts` + `jeu.ts`. Modèle de référence : `src/games/morpion`.
- `src/shared/` : `dom.ts` (helper `el`), `alea.ts`, `cartes.ts`.
- `tests/` : tests unitaires de la logique.

## Ajouter un jeu
1. Créer `src/games/<id>/logique.ts` (pur) et `jeu.ts` qui exporte un objet `Jeu` (voir `src/core/types.ts`) :
   `id, nom, famille, icone, description, regles, score?, demarrer(ctx), arreter(), sauvegarder(), charger(etat), nouvellePartie(), annuler?()`.
2. L'ajouter à la liste dans `src/games/index.ts`.
3. `charger()` mémorise l'état, `demarrer()` l'utilise (et le vide) ; `arreter()` nettoie timers et écouteurs clavier.
4. Appeler `ctx.sauvegardeAuto()` après chaque coup, `ctx.terminer({victoire, score})` en fin de partie.
5. Ajouter `tests/<id>.test.ts`.

## Commandes
- `npm run dev` : serveur Vite (navigateur). `npm run tauri dev` : fenêtre native.
- `npm test` : tests. `npm run typecheck`.
- `npm run tauri build` : installateur NSIS dans `src-tauri/target/release/bundle/nsis/`.
- Windows : ajouter `%USERPROFILE%\.cargo\bin` au PATH si `cargo` est introuvable.

## Décisions (phase 0)
Windows uniquement · interface 100 % française · style simple et propre (thème clair/sombre) · adversaires IA simples en V1 (Morpion, Puissance 4, Bataille) · effets sonores seulement, désactivables · souris + clavier · nom : **Mini-Jeux** · mots croisés hors V1.

import { el, vider } from '../shared/dom';
import { jeux, jeuParId, familles } from './registre';
import { donnees, enregistrer, exporterTexte, importerTexte, reinitialiserStats, optionsParDefaut } from './storage';
import { enregistrerResultat, statsDe, tauxVictoire } from './stats';
import { jouerNote, jouerSon } from './son';
import type { ContexteJeu, Jeu } from './types';

const racine = (): HTMLElement => document.getElementById('app')!;
let jeuActif: Jeu | null = null;

export function appliquerTheme(): void {
  const t = donnees().options.theme;
  const sombre = t === 'sombre' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = sombre ? 'sombre' : 'clair';
  document.documentElement.style.setProperty('--zoom-cartes', String(donnees().options.tailleCartes / 100));
}

/* ------------------------------ Fenêtres modales ------------------------------ */

function modale(titre: string, contenu: Node): void {
  const fond = el('div', { class: 'modale-fond' });
  const fermer = () => fond.remove();
  fond.addEventListener('click', (e) => e.target === fond && fermer());
  fond.addEventListener('keydown', (e) => e.key === 'Escape' && fermer());
  const boite = el(
    'div',
    { class: 'modale', role: 'dialog', 'aria-label': titre, tabindex: -1 },
    el('div', { class: 'modale-tete' }, el('h2', {}, titre), el('button', { class: 'btn', onclick: fermer, 'aria-label': 'Fermer' }, '✕')),
    contenu,
  );
  fond.append(boite);
  document.body.append(fond);
  boite.focus();
}

function afficherRegles(jeu: Jeu): void {
  const c = el('div', { class: 'regles' });
  c.innerHTML = jeu.regles;
  modale(`Règles : ${jeu.nom}`, c);
}

async function basculerPleinEcran(): Promise<void> {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const w = getCurrentWindow();
    await w.setFullscreen(!(await w.isFullscreen()));
  } catch {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }
}

function afficherOptions(): void {
  const o = donnees().options;
  const maj = () => {
    enregistrer();
    appliquerTheme();
  };
  const ligne = (libelle: string, champ: Node) => el('label', { class: 'ligne-option' }, el('span', {}, libelle), champ);
  const select = <T extends string>(valeurs: Array<[T, string]>, courant: T, f: (v: T) => void) => {
    const s = el('select', { onchange: () => { f(s.value as T); maj(); } });
    for (const [v, l] of valeurs) s.append(el('option', { value: v, selected: v === courant }, l));
    return s;
  };
  const son = el('input', { type: 'checkbox', checked: o.son, onchange: () => { o.son = son.checked; maj(); } });
  const taille = el('input', {
    type: 'range', min: 70, max: 130, step: 10, value: o.tailleCartes,
    oninput: () => { o.tailleCartes = Number(taille.value); maj(); },
  });
  const message = el('p', { class: 'muet', role: 'status' });
  const fichier = el('input', { type: 'file', accept: '.json,application/json', class: 'cache' });
  fichier.addEventListener('change', async () => {
    const f = fichier.files?.[0];
    if (!f) return;
    if (importerTexte(await f.text())) {
      appliquerTheme();
      message.textContent = 'Import réussi : scores et parties restaurés.';
    } else message.textContent = 'Fichier invalide : import annulé.';
  });
  const exporter = () => {
    const url = URL.createObjectURL(new Blob([exporterTexte()], { type: 'application/json' }));
    const a = el('a', { href: url, download: `mini-jeux-sauvegarde-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    message.textContent = 'Fichier de sauvegarde créé (dossier Téléchargements).';
  };
  modale(
    'Options',
    el(
      'div',
      { class: 'options' },
      ligne('Thème', select([['auto', 'Automatique'], ['clair', 'Clair'], ['sombre', 'Sombre']], o.theme, (v) => (o.theme = v))),
      ligne('Sons', son),
      ligne('Taille des cartes', taille),
      ligne('Difficulté par défaut', select([['facile', 'Facile'], ['moyen', 'Moyen'], ['difficile', 'Difficile']], o.difficulte, (v) => (o.difficulte = v))),
      el('div', { class: 'rangee' },
        el('button', { class: 'btn', onclick: () => void basculerPleinEcran() }, 'Plein écran'),
        el('button', { class: 'btn', onclick: exporter }, 'Exporter mes données'),
        el('button', { class: 'btn', onclick: () => fichier.click() }, 'Importer…'),
        fichier,
        el('button', { class: 'btn danger', onclick: () => {
          if (confirm('Effacer tous les scores et statistiques ?')) { reinitialiserStats(); message.textContent = 'Statistiques effacées.'; }
        } }, 'Effacer les statistiques'),
        el('button', { class: 'btn', onclick: () => { Object.assign(o, optionsParDefaut); maj(); message.textContent = 'Options par défaut rétablies.'; } }, 'Options par défaut'),
      ),
      message,
    ),
  );
}

function afficherStatistiques(): void {
  const t = el('table', { class: 'stats' }, el('thead', {}, el('tr', {}, ...['Jeu', 'Parties', 'Victoires', 'Taux', 'Meilleur'].map((h) => el('th', {}, h)))));
  const corps = el('tbody');
  for (const j of jeux) {
    const s = statsDe(j.id);
    corps.append(el('tr', {},
      el('td', {}, `${j.icone} ${j.nom}`),
      el('td', {}, String(s.parties)),
      el('td', {}, String(s.victoires)),
      el('td', {}, s.parties ? `${tauxVictoire(s)} %` : '–'),
      el('td', {}, s.meilleur !== undefined && j.score ? `${s.meilleur}${j.score.suffixe ?? ''} (${j.score.libelle})` : '–'),
    ));
  }
  t.append(corps);
  modale('Statistiques', el('div', { class: 'defile' }, t));
}

/* ----------------------------------- Menu ----------------------------------- */

export function afficherMenu(): void {
  quitterJeu();
  const d = donnees();
  let filtre = '';
  const zone = el('div', { class: 'grille-jeux-zone' });

  const carte = (j: Jeu) => {
    const favori = d.favoris.includes(j.id);
    const reprise = d.sauvegardes[j.id] != null;
    return el('div', { class: 'tuile' },
      el('button', { class: 'tuile-bouton', onclick: () => ouvrirJeu(j.id) },
        el('span', { class: 'tuile-icone', 'aria-hidden': true }, j.icone),
        el('span', { class: 'tuile-nom' }, j.nom),
        el('span', { class: 'tuile-desc' }, j.description),
        reprise ? el('span', { class: 'badge' }, 'Partie en cours') : null,
      ),
      el('button', {
        class: `etoile${favori ? ' actif' : ''}`, 'aria-label': favori ? 'Retirer des favoris' : 'Ajouter aux favoris', 'aria-pressed': favori,
        onclick: () => {
          d.favoris = favori ? d.favoris.filter((x) => x !== j.id) : [...d.favoris, j.id];
          enregistrer();
          dessiner();
        },
      }, favori ? '★' : '☆'),
    );
  };

  const section = (titre: string, liste: Jeu[]): HTMLElement[] =>
    liste.length === 0 ? [] : [el('section', {}, el('h2', {}, titre), el('div', { class: 'grille-jeux' }, ...liste.map(carte)))];

  const dessiner = () => {
    vider(zone);
    const q = filtre.trim().toLowerCase();
    if (q) {
      const trouves = jeux.filter((j) => j.nom.toLowerCase().includes(q) || j.famille.toLowerCase().includes(q));
      zone.append(...(trouves.length ? section(`Résultats (${trouves.length})`, trouves) : [el('p', { class: 'muet' }, 'Aucun jeu ne correspond.')]));
      return;
    }
    const favoris = d.favoris.map(jeuParId).filter((j): j is Jeu => !!j);
    const recents = d.recents.map(jeuParId).filter((j): j is Jeu => !!j).slice(0, 5);
    zone.append(...section('★ Favoris', favoris), ...section('Derniers joués', recents));
    for (const f of familles()) zone.append(...section(f, jeux.filter((j) => j.famille === f)));
  };

  const recherche = el('input', { type: 'search', placeholder: 'Rechercher un jeu…', 'aria-label': 'Rechercher un jeu', class: 'recherche',
    oninput: () => { filtre = recherche.value; dessiner(); } });

  vider(racine());
  racine().append(
    el('header', { class: 'barre' },
      el('h1', {}, '🎲 Mini-Jeux'),
      recherche,
      el('button', { class: 'btn', onclick: afficherStatistiques }, '📊 Statistiques'),
      el('button', { class: 'btn', onclick: afficherOptions }, '⚙️ Options'),
    ),
    el('main', { class: 'menu' }, zone),
  );
  dessiner();
}

/* ------------------------------------ Jeu ------------------------------------ */

function quitterJeu(): void {
  if (!jeuActif) return;
  const j = jeuActif;
  jeuActif = null;
  try {
    donnees().sauvegardes[j.id] = j.sauvegarder();
    if (donnees().sauvegardes[j.id] == null) delete donnees().sauvegardes[j.id];
    enregistrer();
  } finally {
    j.arreter();
  }
}

export function ouvrirJeu(id: string, nouvelle = false): void {
  const jeu = jeuParId(id);
  if (!jeu) return;
  quitterJeu();
  const d = donnees();
  d.recents = [id, ...d.recents.filter((x) => x !== id)].slice(0, 8);
  if (nouvelle) delete d.sauvegardes[id];
  enregistrer();

  const conteneur = el('div', { class: 'ecran-jeu' });
  const contexte: ContexteJeu = {
    conteneur,
    options: d.options,
    terminer: (r) => enregistrerResultat(jeu.id, jeu.score, r),
    sauvegardeAuto: () => {
      const etat = jeu.sauvegarder();
      if (etat == null) delete d.sauvegardes[jeu.id];
      else d.sauvegardes[jeu.id] = etat;
      enregistrer();
    },
    jouerSon: (n) => jouerSon(n, d.options.son),
    jouerNote: (f, duree = 0.25) => jouerNote(f, duree, d.options.son),
  };

  const boutons: Array<HTMLElement> = [
    el('button', { class: 'btn', onclick: afficherMenu }, '← Menu'),
    el('h1', {}, `${jeu.icone} ${jeu.nom}`),
    el('span', { class: 'espace' }),
    el('button', { class: 'btn', onclick: () => afficherRegles(jeu) }, '❓ Règles'),
  ];
  if (jeu.annuler) boutons.push(el('button', { class: 'btn', onclick: () => jeu.annuler?.() }, '↶ Annuler'));
  boutons.push(el('button', { class: 'btn primaire', onclick: () => { jeu.nouvellePartie(); contexte.sauvegardeAuto(); } }, 'Nouvelle partie'));

  vider(racine());
  racine().append(el('header', { class: 'barre' }, ...boutons), el('main', { class: 'zone-jeu' }, conteneur));

  const sauve = d.sauvegardes[id];
  if (sauve != null) {
    try {
      jeu.charger(sauve);
    } catch {
      delete d.sauvegardes[id];
    }
  }
  jeuActif = jeu;
  jeu.demarrer(contexte);
}

export function lancerApplication(): void {
  appliquerTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', appliquerTheme);
  window.addEventListener('beforeunload', quitterJeu);
  afficherMenu();
}

import { melanger, type Rng } from '../../shared/alea';
import { COULEURS, type Carte } from '../../shared/cartes';

/**
 * Rami à deux joueurs : 2 jeux de 52 cartes + 2 jokers, 13 cartes chacun.
 * Combinaisons : « brelan/carré » (même valeur, couleurs différentes, 3 ou 4 cartes) ou « suite » (≥ 3 cartes consécutives de même couleur ;
 * l'as vaut 1 avant le 2 ou 14 après le roi, pas de passage du roi à l'as). Un joker remplace n'importe quelle carte (un par combinaison).
 * Première pose : au moins 51 points posés dans le même tour.
 */
export const OUVERTURE = 51;
export const estJoker = (c: Carte): boolean => c.rang === 0;

export interface Combinaison { cartes: Carte[]; type: 'brelan' | 'suite'; points: number }
export interface Pose { cartes: Carte[]; type: 'brelan' | 'suite'; points: number; proprio: 0 | 1 }

const valeurRang = (r: number): number => (r === 1 ? 11 : r >= 10 ? 10 : r);

export function paquet106(rng: Rng = Math.random): Carte[] {
  const jeu: Carte[] = [];
  for (let k = 0; k < 2; k++) for (const couleur of COULEURS) for (let rang = 1; rang <= 13; rang++) jeu.push({ rang, couleur });
  jeu.push({ rang: 0, couleur: 'pique' }, { rang: 0, couleur: 'coeur' });
  return melanger(jeu, rng);
}

/** Valeur d'une carte restée en main (pour le décompte de fin). */
export const valeurMain = (c: Carte): number => (estJoker(c) ? 25 : valeurRang(c.rang));

/** Analyse un groupe de cartes : renvoie la combinaison valide (cartes ordonnées) ou null. */
export function analyser(cartes: readonly Carte[]): Combinaison | null {
  if (cartes.length < 3) return null;
  const jokers = cartes.filter(estJoker);
  const reelles = cartes.filter((c) => !estJoker(c));
  if (jokers.length > 1 || reelles.length < 2) return null;
  // brelan / carré
  if (cartes.length <= 4 && reelles.every((c) => c.rang === reelles[0]!.rang) && new Set(reelles.map((c) => c.couleur)).size === reelles.length) {
    const v = valeurRang(reelles[0]!.rang);
    return { cartes: [...reelles, ...jokers], type: 'brelan', points: v * cartes.length };
  }
  // suite
  if (new Set(reelles.map((c) => c.couleur)).size !== 1) return null;
  if (new Set(reelles.map((c) => c.rang)).size !== reelles.length) return null;
  const n = cartes.length;
  if (n > 14) return null;
  for (const asHaut of [false, true]) {
    const pos = (c: Carte) => (c.rang === 1 && asHaut ? 14 : c.rang);
    const rangs = reelles.map(pos);
    for (let debut = 1; debut + n - 1 <= 14; debut++) {
      if (!rangs.every((r) => r >= debut && r <= debut + n - 1)) continue;
      // positions de 1 à 14 : l'as ne compte que s'il est en 1 ou 14
      const ordre: Carte[] = [];
      let pts = 0;
      const jokerRestant = jokers.slice();
      for (let p = debut; p < debut + n; p++) {
        const reelle = reelles.find((c) => pos(c) === p);
        if (reelle) { ordre.push(reelle); pts += p === 14 || p === 1 ? (p === 14 ? 11 : 1) : valeurRang(p); }
        else { const j = jokerRestant.shift(); if (!j) return null; ordre.push(j); pts += p === 14 ? 11 : p === 1 ? 1 : valeurRang(p); }
      }
      if (ordre.length === n) return { cartes: ordre, type: 'suite', points: pts };
    }
  }
  return null;
}

/** Peut-on ajouter la carte à cette pose (brelan complété, suite prolongée) ? */
export function ajouter(pose: Pose, carte: Carte): Combinaison | null {
  const essai = analyser([...pose.cartes, carte]);
  if (!essai || essai.type !== pose.type) return null;
  if (pose.type === 'brelan' && essai.cartes.length > 4) return null;
  return essai;
}

/** Meilleure façon de poser des combinaisons disjointes avec la main (points maximum). */
export function meilleurePose(main: readonly Carte[]): Combinaison[] {
  const n = main.length;
  const candidats: Array<{ masque: number; comb: Combinaison; bas: number }> = [];
  const choisir = (debut: number, masque: number, cartes: Carte[]) => {
    if (cartes.length >= 3) {
      const comb = analyser(cartes);
      if (comb) candidats.push({ masque, comb, bas: Math.min(...cartes.map((c) => main.indexOf(c))) });
    }
    if (cartes.length >= 7) return;
    for (let i = debut; i < n; i++) choisir(i + 1, masque | (1 << i), [...cartes, main[i]!]);
  };
  choisir(0, 0, []);
  const parBas = new Map<number, typeof candidats>();
  for (const c of candidats) parBas.set(c.bas, [...(parBas.get(c.bas) ?? []), c]);
  const memo = new Map<number, { pts: number; liste: Combinaison[] }>();
  const f = (dispo: number): { pts: number; liste: Combinaison[] } => {
    if (!dispo) return { pts: 0, liste: [] };
    const m = memo.get(dispo);
    if (m) return m;
    const bas = 31 - Math.clz32(dispo & -dispo); // plus petit indice disponible
    let meilleur = f(dispo & ~(1 << bas)); // on laisse cette carte
    for (const c of parBas.get(bas) ?? []) {
      if ((c.masque & dispo) !== c.masque) continue;
      const r = f(dispo & ~c.masque);
      if (r.pts + c.comb.points > meilleur.pts) meilleur = { pts: r.pts + c.comb.points, liste: [c.comb, ...r.liste] };
    }
    memo.set(dispo, meilleur);
    return meilleur;
  };
  return f((1 << n) - 1).liste;
}

export interface Etat {
  talon: Carte[];
  defausse: Carte[];
  mains: [Carte[], Carte[]];
  poses: Pose[];
  ouvert: [boolean, boolean];
  tour: 0 | 1;
  phase: 'piocher' | 'jouer';
  provisoires: Pose[]; // poses du tour en cours avant la validation de l'ouverture
  fini: boolean;
  gagnant: 0 | 1 | null;
  points: [number, number]; // points restant en main à la fin
}

export function nouvelle(rng: Rng = Math.random): Etat {
  const p = paquet106(rng);
  const mains: [Carte[], Carte[]] = [p.splice(0, 13), p.splice(0, 13)];
  const defausse = [p.pop()!];
  return { talon: p, defausse, mains, poses: [], ouvert: [false, false], tour: 0, phase: 'piocher', provisoires: [], fini: false, gagnant: null, points: [0, 0] };
}

export function piocher(e: Etat, j: 0 | 1, depuisDefausse: boolean): Carte | null {
  if (e.tour !== j || e.phase !== 'piocher' || e.fini) return null;
  if (!depuisDefausse && !e.talon.length) {
    if (e.defausse.length < 2) return null;
    const haut = e.defausse.pop()!;
    e.talon = melanger(e.defausse);
    e.defausse = [haut];
  }
  const c = depuisDefausse ? e.defausse.pop() : e.talon.pop();
  if (!c) return null;
  e.mains[j].push(c);
  e.phase = 'jouer';
  return c;
}

/** Pose une combinaison depuis la main. La validation des 51 points se fait en fin de tour. */
export function poser(e: Etat, j: 0 | 1, cartes: Carte[]): Pose | null {
  if (e.tour !== j || e.phase !== 'jouer' || !cartes.every((c) => e.mains[j].includes(c))) return null;
  const comb = analyser(cartes);
  if (!comb) return null;
  e.mains[j] = e.mains[j].filter((c) => !cartes.includes(c));
  const pose: Pose = { ...comb, proprio: j };
  e.poses.push(pose);
  if (!e.ouvert[j]) e.provisoires.push(pose);
  return pose;
}

export function completer(e: Etat, j: 0 | 1, carte: Carte, pose: Pose): boolean {
  if (e.tour !== j || e.phase !== 'jouer' || !e.ouvert[j] && e.provisoires.reduce((s, p) => s + p.points, 0) < OUVERTURE) return false;
  if (!e.mains[j].includes(carte) || !e.poses.includes(pose)) return false;
  const essai = ajouter(pose, carte);
  if (!essai) return false;
  e.mains[j] = e.mains[j].filter((c) => c !== carte);
  pose.cartes = essai.cartes;
  pose.points = essai.points;
  return true;
}

function annulerProvisoires(e: Etat, j: 0 | 1): void {
  for (const p of e.provisoires) {
    e.poses = e.poses.filter((x) => x !== p);
    e.mains[j].push(...p.cartes);
  }
  e.provisoires = [];
}

/** Défausse une carte : termine le tour. Renvoie 'invalide' si l'ouverture (51 points) n'est pas atteinte (les poses reviennent en main). */
export function defausser(e: Etat, j: 0 | 1, carte: Carte): 'ok' | 'invalide' | 'refus' {
  if (e.tour !== j || e.phase !== 'jouer' || !e.mains[j].includes(carte)) return 'refus';
  let retour: 'ok' | 'invalide' = 'ok';
  if (!e.ouvert[j] && e.provisoires.length) {
    if (e.provisoires.reduce((s, p) => s + p.points, 0) >= OUVERTURE) e.ouvert[j] = true;
    else { annulerProvisoires(e, j); retour = 'invalide'; }
  }
  e.provisoires = [];
  if (!e.mains[j].includes(carte)) return retour; // la carte était dans une pose annulée : tour non terminé
  e.mains[j] = e.mains[j].filter((c) => c !== carte);
  e.defausse.push(carte);
  terminerTour(e, j);
  return retour;
}

/** Fin de tour sans défausse (main vidée par les poses). */
export function finirSansDefausse(e: Etat, j: 0 | 1): boolean {
  if (e.tour !== j || e.phase !== 'jouer' || e.mains[j].length) return false;
  if (!e.ouvert[j]) {
    if (e.provisoires.reduce((s, p) => s + p.points, 0) < OUVERTURE) { annulerProvisoires(e, j); return false; }
    e.ouvert[j] = true;
  }
  e.provisoires = [];
  terminerTour(e, j);
  return true;
}

function terminerTour(e: Etat, j: 0 | 1): void {
  if (!e.mains[j].length) {
    e.fini = true;
    e.gagnant = j;
    e.points = [e.mains[0].reduce((s, c) => s + valeurMain(c), 0), e.mains[1].reduce((s, c) => s + valeurMain(c), 0)];
    return;
  }
  e.tour = j === 0 ? 1 : 0;
  e.phase = 'piocher';
}

/** Tour complet de l'ordinateur ; renvoie un résumé. */
export function tourOrdi(e: Etat, niveau: 'facile' | 'moyen' | 'difficile', rng: Rng = Math.random, j: 0 | 1 = 1): string {
  const compte: string[] = [];
  // pioche : on prend la défausse si elle permet de former une combinaison
  const haut = e.defausse[e.defausse.length - 1];
  let prendreDefausse = false;
  if (haut && niveau !== 'facile') {
    const avant = meilleurePose(e.mains[j]).reduce((s, c) => s + c.points, 0);
    const apres = meilleurePose([...e.mains[j], haut]).reduce((s, c) => s + c.points, 0);
    prendreDefausse = apres > avant && (e.ouvert[j] || apres >= OUVERTURE - 5);
  }
  if (!piocher(e, j, prendreDefausse) && !piocher(e, j, true)) { e.fini = true; e.points = [e.mains[0].reduce((x, c) => x + valeurMain(c), 0), e.mains[1].reduce((x, c) => x + valeurMain(c), 0)]; return 'ne peut plus piocher : partie nulle'; }
  compte.push(prendreDefausse ? 'prend la défausse' : 'pioche');
  // pose
  const pose = meilleurePose(e.mains[j]);
  const total = pose.reduce((s, c) => s + c.points, 0);
  if (pose.length && (e.ouvert[j] || total >= OUVERTURE) && niveau !== 'facile' || (niveau === 'facile' && pose.length && (e.ouvert[j] || total >= OUVERTURE) && rng() < 0.6)) {
    for (const c of pose) poser(e, j, c.cartes);
    if (!e.ouvert[j]) { e.ouvert[j] = true; e.provisoires = []; }
    compte.push(`pose ${pose.length} combinaison${pose.length > 1 ? 's' : ''} (${total} pts)`);
  }
  // compléments
  if (e.ouvert[j]) {
    let change = true;
    while (change && e.mains[j].length > 1) {
      change = false;
      for (const c of [...e.mains[j]]) {
        const cible = e.poses.find((p) => ajouter(p, c));
        if (cible && e.mains[j].length > 1) { completer(e, j, c, cible); compte.push('complète une combinaison'); change = true; break; }
      }
    }
  }
  // défausse : carte isolée de plus forte valeur
  if (!e.mains[j].length) { finirSansDefausse(e, j); return compte.join(', ') + ' et sort !'; }
  const utilite = (c: Carte) => {
    const voisines = e.mains[j].filter((x) => x !== c && (x.rang === c.rang || (x.couleur === c.couleur && Math.abs(x.rang - c.rang) <= 2))).length;
    return voisines * 8 - valeurMain(c);
  };
  const aDefausser = [...e.mains[j]].sort((a, b) => utilite(a) - utilite(b))[0]!;
  defausser(e, j, aDefausser);
  compte.push('défausse');
  return compte.join(', ');
}

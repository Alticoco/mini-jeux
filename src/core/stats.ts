import { donnees, enregistrer } from './storage';
import type { InfoScore, ResultatPartie, StatsJeu } from './types';

export function statsDe(id: string): StatsJeu {
  return donnees().stats[id] ?? { parties: 0, victoires: 0 };
}

export function enregistrerResultat(id: string, info: InfoScore | undefined, r: ResultatPartie): void {
  const d = donnees();
  const s = (d.stats[id] ??= { parties: 0, victoires: 0 });
  s.parties += 1;
  if (r.victoire) s.victoires += 1;
  if (r.score !== undefined && info && (r.victoire || info.sens === 'haut')) {
    const meilleur = s.meilleur;
    if (meilleur === undefined || (info.sens === 'haut' ? r.score > meilleur : r.score < meilleur)) s.meilleur = r.score;
  }
  enregistrer();
}

export function tauxVictoire(s: StatsJeu): number {
  return s.parties === 0 ? 0 : Math.round((s.victoires / s.parties) * 100);
}

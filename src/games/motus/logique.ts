import { normaliser } from '../pendu/logique';

export type Etat = 'bien' | 'mal' | 'absent';

/** Évalue une proposition (règles de Wordle : doublons gérés). Les deux mots sont comparés sans accents. */
export function evaluer(proposition: string, mot: string): Etat[] {
  const p = [...normaliser(proposition)];
  const m = [...normaliser(mot)];
  const res: Etat[] = p.map(() => 'absent');
  const restants = new Map<string, number>();
  p.forEach((l, i) => {
    if (l === m[i]) res[i] = 'bien';
    else restants.set(m[i]!, (restants.get(m[i]!) ?? 0) + 1);
  });
  p.forEach((l, i) => {
    if (res[i] === 'bien') return;
    const n = restants.get(l) ?? 0;
    if (n > 0) { res[i] = 'mal'; restants.set(l, n - 1); }
  });
  return res;
}

/** Meilleur état connu de chaque lettre (pour colorer le clavier). */
export function etatsLettres(essais: readonly string[], mot: string): Map<string, Etat> {
  const rang: Record<Etat, number> = { absent: 0, mal: 1, bien: 2 };
  const res = new Map<string, Etat>();
  for (const e of essais) {
    const ev = evaluer(e, mot);
    [...normaliser(e)].forEach((l, i) => {
      const cur = res.get(l);
      if (!cur || rang[ev[i]!] > rang[cur]) res.set(l, ev[i]!);
    });
  }
  return res;
}

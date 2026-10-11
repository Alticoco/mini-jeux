export type Tours = number[][]; // chaque tour : disques du bas vers le haut (plus grand = plus large)

export function initiales(n: number): Tours {
  return [Array.from({ length: n }, (_, i) => n - i), [], []];
}

export function peutDeplacer(t: Tours, de: number, vers: number): boolean {
  const d = t[de]?.at(-1);
  if (d === undefined || de === vers) return false;
  const h = t[vers]?.at(-1);
  return h === undefined || d < h;
}

export function deplacer(t: Tours, de: number, vers: number): boolean {
  if (!peutDeplacer(t, de, vers)) return false;
  t[vers]!.push(t[de]!.pop()!);
  return true;
}

export function gagne(t: Tours, n: number): boolean {
  return t[2]!.length === n;
}

export function minimumCoups(n: number): number {
  return 2 ** n - 1;
}

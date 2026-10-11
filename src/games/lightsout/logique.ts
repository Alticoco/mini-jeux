import { entier, type Rng } from '../../shared/alea';

export const N = 5;

export function basculer(g: boolean[], i: number): void {
  const l = Math.floor(i / N);
  const c = i % N;
  for (const [dl, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nl = l + dl;
    const nc = c + dc;
    if (nl >= 0 && nl < N && nc >= 0 && nc < N) g[nl * N + nc] = !g[nl * N + nc];
  }
}

export function eteint(g: boolean[]): boolean {
  return g.every((v) => !v);
}

/** Part d'une grille éteinte et appuie au hasard : toujours soluble. */
export function melanger(appuis: number, rng: Rng = Math.random): boolean[] {
  let g: boolean[] = [];
  do {
    g = Array<boolean>(N * N).fill(false);
    for (let k = 0; k < appuis; k++) basculer(g, entier(N * N, rng));
  } while (eteint(g));
  return g;
}

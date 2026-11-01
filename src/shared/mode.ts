import { el } from './dom';

/** Mode de jeu des jeux à deux : contre l'ordinateur ou à deux sur le même PC. */
export type Mode = 'ordi' | 'deux';

/** Boutons « Contre l'ordinateur / À deux » ; `surChoix` est appelé avec le nouveau mode. */
export function selecteurMode(mode: Mode, surChoix: (m: Mode) => void): HTMLElement {
  const bouton = (m: Mode, texte: string): HTMLElement =>
    el('button', { class: `btn${m === mode ? ' actif' : ''}`, onclick: () => { if (m !== mode) surChoix(m); } }, texte);
  return el('div', { class: 'choix' }, el('span', {}, 'Mode :'), bouton('ordi', "Contre l'ordinateur"), bouton('deux', 'À deux'));
}

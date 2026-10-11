import { el } from './dom';
import { elCarte, type Carte } from './cartes';

export interface ItemColonne {
  carte: Carte | null; // null = face cachée
  choisie?: boolean;
  onclick?: () => void;
}

export interface OptionsColonne {
  /** Décalage vertical (en px à l'échelle 1) entre cartes cachées / visibles. */
  cache?: number;
  visible?: number;
  /** Clic sur l'emplacement vide ou le fond de la colonne. */
  onFond?: () => void;
}

const HAUTEUR_CARTE = 78 * 1.4;

/** Colonne de cartes empilées avec chevauchement (utilisée par FreeCell, Spider…). */
export function colonneCartes(items: ItemColonne[], o: OptionsColonne = {}): HTMLElement {
  const dc = o.cache ?? 18;
  const dv = o.visible ?? 28;
  const zoom = 'var(--zoom-cartes)';
  const col = el('div', { class: 'k-colonne' });
  col.addEventListener('click', (ev) => { if (ev.target === col) o.onFond?.(); });
  if (!items.length) col.append(el('div', { class: 'emplacement', onclick: () => o.onFond?.() }));
  let y = 0;
  items.forEach((it, i) => {
    const style = `position:absolute;left:0;top:calc(${y}px * ${zoom})`;
    const c = it.carte
      ? elCarte(it.carte, { class: it.choisie ? 'choisie' : '', style, onclick: it.onclick })
      : elCarte(null, { style, onclick: it.onclick });
    col.append(c);
    if (i < items.length - 1) y += it.carte ? dv : dc;
  });
  col.style.height = `calc(${y + HAUTEUR_CARTE}px * ${zoom})`;
  return col;
}

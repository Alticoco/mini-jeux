type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

/** Création d'élément concise : el('button', { class: 'btn', onclick: fn }, 'Texte'). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...enfants: Array<Node | string | null | undefined | false>
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') e.addEventListener(k.replace(/^on/, ''), v as EventListener);
    else if (k === 'class') e.className = String(v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of enfants) {
    if (c === null || c === undefined || c === false) continue;
    e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

export function vider(e: HTMLElement): void {
  e.replaceChildren();
}

export function formaterTemps(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const sec = secondes % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

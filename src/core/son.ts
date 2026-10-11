import type { NomSon } from './types';

let audio: AudioContext | null = null;

const notes: Record<NomSon, Array<[number, number]>> = {
  clic: [[520, 0.04]],
  pose: [[300, 0.06]],
  gagne: [[523, 0.12], [659, 0.12], [784, 0.2]],
  perdu: [[330, 0.15], [220, 0.25]],
  erreur: [[160, 0.12]],
};

/** Petits bips synthétisés : aucun fichier audio à embarquer. */
export function jouerSon(nom: NomSon, actif: boolean): void {
  if (!actif) return;
  try {
    audio ??= new AudioContext();
    let t = audio.currentTime;
    for (const [freq, duree] of notes[nom]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + duree);
      t += duree;
    }
  } catch {
    /* pas d'audio disponible */
  }
}

function kanalAnteil(wert) {
  const anteil = wert / 255;
  if (anteil <= 0.03928) return anteil / 12.92;
  return Math.pow((anteil + 0.055) / 1.055, 2.4);
}

function leuchtdichte(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * kanalAnteil(r) + 0.7152 * kanalAnteil(g) + 0.0722 * kanalAnteil(b);
}

export function kontrastverhaeltnis(hexA, hexB) {
  const a = leuchtdichte(hexA);
  const b = leuchtdichte(hexB);
  const heller = Math.max(a, b);
  const dunkler = Math.min(a, b);
  return (heller + 0.05) / (dunkler + 0.05);
}

export function lesbareSchriftfarbe(hex) {
  if (kontrastverhaeltnis(hex, '#ffffff') > kontrastverhaeltnis(hex, '#111111')) return '#ffffff';
  return '#111111';
}

export function dunklereFarbe(hex, anteil = 0.24) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const kanal = (wert) => Math.round(wert * (1 - anteil)).toString(16).padStart(2, '0');
  return `#${kanal(r)}${kanal(g)}${kanal(b)}`;
}

export function blasserFarbe(hex, anteil = 0.5) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const grau = 0.299 * r + 0.587 * g + 0.114 * b;
  const kanal = (wert) => Math.round(wert * (1 - anteil) + grau * anteil);
  let rot = kanal(r);
  let gruen = kanal(g);
  let blau = kanal(b);
  const alsHex = () => `#${[rot, gruen, blau].map((wert) => wert.toString(16).padStart(2, '0')).join('')}`;
  while (kontrastverhaeltnis(alsHex(), lesbareSchriftfarbe(alsHex())) < 4.5) {
    rot = Math.round(rot + (255 - rot) * 0.1);
    gruen = Math.round(gruen + (255 - gruen) * 0.1);
    blau = Math.round(blau + (255 - blau) * 0.1);
  }
  return alsHex();
}

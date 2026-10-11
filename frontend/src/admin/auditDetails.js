import { formatEuro } from '../api.js';

export function detailZeilen(details, texte) {
  const zeilen = [];
  for (const [feld, wert] of Object.entries(details.werte || {})) {
    if (feld === 'positionen') {
      for (const position of wert) zeilen.push(positionsZeile(position, texte));
      continue;
    }
    zeilen.push(`${feldLabel(feld, texte)}: ${wertText(feld, wert, texte)}`);
  }
  for (const [feld, aenderung] of Object.entries(details.aenderungen || {})) {
    zeilen.push(
      `${feldLabel(feld, texte)}: ${wertText(feld, aenderung.vorher, texte)} → ${wertText(feld, aenderung.nachher, texte)}`
    );
  }
  return zeilen;
}

function feldLabel(feld, texte) {
  return texte.felder[feld] ?? feld;
}

function wertText(feld, wert, texte) {
  if (wert === null || wert === undefined) return texte.keineAngabe;
  if (feld === 'aktiv') return wert ? texte.aktiv : texte.inaktiv;
  if (feld === 'status') return texte.status[wert] ?? wert;
  if (feld === 'warnung_bestaetigt') return wert ? texte.ja : texte.nein;
  if (feld === 'tv_design') return texte.tvDesign[wert] ?? wert;
  if (feld.endsWith('_cent')) return formatEuro(wert);
  if (Array.isArray(wert)) return wert.length === 0 ? texte.keine : wert.join(', ');
  return String(wert);
}

function positionsZeile(position, texte) {
  const beilagenText = position.beilagen.length > 0 ? ` (${position.beilagen.join(', ')})` : '';
  const text = texte.positionsAnschluss
    .replace('{nummer}', position.nummer)
    .replace('{artikel}', position.artikel_name)
    .replace('{beilagen}', beilagenText)
    .replace('{preis}', formatEuro(position.preis_cent));
  return `${feldLabel('positionen', texte)}: ${text}`;
}

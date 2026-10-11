import { de, tr } from './sprache/zeitAnzeige.js';

export function minutenSeit(iso, jetzt) {
  return Math.floor((jetzt - new Date(iso).getTime()) / 60000);
}

export function alterText(iso, jetzt, sprache = 'de') {
  const texte = sprache === 'tr' ? tr : de;
  const minuten = minutenSeit(iso, jetzt);
  if (minuten < 1) return texte.geradeEben;
  const praefix = texte.vorPraefix ? `${texte.vorPraefix} ` : '';
  return `${praefix}${minuten} ${texte.minSuffix}`;
}

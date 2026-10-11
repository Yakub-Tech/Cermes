import { de, tr } from '../sprache/artikelSortierung.js';

export function sortierOptionen(sprache = 'de') {
  const texte = sprache === 'tr' ? tr : de;
  return [
    { wert: 'alphabetisch', text: texte.alphabetisch },
    { wert: 'aufsteigend', text: texte.aufsteigend },
    { wert: 'absteigend', text: texte.absteigend },
  ];
}

export function artikelSortieren(artikel, sortierung, wertSchluessel) {
  const sortiert = [...artikel];

  if (sortierung === 'alphabetisch') {
    sortiert.sort((a, b) => a.artikel_name.localeCompare(b.artikel_name, 'de'));
  } else if (sortierung === 'aufsteigend') {
    sortiert.sort((a, b) => a[wertSchluessel] - b[wertSchluessel]);
  } else {
    sortiert.sort((a, b) => b[wertSchluessel] - a[wertSchluessel]);
  }

  return sortiert;
}

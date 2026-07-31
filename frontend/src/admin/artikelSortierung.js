export const SORTIER_OPTIONEN = [
  { wert: 'alphabetisch', text: 'Alphabetisch' },
  { wert: 'aufsteigend', text: 'Aufsteigend' },
  { wert: 'absteigend', text: 'Absteigend' },
];

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

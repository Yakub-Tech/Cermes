export function staerkstesElement(zeilen, wertSchluessel) {
  if (zeilen.length === 0) return null;

  return zeilen.reduce((staerkste, zeile) => (
    zeile[wertSchluessel] > staerkste[wertSchluessel] ? zeile : staerkste
  ));
}

export function gruppiereNachArtikel(kaertchen) {
  const gruppenNachName = new Map();
  for (const karte of kaertchen) {
    const gruppe = gruppenNachName.get(karte.artikel_name) ?? [];
    gruppe.push(karte);
    gruppenNachName.set(karte.artikel_name, gruppe);
  }

  const namen = [...gruppenNachName.keys()];
  namen.sort((a, b) => a.localeCompare(b, 'de'));

  return namen.map((artikelName) => ({
    artikelName,
    kaertchen: gruppenNachName.get(artikelName),
  }));
}

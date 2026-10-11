export function kaertchenSchluessel(kaertchen) {
  return `${kaertchen.nummer}-${kaertchen.artikel_name}`;
}

export function findeNeueSchluessel(alteListe, neueListe) {
  if (alteListe === null) return [];
  const alteSchluessel = new Set(alteListe.map(kaertchenSchluessel));
  return neueListe
    .map(kaertchenSchluessel)
    .filter((schluessel) => !alteSchluessel.has(schluessel));
}

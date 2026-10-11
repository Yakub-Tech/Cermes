export function offeneMengen(kaertchen) {
  const jeArtikel = new Map();
  for (const k of kaertchen) {
    const eintrag = jeArtikel.get(k.artikel_name);
    if (!eintrag) {
      jeArtikel.set(k.artikel_name, { artikel_name: k.artikel_name, artikel_name_tr: k.artikel_name_tr, anzahl: 1 });
    } else {
      eintrag.anzahl += 1;
    }
  }
  return [...jeArtikel.values()].sort((a, b) => a.artikel_name.localeCompare(b.artikel_name, 'de'));
}

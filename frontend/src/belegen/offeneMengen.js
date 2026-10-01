import { minutenSeit } from '../zeitAnzeige.js';

export function offeneMengen(kaertchen) {
  const jeArtikel = new Map();
  for (const k of kaertchen) {
    const eintrag = jeArtikel.get(k.artikel_name);
    if (!eintrag) {
      jeArtikel.set(k.artikel_name, {
        artikel_name: k.artikel_name,
        artikel_name_tr: k.artikel_name_tr,
        anzahl: 1,
        aeltestes_seit: k.erstellt_am,
      });
      continue;
    }
    eintrag.anzahl += 1;
    if (new Date(k.erstellt_am) < new Date(eintrag.aeltestes_seit)) eintrag.aeltestes_seit = k.erstellt_am;
  }
  return [...jeArtikel.values()].sort((a, b) => a.artikel_name.localeCompare(b.artikel_name, 'de'));
}

export function wartezeitText(iso, jetzt, texte) {
  const minuten = minutenSeit(iso, jetzt);
  if (minuten < 1) return '';
  return `${texte.seitPraefix}${minuten}${texte.seitSuffix}`;
}

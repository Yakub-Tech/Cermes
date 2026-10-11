import { de, tr } from '../sprache/geparkt.js';

export const PARKPLAETZE = 5;

export function warenkorbParken(geparkte, positionen, zeitpunkt) {
  if (positionen.length === 0) return { geparkte, fehler: null };
  if (geparkte.length >= PARKPLAETZE) {
    return { geparkte, fehler: { de: de.voll, tr: tr.voll } };
  }
  const hoechsteId = geparkte.reduce((hoechste, eintrag) => Math.max(hoechste, eintrag.id), 0);
  const eintrag = {
    id: hoechsteId + 1,
    zeitpunkt,
    positionen: positionen.map((position) => ({
      artikel_id: position.artikel.id,
      artikel_name: position.artikel.name,
      artikel_name_tr: position.artikel.name_tr,
      preis_cent: position.artikel.preis_cent,
      beilagen_ids: position.beilagen.map((beilage) => beilage.id),
      sonderwunsch: position.sonderwunsch,
      menge: position.menge,
    })),
  };
  return { geparkte: [...geparkte, eintrag], fehler: null };
}

export function eintragZurueckholen(eintrag, artikelListe, naechsterSchluessel) {
  const positionen = [];
  const entfernt = [];
  let preiseGeaendert = false;
  for (const gespeichert of eintrag.positionen) {
    const artikel = artikelListe.find((a) => a.id === gespeichert.artikel_id);
    const beilagen = [];
    let alleBeilagenDa = true;
    for (const beilageId of gespeichert.beilagen_ids) {
      const beilage = artikel && artikel.beilagen.find((b) => b.id === beilageId);
      if (beilage && beilage.aktiv) {
        beilagen.push(beilage);
      } else {
        alleBeilagenDa = false;
      }
    }
    if (!artikel || artikel.ausverkauft || !alleBeilagenDa) {
      entfernt.push({ artikel_name: gespeichert.artikel_name, artikel_name_tr: gespeichert.artikel_name_tr });
      continue;
    }
    if (artikel.preis_cent !== gespeichert.preis_cent) preiseGeaendert = true;
    positionen.push({
      schluessel: naechsterSchluessel(),
      artikel,
      beilagen,
      sonderwunsch: gespeichert.sonderwunsch,
      menge: gespeichert.menge,
    });
  }
  return { positionen, entfernt, preiseGeaendert };
}

export function geparkteAlsText(geparkte) {
  return JSON.stringify(geparkte);
}

function istGueltigePosition(position) {
  if (position === null || typeof position !== 'object') return false;
  if (!Number.isInteger(position.artikel_id)) return false;
  if (typeof position.artikel_name !== 'string') return false;
  const tuerkischerNameOk = position.artikel_name_tr === undefined
    || position.artikel_name_tr === null
    || typeof position.artikel_name_tr === 'string';
  if (!tuerkischerNameOk) return false;
  if (!Number.isInteger(position.preis_cent)) return false;
  if (!Number.isInteger(position.menge) || position.menge < 1) return false;
  if (typeof position.sonderwunsch !== 'string') return false;
  if (!Array.isArray(position.beilagen_ids)) return false;
  return position.beilagen_ids.every(Number.isInteger);
}

function istGueltigerEintrag(eintrag) {
  if (eintrag === null || typeof eintrag !== 'object') return false;
  if (!Number.isInteger(eintrag.id)) return false;
  if (!Number.isFinite(eintrag.zeitpunkt)) return false;
  if (!Array.isArray(eintrag.positionen) || eintrag.positionen.length === 0) return false;
  return eintrag.positionen.every(istGueltigePosition);
}

export function geparkteAusText(text) {
  try {
    const liste = JSON.parse(text);
    if (!Array.isArray(liste)) return [];
    return liste.filter(istGueltigerEintrag);
  } catch {
    return [];
  }
}

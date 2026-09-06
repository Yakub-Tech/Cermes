async function anfrage(pfad, optionen = {}) {
  let antwort;
  try {
    antwort = await fetch(pfad, optionen);
  } catch {
    throw new Error('Der Server ist gerade nicht erreichbar. Bitte kurz warten.');
  }
  if (antwort.status === 204) return null;
  const daten = await antwort.json().catch(() => ({}));
  if (!antwort.ok) {
    const fehler = new Error(daten.fehler || 'Es ist ein unbekannter Fehler aufgetreten.');
    fehler.status = antwort.status;
    fehler.daten = daten;
    throw fehler;
  }
  return daten;
}

export function apiGet(pfad) {
  return anfrage(pfad);
}

export function apiPost(pfad, daten) {
  return anfrage(pfad, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(daten ?? {}),
  });
}

export function apiPut(pfad, daten) {
  return anfrage(pfad, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(daten ?? {}),
  });
}

export function apiDelete(pfad) {
  return anfrage(pfad, { method: 'DELETE' });
}

export function apiUpload(pfad, formData) {
  return anfrage(pfad, { method: 'POST', body: formData });
}

export function formatEuro(cent) {
  const euro = (cent / 100).toFixed(2).replace('.', ',');
  return `${euro} €`;
}

export function euroZuCent(text) {
  const bereinigt = String(text).trim().replace(',', '.');
  if (bereinigt === '' || !/^\d+(\.\d{1,2})?$/.test(bereinigt)) return null;
  return Math.round(Number(bereinigt) * 100);
}

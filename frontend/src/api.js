const WARTEZEIT_MS = 15000;
const WARTEZEIT_UPLOAD_MS = 120000;

function wartefristFehler(schreibend) {
  return new Error(schreibend
    ? 'Der Server antwortet nicht. Bitte zuerst prüfen, ob die Aktion angekommen ist, bevor sie wiederholt wird.'
    : 'Der Server antwortet nicht. Bitte kurz warten und noch einmal versuchen.');
}

function unvollstaendigFehler(schreibend) {
  return new Error(schreibend
    ? 'Die Antwort des Servers kam unvollständig an. Bitte zuerst prüfen, ob die Aktion angekommen ist, bevor sie wiederholt wird.'
    : 'Die Antwort des Servers kam unvollständig an. Bitte noch einmal versuchen.');
}

async function anfrage(pfad, optionen = {}) {
  const { wartezeitMs = WARTEZEIT_MS, ...fetchOptionen } = optionen;
  const schreibend = fetchOptionen.method !== undefined;
  const abbruch = new AbortController();
  const timer = setTimeout(() => abbruch.abort(), wartezeitMs);
  try {
    let antwort;
    try {
      antwort = await fetch(pfad, { ...fetchOptionen, signal: abbruch.signal });
    } catch (f) {
      if (f.name === 'AbortError') throw wartefristFehler(schreibend);
      throw new Error('Der Server ist gerade nicht erreichbar. Bitte kurz warten.');
    }
    if (antwort.status === 204) return null;
    let daten;
    try {
      daten = await antwort.json();
    } catch (f) {
      if (f.name === 'AbortError') throw wartefristFehler(schreibend);
      if (antwort.ok) throw unvollstaendigFehler(schreibend);
      daten = {};
    }
    if (!antwort.ok) {
      const fehler = new Error(daten.fehler || 'Es ist ein unbekannter Fehler aufgetreten.');
      fehler.status = antwort.status;
      fehler.daten = daten;
      throw fehler;
    }
    return daten;
  } finally {
    clearTimeout(timer);
  }
}

export function apiGet(pfad, optionen) {
  return anfrage(pfad, optionen);
}

export function apiPost(pfad, daten, optionen) {
  return anfrage(pfad, {
    ...optionen,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(daten ?? {}),
  });
}

export function apiPut(pfad, daten, optionen) {
  return anfrage(pfad, {
    ...optionen,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(daten ?? {}),
  });
}

export function apiDelete(pfad) {
  return anfrage(pfad, { method: 'DELETE' });
}

export function apiUpload(pfad, formData) {
  return anfrage(pfad, { method: 'POST', body: formData, wartezeitMs: WARTEZEIT_UPLOAD_MS });
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

export function passwortRegelFehler(passwort) {
  if (typeof passwort !== 'string' || passwort.length < 8) {
    return 'Das Passwort muss mindestens 8 Zeichen haben.';
  }
  if (Buffer.byteLength(passwort, 'utf8') > 72) {
    return 'Das Passwort ist zu lang. Bitte höchstens 72 Zeichen verwenden (Umlaute zählen doppelt).';
  }
  return null;
}

export function buchungNachFehlerUnklar(bisherUnklar, fehler) {
  if (fehler.status === undefined) return true;
  if (!bisherUnklar) return false;
  if (fehler.status === 400 || fehler.status === 409) return false;
  return true;
}

const MAXIMALE_SEITE = 400;

export async function logoAlsPng() {
  try {
    const antwort = await fetch('/logo/aktuell');
    if (!antwort.ok) return null;
    const bild = await createImageBitmap(await antwort.blob());
    const leinwand = document.createElement('canvas');
    const faktor = Math.min(1, MAXIMALE_SEITE / Math.max(bild.width, bild.height));
    const breite = Math.round(bild.width * faktor);
    const hoehe = Math.round(bild.height * faktor);
    leinwand.width = breite;
    leinwand.height = hoehe;
    leinwand.getContext('2d').drawImage(bild, 0, 0, breite, hoehe);
    const dataUrl = leinwand.toDataURL('image/png');
    return { dataUrl, breite, hoehe };
  } catch {
    return null;
  }
}

export async function logoAlsPng() {
  try {
    const antwort = await fetch('/logo/aktuell');
    if (!antwort.ok) return null;
    const bild = await createImageBitmap(await antwort.blob());
    const leinwand = document.createElement('canvas');
    leinwand.width = bild.width;
    leinwand.height = bild.height;
    leinwand.getContext('2d').drawImage(bild, 0, 0);
    const dataUrl = leinwand.toDataURL('image/png');
    return { dataUrl, breite: bild.width, hoehe: bild.height };
  } catch {
    return null;
  }
}

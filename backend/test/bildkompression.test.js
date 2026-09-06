import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { komprimiereBild } from '../src/bildkompression.js';

async function erzeugeUndurchsichtigesPng(breite, hoehe) {
  return sharp({
    create: { width: breite, height: hoehe, channels: 3, background: { r: 100, g: 150, b: 200 } },
  }).png().toBuffer();
}

async function erzeugeDurchsichtigesPng(breite, hoehe) {
  return sharp({
    create: { width: breite, height: hoehe, channels: 4, background: { r: 100, g: 150, b: 200, alpha: 0.5 } },
  }).png().toBuffer();
}

test('Große Bilder werden auf die maximale Breite verkleinert', async () => {
  const grossesBild = await erzeugeUndurchsichtigesPng(3000, 2000);
  const ergebnis = await komprimiereBild(grossesBild, 'image/png');
  const metadaten = await sharp(ergebnis.puffer).metadata();
  assert.equal(metadaten.width, 1600);
  assert.equal(metadaten.height, 1067);
  assert.ok(ergebnis.puffer.length < grossesBild.length);
});

test('Kleine Bilder werden nicht vergrößert', async () => {
  const kleinesBild = await erzeugeUndurchsichtigesPng(400, 300);
  const ergebnis = await komprimiereBild(kleinesBild, 'image/png');
  const metadaten = await sharp(ergebnis.puffer).metadata();
  assert.equal(metadaten.width, 400);
  assert.equal(metadaten.height, 300);
});

test('PNG ohne Transparenz wird als JPEG gespeichert, da Fotos so am kleinsten werden', async () => {
  const foto = await erzeugeUndurchsichtigesPng(2000, 1000);
  const ergebnis = await komprimiereBild(foto, 'image/png');
  assert.equal(ergebnis.endung, 'jpg');
  assert.equal((await sharp(ergebnis.puffer).metadata()).format, 'jpeg');
  assert.ok(ergebnis.puffer.length < foto.length);
});

test('PNG mit Transparenz bleibt PNG, damit der durchsichtige Bereich erhalten bleibt', async () => {
  const logo = await erzeugeDurchsichtigesPng(2000, 1000);
  const ergebnis = await komprimiereBild(logo, 'image/png');
  assert.equal(ergebnis.endung, 'png');
  const metadaten = await sharp(ergebnis.puffer).metadata();
  assert.equal(metadaten.format, 'png');
  assert.equal(metadaten.hasAlpha, true);
});

test('JPEG- und WebP-Bilder bleiben in ihrem Format', async () => {
  const bild = await erzeugeUndurchsichtigesPng(2000, 1000);
  const jpegBild = await sharp(bild).jpeg().toBuffer();
  const ergebnisJpeg = await komprimiereBild(jpegBild, 'image/jpeg');
  assert.equal(ergebnisJpeg.endung, 'jpg');
  assert.equal((await sharp(ergebnisJpeg.puffer).metadata()).format, 'jpeg');

  const webpBild = await sharp(bild).webp().toBuffer();
  const ergebnisWebp = await komprimiereBild(webpBild, 'image/webp');
  assert.equal(ergebnisWebp.endung, 'webp');
  assert.equal((await sharp(ergebnisWebp.puffer).metadata()).format, 'webp');
});

test('Ungültige Bilddaten führen zu einem Fehler statt zu einem Absturz', async () => {
  await assert.rejects(() => komprimiereBild(Buffer.from('kein bild'), 'image/png'));
});

test('Handyfotos mit gedrehtem EXIF-Tag werden aufrecht gespeichert', async () => {
  const querformat = await erzeugeUndurchsichtigesPng(200, 100);
  const jpegMitDrehung = await sharp(querformat).jpeg().withMetadata({ orientation: 6 }).toBuffer();

  const ergebnis = await komprimiereBild(jpegMitDrehung, 'image/jpeg');
  const metadaten = await sharp(ergebnis.puffer).metadata();

  assert.equal(metadaten.width, 100);
  assert.equal(metadaten.height, 200);
  assert.equal(metadaten.orientation, undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { frischeApp, angemeldeterAgent } from './helfer.js';

const GUELTIGES_MINI_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

test('Artikel anlegen, zuordnen, deaktivieren, löschen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const ketchup = (await admin.post('/api/beilagen').send({ name: 'Ketchup' })).body;
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350,
    einkaufskosten_cent: 120, sortierung: 1, beilagen_ids: [ketchup.id],
  })).body;
  assert.equal(pommes.naechste_nummer, 1);

  let liste = (await admin.get('/api/artikel')).body;
  assert.deepEqual(liste[0].beilagen_ids, [ketchup.id]);
  assert.equal(liste[0].hoechste_nummer_heute, null);

  await admin.put(`/api/artikel/${pommes.id}`).send({ ...pommes, aktiv: 0, beilagen_ids: [] });
  liste = (await admin.get('/api/artikel')).body;
  assert.equal(liste[0].aktiv, 0);
  assert.deepEqual(liste[0].beilagen_ids, []);

  await admin.delete(`/api/artikel/${pommes.id}`);
  assert.equal((await admin.get('/api/artikel')).body.length, 0);
  assert.equal(db.prepare('SELECT geloescht FROM artikel WHERE id = ?').get(pommes.id).geloescht, 1);
});

test('Artikel-Validierung lehnt Unsinn verständlich ab', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const ohneName = await admin.post('/api/artikel').send({ name: '', farbe: '#ff0000', preis_cent: 100 });
  assert.equal(ohneName.status, 400);
  assert.ok(ohneName.body.fehler.length > 0);
  const falscheFarbe = await admin.post('/api/artikel').send({ name: 'Cola', farbe: 'rot', preis_cent: 100 });
  assert.equal(falscheFarbe.status, 400);
  const falscherPreis = await admin.post('/api/artikel').send({ name: 'Cola', farbe: '#ff0000', preis_cent: -5 });
  assert.equal(falscherPreis.status, 400);
});

test('Artikel: türkischer Name optional, leerer String wird zu null normalisiert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  const mitTr = (await admin.post('/api/artikel').send({
    name: 'Döner', name_tr: 'Döner', farbe: '#f5c211', preis_cent: 500, beilagen_ids: [], sortierung: 1,
  })).body;
  assert.equal(mitTr.name_tr, 'Döner');

  const leererString = (await admin.post('/api/artikel').send({
    name: 'Cola', name_tr: '   ', farbe: '#333333', preis_cent: 250, beilagen_ids: [], sortierung: 2,
  })).body;
  assert.equal(leererString.name_tr, null);

  const ohneFeld = (await admin.post('/api/artikel').send({
    name: 'Wasser', farbe: '#00aaff', preis_cent: 150, beilagen_ids: [], sortierung: 3,
  })).body;
  assert.equal(ohneFeld.name_tr, null);

  const geaendert = (await admin.put(`/api/artikel/${mitTr.id}`).send({
    ...mitTr, name_tr: 'Dürüm',
  })).body;
  assert.equal(geaendert.name_tr, 'Dürüm');
});

test('Beilage: türkischer Name optional, leerer String wird zu null normalisiert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  const mitTr = (await admin.post('/api/beilagen').send({ name: 'Ketchup', name_tr: 'Ketçap' })).body;
  assert.equal(mitTr.name_tr, 'Ketçap');

  const ohneFeld = (await admin.post('/api/beilagen').send({ name: 'Mayo' })).body;
  assert.equal(ohneFeld.name_tr, null);

  const geaendert = (await admin.put(`/api/beilagen/${mitTr.id}`).send({
    name: 'Ketchup', name_tr: '  ', aktiv: 1,
  })).body;
  assert.equal(geaendert.name_tr, null);
});

test('Artikel: PUT ohne name_tr-Feld (z. B. nur Aktiv-Umschalten) lässt bestehenden türkischen Namen unverändert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  const mitTr = (await admin.post('/api/artikel').send({
    name: 'Döner', name_tr: 'Döner', farbe: '#f5c211', preis_cent: 500, beilagen_ids: [], sortierung: 1,
  })).body;
  assert.equal(mitTr.name_tr, 'Döner');

  const nurAktivUmgeschaltet = { ...mitTr, aktiv: 0 };
  delete nurAktivUmgeschaltet.name_tr;
  const geaendert = (await admin.put(`/api/artikel/${mitTr.id}`).send(nurAktivUmgeschaltet)).body;

  assert.equal(geaendert.name_tr, 'Döner');
  assert.equal(geaendert.aktiv, 0);
});

test('Beilage: PUT ohne name_tr-Feld (Aktiv-Umschalter) lässt bestehenden türkischen Namen unverändert', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');

  const mitTr = (await admin.post('/api/beilagen').send({ name: 'Ketchup', name_tr: 'Ketçap' })).body;
  assert.equal(mitTr.name_tr, 'Ketçap');

  const geaendert = (await admin.put(`/api/beilagen/${mitTr.id}`).send({
    name: mitTr.name, aktiv: mitTr.aktiv ? 0 : 1,
  })).body;

  assert.equal(geaendert.name_tr, 'Ketçap');
  assert.equal(geaendert.aktiv, 0);
});

test('Verwaltung sieht keine Einkaufskosten und kann sie nicht setzen oder ändern', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const verwaltung = await angemeldeterAgent(app, db, 'verwaltung');

  const vonVerwaltungAngelegt = (await verwaltung.post('/api/artikel').send({
    name: 'Cola', farbe: '#333333', preis_cent: 250,
    einkaufskosten_cent: 999, beilagen_ids: [], sortierung: 1,
  })).body;
  assert.equal(vonVerwaltungAngelegt.einkaufskosten_cent, undefined);
  assert.equal(
    db.prepare('SELECT einkaufskosten_cent FROM artikel WHERE id = ?').get(vonVerwaltungAngelegt.id).einkaufskosten_cent,
    null
  );

  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350,
    einkaufskosten_cent: 120, beilagen_ids: [], sortierung: 2,
  })).body;
  assert.equal(pommes.einkaufskosten_cent, 120);

  const listeVerwaltung = (await verwaltung.get('/api/artikel')).body;
  const pommesFuerVerwaltung = listeVerwaltung.find((a) => a.name === 'Pommes');
  assert.equal(pommesFuerVerwaltung.einkaufskosten_cent, undefined);

  const geaendert = (await verwaltung.put(`/api/artikel/${pommes.id}`).send({
    ...pommesFuerVerwaltung, einkaufskosten_cent: 1,
  })).body;
  assert.equal(geaendert.einkaufskosten_cent, undefined);
  assert.equal(
    db.prepare('SELECT einkaufskosten_cent FROM artikel WHERE id = ?').get(pommes.id).einkaufskosten_cent,
    120
  );
});

test('Beilage bearbeiten und Soft-Delete', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const mayo = (await admin.post('/api/beilagen').send({ name: 'Mayo' })).body;

  await admin.put(`/api/beilagen/${mayo.id}`).send({ name: 'Mayonnaise', aktiv: 0 });
  let liste = (await admin.get('/api/beilagen')).body;
  assert.equal(liste[0].name, 'Mayonnaise');
  assert.equal(liste[0].aktiv, 0);

  await admin.delete(`/api/beilagen/${mayo.id}`);
  assert.equal((await admin.get('/api/beilagen')).body.length, 0);
  assert.equal(db.prepare('SELECT geloescht FROM beilage WHERE id = ?').get(mayo.id).geloescht, 1);
});

test('Artikelbild: Hochladen, Ersetzen, Entfernen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, sortierung: 1,
  })).body;
  assert.equal(pommes.bild_url, null);

  const hochgeladen = await admin.post(`/api/artikel/${pommes.id}/bild`)
    .attach('bild', GUELTIGES_MINI_PNG, 'test.png');
  assert.equal(hochgeladen.status, 200);
  assert.ok(hochgeladen.body.bild_url.startsWith('/artikelbilder/'));
  const ersteDatei = hochgeladen.body.bild_url;

  const abgerufen = await request(app).get(ersteDatei);
  assert.equal(abgerufen.status, 200);

  await admin.post(`/api/artikel/${pommes.id}/bild`)
    .attach('bild', GUELTIGES_MINI_PNG, 'neu.png');
  const ordner = path.join(process.env.DATEN_VERZEICHNIS, 'artikelbilder');
  assert.equal(fs.readdirSync(ordner).length, 1);

  await admin.delete(`/api/artikel/${pommes.id}/bild`);
  assert.equal(fs.readdirSync(ordner).length, 0);
  const liste = (await admin.get('/api/artikel')).body;
  assert.equal(liste[0].bild_url, null);
});

test('Artikelbild: falscher Dateityp wird abgelehnt, unbekannter Artikel liefert 404', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, sortierung: 1,
  })).body;
  const falscherTyp = await admin.post(`/api/artikel/${pommes.id}/bild`)
    .attach('bild', Buffer.from('kein bild'), { filename: 'x.txt', contentType: 'text/plain' });
  assert.equal(falscherTyp.status, 400);

  const unbekannt = await admin.post('/api/artikel/9999/bild')
    .attach('bild', GUELTIGES_MINI_PNG, 'test.png');
  assert.equal(unbekannt.status, 404);
});

test('Bildupload: Verwaltung bekommt keine Einkaufskosten, Admin schon', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const verwaltung = await angemeldeterAgent(app, db, 'verwaltung');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, einkaufskosten_cent: 100, sortierung: 1,
  })).body;

  const alsVerwaltung = await verwaltung.post(`/api/artikel/${pommes.id}/bild`)
    .attach('bild', GUELTIGES_MINI_PNG, 'test.png');
  assert.equal(alsVerwaltung.status, 200);
  assert.ok(alsVerwaltung.body.bild_url.startsWith('/artikelbilder/'));
  assert.equal('einkaufskosten_cent' in alsVerwaltung.body, false);

  const alsAdmin = await admin.post(`/api/artikel/${pommes.id}/bild`)
    .attach('bild', GUELTIGES_MINI_PNG, 'test.png');
  assert.equal(alsAdmin.body.einkaufskosten_cent, 100);
});

test('Artikel: Aktiv-Schalter ändert nur die Aktivität und lässt einen zwischenzeitlich geänderten Preis stehen', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const artikel = (await admin.post('/api/artikel').send({
    name: 'Döner', farbe: '#f5c211', preis_cent: 500, beilagen_ids: [], sortierung: 1,
  })).body;

  await admin.put(`/api/artikel/${artikel.id}`).send({ ...artikel, preis_cent: 650 });
  const antwort = await admin.put(`/api/artikel/${artikel.id}/aktiv`).send({ aktiv: 0 });

  assert.equal(antwort.status, 200);
  assert.equal(antwort.body.aktiv, 0);
  assert.equal(antwort.body.preis_cent, 650);
  const gespeichert = db.prepare('SELECT preis_cent, aktiv FROM artikel WHERE id = ?').get(artikel.id);
  assert.equal(gespeichert.preis_cent, 650);
  assert.equal(gespeichert.aktiv, 0);
});

test('Artikel: Aktiv-Schalter lehnt ungültige Werte und fehlende Artikel ab', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const artikel = (await admin.post('/api/artikel').send({
    name: 'Döner', farbe: '#f5c211', preis_cent: 500, beilagen_ids: [],
  })).body;

  assert.equal((await admin.put(`/api/artikel/${artikel.id}/aktiv`).send({ aktiv: 'vielleicht' })).status, 400);
  assert.equal((await admin.put('/api/artikel/99999/aktiv').send({ aktiv: 0 })).status, 404);
});

test('Artikel: Bearbeiten mit veraltetem Stand wird mit Konflikt abgelehnt und ändert nichts', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const artikel = (await admin.post('/api/artikel').send({
    name: 'Döner', farbe: '#f5c211', preis_cent: 500, beilagen_ids: [],
  })).body;

  await admin.put(`/api/artikel/${artikel.id}`).send({ ...artikel, preis_cent: 650, erwarteter_stand: artikel.stand });
  const veraltet = await admin.put(`/api/artikel/${artikel.id}`).send({
    ...artikel, name: 'Falafel', erwarteter_stand: artikel.stand,
  });

  assert.equal(veraltet.status, 409);
  assert.match(veraltet.body.fehler, /inzwischen geändert/);
  const gespeichert = db.prepare('SELECT name, preis_cent FROM artikel WHERE id = ?').get(artikel.id);
  assert.equal(gespeichert.name, 'Döner');
  assert.equal(gespeichert.preis_cent, 650);
});

test('Artikel: geänderte Einkaufskosten lassen ein veraltetes Formular mit Konflikt scheitern', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const artikel = (await admin.post('/api/artikel').send({
    name: 'Döner', farbe: '#f5c211', preis_cent: 500, einkaufskosten_cent: 200, beilagen_ids: [],
  })).body;

  await admin.put(`/api/artikel/${artikel.id}`).send({
    ...artikel, einkaufskosten_cent: 300, erwarteter_stand: artikel.stand,
  });
  const veraltet = await admin.put(`/api/artikel/${artikel.id}`).send({
    ...artikel, erwarteter_stand: artikel.stand,
  });

  assert.equal(veraltet.status, 409);
  assert.equal(db.prepare('SELECT einkaufskosten_cent AS k FROM artikel WHERE id = ?').get(artikel.id).k, 300);
});

test('Artikel: der Stand verrät der Verwaltung die Einkaufskosten nicht', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const verwaltung = await angemeldeterAgent(app, db, 'verwaltung');
  const artikel = (await admin.post('/api/artikel').send({
    name: 'Döner', farbe: '#f5c211', preis_cent: 500, einkaufskosten_cent: 200, beilagen_ids: [],
  })).body;

  const klartextVariante = JSON.stringify(
    [artikel.name, artikel.name_tr, artikel.farbe, artikel.preis_cent, 200, artikel.aktiv, artikel.sortierung, [], [[1, 999999999]]]
  );
  const stand = (await verwaltung.get('/api/artikel')).body[0].stand;
  assert.match(stand, /^[0-9a-f]{64}$/);
  const sha = (await import('node:crypto')).createHash('sha256').update(klartextVariante).digest('hex');
  assert.notEqual(stand, sha);
});

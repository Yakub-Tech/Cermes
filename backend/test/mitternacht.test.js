import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp, angemeldeterAgent } from './helfer.js';

const EchtesDate = globalThis.Date;

function uhrStellen(...zeitpunkte) {
  const liste = [...zeitpunkte];
  globalThis.Date = class extends EchtesDate {
    constructor(...werte) {
      if (werte.length > 0) {
        super(...werte);
      } else if (liste.length > 1) {
        super(liste.shift());
      } else {
        super(liste[0]);
      }
    }
  };
}

function uhrZuruecksetzen() {
  globalThis.Date = EchtesDate;
}

const TAG_1 = '2026-09-26';
const TAG_2 = '2026-09-27';
const KURZ_VOR_MITTERNACHT = '2026-09-26T23:58:00+02:00';
const LETZTE_MILLISEKUNDE = '2026-09-26T23:59:59.999+02:00';
const KURZ_NACH_MITTERNACHT = '2026-09-27T00:00:30+02:00';

async function artikelAnlegen(admin, name, preis) {
  return (await admin.post('/api/artikel').send({
    name, farbe: '#f5c211', preis_cent: preis, beilagen_ids: [], sortierung: 1,
  })).body;
}

async function verkaufen(kasse, artikel) {
  return (await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: artikel.id, beilagen_ids: [] }],
  })).body.kaertchen[0];
}

test('Mitternacht: Listen, TV, Storno und Statistik trennen am Kalendertag, nichts geht verloren', async (t) => {
  t.after(uhrZuruecksetzen);
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const belegen = await angemeldeterAgent(app, db, 'belegen');
  const ausgabe = await angemeldeterAgent(app, db, 'ausgabe');
  const pommes = await artikelAnlegen(admin, 'Pommes', 350);

  uhrStellen(KURZ_VOR_MITTERNACHT);
  const a = await verkaufen(kasse, pommes);
  const b = await verkaufen(kasse, pommes);
  const c = await verkaufen(kasse, pommes);
  assert.equal((await belegen.post(`/api/belegen/status/${b.id}`).send({ status: 'abholbereit' })).status, 200);
  assert.equal((await kasse.post(`/api/kasse/storno/${c.id}`)).status, 200);

  const tv1 = (await admin.get('/api/tv/kaertchen')).body;
  assert.deepEqual(tv1.in_bearbeitung.map((k) => k.nummer), [a.nummer]);
  assert.deepEqual(tv1.abholbereit.map((k) => k.nummer), [b.nummer]);
  const statistikTag1Vorher = (await admin.get(`/api/statistik/tag/${TAG_1}`)).body;
  assert.equal(statistikTag1Vorher.gesamt.stueck, 2);
  assert.equal(statistikTag1Vorher.gesamt.umsatz_cent, 700);
  assert.equal(statistikTag1Vorher.stornos.length, 1);

  uhrStellen(KURZ_NACH_MITTERNACHT);

  const belegenListe = (await belegen.get('/api/belegen/kaertchen')).body;
  assert.equal(belegenListe.in_bearbeitung.length, 0);
  assert.equal(belegenListe.abholbereit.length, 0);
  const ausgabeListe = (await ausgabe.get('/api/ausgabe/kaertchen')).body;
  assert.equal(ausgabeListe.abholbereit.length, 0);
  const tv2 = (await admin.get('/api/tv/kaertchen')).body;
  assert.equal(tv2.in_bearbeitung.length + tv2.abholbereit.length, 0);
  assert.equal((await kasse.get('/api/kasse/stornierbar')).body.length, 0);

  const zeilen = db.prepare('SELECT id, status, erstellt_am FROM kaertchen ORDER BY id').all();
  assert.deepEqual(zeilen.map((z) => z.status), ['in_bearbeitung', 'abholbereit', 'storniert']);
  assert.ok(zeilen.every((z) => z.erstellt_am.startsWith(TAG_1)));

  const storno = await kasse.post(`/api/kasse/storno/${a.id}`);
  assert.equal(storno.status, 409);
  assert.equal(storno.body.fehler, 'Nur heutige Kärtchen können storniert werden.');

  const d = await verkaufen(kasse, pommes);
  assert.equal(d.nummer, c.nummer + 1);
  assert.ok(db.prepare('SELECT erstellt_am FROM kaertchen WHERE id = ?').get(d.id).erstellt_am.startsWith(TAG_2));
  assert.deepEqual((await belegen.get('/api/belegen/kaertchen')).body.in_bearbeitung.map((k) => k.id), [d.id]);
  assert.deepEqual((await admin.get('/api/tv/kaertchen')).body.in_bearbeitung.map((k) => k.nummer), [d.nummer]);

  assert.equal((await ausgabe.post(`/api/ausgabe/status/${b.id}`).send({ status: 'abgeholt' })).status, 200);

  const statistikTag1Nachher = (await admin.get(`/api/statistik/tag/${TAG_1}`)).body;
  assert.deepEqual(statistikTag1Nachher, statistikTag1Vorher);
  const statistikTag2 = (await admin.get(`/api/statistik/tag/${TAG_2}`)).body;
  assert.equal(statistikTag2.gesamt.stueck, 1);
  assert.equal(statistikTag2.gesamt.umsatz_cent, 350);
  assert.equal(statistikTag2.stornos.length, 0);
  assert.deepEqual((await admin.get('/api/statistik/verkaufstage')).body, [TAG_2, TAG_1]);
});

test('Mitternacht: eine Bestellung, die über 0 Uhr gebucht wird, landet komplett an einem Tag', async (t) => {
  t.after(uhrZuruecksetzen);
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const pommes = await artikelAnlegen(admin, 'Pommes', 350);
  const wurst = await artikelAnlegen(admin, 'Wurst', 300);

  uhrStellen(LETZTE_MILLISEKUNDE, KURZ_NACH_MITTERNACHT);
  const antwort = await kasse.post('/api/kasse/kassieren').send({
    positionen: [{ artikel_id: pommes.id, beilagen_ids: [] }, { artikel_id: wurst.id, beilagen_ids: [] }],
  });
  assert.equal(antwort.status, 200);

  const vorgang = db.prepare('SELECT zeitpunkt FROM kassiervorgang WHERE id = ?').get(antwort.body.kassiervorgang_id);
  const tage = db.prepare('SELECT erstellt_am FROM kaertchen WHERE kassiervorgang_id = ?')
    .all(antwort.body.kassiervorgang_id).map((zeile) => zeile.erstellt_am.slice(0, 10));
  assert.deepEqual(tage, [vorgang.zeitpunkt.slice(0, 10), vorgang.zeitpunkt.slice(0, 10)],
    'Kassiervorgang und alle seine Kärtchen gehören zum selben Verkaufstag');
});

test('Mitternacht: ein Storno genau um 0 Uhr ändert den abgeschlossenen Vortag nicht', async (t) => {
  t.after(uhrZuruecksetzen);
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const kasse = await angemeldeterAgent(app, db, 'kasse');
  const pommes = await artikelAnlegen(admin, 'Pommes', 350);
  uhrStellen(KURZ_VOR_MITTERNACHT);
  const kaertchen = await verkaufen(kasse, pommes);

  uhrStellen(LETZTE_MILLISEKUNDE, KURZ_NACH_MITTERNACHT);
  const antwort = await kasse.post(`/api/kasse/storno/${kaertchen.id}`);

  const zeile = db.prepare('SELECT status, erstellt_am, storniert_am FROM kaertchen WHERE id = ?').get(kaertchen.id);
  if (antwort.status === 200) {
    assert.equal(zeile.storniert_am.slice(0, 10), zeile.erstellt_am.slice(0, 10),
      'ein angenommenes Storno liegt am selben Tag wie der Verkauf');
  } else {
    assert.equal(antwort.status, 409);
    assert.equal(zeile.status, 'in_bearbeitung');
  }
});

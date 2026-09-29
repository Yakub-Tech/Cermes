import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import unzipper from 'unzipper';
import Database from 'better-sqlite3';
import { frischeApp, angemeldeterAgent } from './helfer.js';
import { datenVerzeichnis } from '../src/db.js';

function bytesLesen(res, weiter) {
  const teile = [];
  res.on('data', (teil) => teile.push(teil));
  res.on('end', () => weiter(null, Buffer.concat(teile)));
}

const PRUEFSKRIPT = `
import Database from 'better-sqlite3';
const db = new Database(process.argv[1], { readonly: true });
const ergebnis = {
  integritaet: db.pragma('integrity_check', { simple: true }),
  fremdschluesselFehler: db.pragma('foreign_key_check').length,
  vorgaenge: db.prepare('SELECT COUNT(*) AS n FROM kassiervorgang').get().n,
  vorgaengeMitFalscherSumme: db.prepare(
    \`SELECT COUNT(*) AS n FROM kassiervorgang v
     WHERE v.summe_cent != (SELECT COALESCE(SUM(k.preis_cent), 0) FROM kaertchen k WHERE k.kassiervorgang_id = v.id)\`
  ).get().n,
  artikelMitFalscherNummer: db.prepare(
    \`SELECT COUNT(*) AS n FROM artikel a
     WHERE a.naechste_nummer != (SELECT COALESCE(MAX(k.nummer), 0) + 1 FROM kaertchen k WHERE k.artikel_id = a.id)\`
  ).get().n,
  kassiertEintraege: db.prepare("SELECT COUNT(*) AS n FROM audit_eintrag WHERE aktion = 'kassiert'").get().n,
};
console.log(JSON.stringify(ergebnis));
`;

function pruefeInEigenemProzess(datei) {
  const ausgabe = execFileSync(process.execPath, ['--input-type=module', '-e', PRUEFSKRIPT, datei], {
    cwd: path.join(import.meta.dirname, '..'),
    encoding: 'utf8',
  });
  return JSON.parse(ausgabe);
}

test('Backup-Export bleibt konsistent, während parallel verkauft und gecheckpointet wird (OFF-003)', async () => {
  const { app, db } = frischeApp();
  const admin = await angemeldeterAgent(app, db, 'admin');
  const pommes = (await admin.post('/api/artikel').send({
    name: 'Pommes', farbe: '#f5c211', preis_cent: 350, beilagen_ids: [], sortierung: 1,
  })).body;
  const adana = (await admin.post('/api/artikel').send({
    name: 'Adana', farbe: '#2255cc', preis_cent: 700, beilagen_ids: [], sortierung: 2,
  })).body;
  const kasse = await angemeldeterAgent(app, db, 'kasse');

  const vorgangAnlegen = db.prepare(
    "INSERT INTO kassiervorgang (zeitpunkt, summe_cent, benutzer_id) VALUES ('2026-05-01T12:00:00+02:00', 350, 1)"
  );
  const kaertchenAnlegen = db.prepare(
    `INSERT INTO kaertchen (kassiervorgang_id, artikel_id, nummer, artikel_name, artikel_farbe, preis_cent,
       status, erstellt_am) VALUES (?, ?, ?, 'Pommes', '#f5c211', 350, 'abgeholt', '2026-05-01T12:00:00+02:00')`
  );
  const auditAnlegen = db.prepare(
    `INSERT INTO audit_eintrag (zeitpunkt, benutzername, rolle, bereich, aktion, details)
     VALUES ('2026-05-01T12:00:00+02:00', 'test-kasse', 'kasse', 'kasse', 'kassiert', '{}')`
  );
  const ALTBESTAND = 5000;
  db.transaction(() => {
    for (let nummer = 1; nummer <= ALTBESTAND; nummer++) {
      const vorgang = vorgangAnlegen.run();
      kaertchenAnlegen.run(vorgang.lastInsertRowid, pommes.id, nummer);
      auditAnlegen.run();
    }
    db.prepare('UPDATE artikel SET naechste_nummer = ? WHERE id = ?').run(ALTBESTAND + 1, pommes.id);
  })();

  const originalesBackup = db.backup.bind(db);
  let vorgaengeBeimStart = null;
  let vorgaengeBeimEnde = null;
  let kopierschritte = 0;
  const zaehleVorgaenge = () => db.prepare('SELECT COUNT(*) AS n FROM kassiervorgang').get().n;
  db.backup = async (ziel) => {
    const fortschritt = await originalesBackup(ziel, {
      progress: () => {
        kopierschritte++;
        if (vorgaengeBeimStart === null) vorgaengeBeimStart = zaehleVorgaenge();
        return 1;
      },
    });
    vorgaengeBeimEnde = zaehleVorgaenge();
    return fortschritt;
  };

  const zweiteVerbindung = new Database(path.join(datenVerzeichnis(), 'cermes.sqlite'));
  let exportFertig = false;
  let verkaeufe = 0;
  let checkpoints = 0;

  async function verkaufeBisExportFertig() {
    while (!exportFertig) {
      const antwort = await kasse.post('/api/kasse/kassieren').send({
        positionen: [
          { artikel_id: pommes.id, beilagen_ids: [] },
          { artikel_id: adana.id, beilagen_ids: [] },
        ],
      });
      assert.equal(antwort.status, 200);
      verkaeufe++;
    }
  }

  async function checkpointeBisExportFertig() {
    while (!exportFertig) {
      zweiteVerbindung.pragma('wal_checkpoint(PASSIVE)');
      db.pragma('wal_checkpoint(RESTART)');
      checkpoints++;
      await new Promise((weiter) => setTimeout(weiter, 1));
    }
  }

  const exportAnfrage = admin.get('/api/backup').buffer().parse(bytesLesen).then((antwort) => {
    exportFertig = true;
    return antwort;
  });
  const [backup] = await Promise.all([
    exportAnfrage,
    verkaufeBisExportFertig(),
    verkaufeBisExportFertig(),
    verkaufeBisExportFertig(),
    checkpointeBisExportFertig(),
  ]);
  zweiteVerbindung.close();
  db.backup = originalesBackup;

  assert.equal(backup.status, 200);
  assert.ok(vorgaengeBeimEnde > vorgaengeBeimStart,
    `Während des Kopierens wurde nicht verkauft (Start ${vorgaengeBeimStart}, Ende ${vorgaengeBeimEnde})`);
  assert.ok(checkpoints > 0);

  const zip = await unzipper.Open.buffer(backup.body);
  const inhalt = await zip.files.find((eintrag) => eintrag.path === 'cermes.sqlite').buffer();
  const pruefOrdner = fs.mkdtempSync(path.join(os.tmpdir(), 'cermes-backup-pruefung-'));
  const pruefDatei = path.join(pruefOrdner, 'cermes.sqlite');
  fs.writeFileSync(pruefDatei, inhalt);
  try {
    const ergebnis = pruefeInEigenemProzess(pruefDatei);
    assert.equal(ergebnis.integritaet, 'ok');
    assert.equal(ergebnis.fremdschluesselFehler, 0);
    assert.equal(ergebnis.vorgaengeMitFalscherSumme, 0);
    assert.equal(ergebnis.artikelMitFalscherNummer, 0);
    assert.equal(ergebnis.kassiertEintraege, ergebnis.vorgaenge);
    assert.ok(ergebnis.vorgaenge >= vorgaengeBeimStart && ergebnis.vorgaenge <= vorgaengeBeimEnde,
      `Backup enthält ${ergebnis.vorgaenge} Vorgänge, erwartet ${vorgaengeBeimStart} bis ${vorgaengeBeimEnde}`);
    console.log(`OFF-003-Messung: ${kopierschritte} Kopierschritte, ${verkaeufe} Verkäufe und ${checkpoints} ` +
      `Checkpoint-Runden parallel, Vorgänge beim Start ${vorgaengeBeimStart}, beim Ende ${vorgaengeBeimEnde}, ` +
      `im Backup ${ergebnis.vorgaenge}`);
  } finally {
    fs.rmSync(pruefOrdner, { recursive: true, force: true });
  }
});

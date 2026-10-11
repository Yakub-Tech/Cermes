import test from 'node:test';
import assert from 'node:assert/strict';
import { frischeApp } from './helfer.js';
import { protokolliere, unterschiede, aktionFuerAenderung, protokolliereAenderung } from '../src/audit.js';

const admin = { benutzername: 'chef', rolle: 'admin' };

function alleEintraege(db) {
  return db.prepare('SELECT * FROM audit_eintrag ORDER BY id').all();
}

test('protokolliere schreibt Zeitstempel, Benutzer, Rolle, Bereich, Aktion und Details', () => {
  const { db } = frischeApp();
  const vorher = alleEintraege(db).length;

  protokolliere(db, admin, 'artikel', 'artikel_angelegt', { werte: { artikel: 'Pommes' } });

  const eintraege = alleEintraege(db);
  assert.equal(eintraege.length, vorher + 1);
  const eintrag = eintraege.at(-1);
  assert.equal(eintrag.benutzername, 'chef');
  assert.equal(eintrag.rolle, 'admin');
  assert.equal(eintrag.bereich, 'artikel');
  assert.equal(eintrag.aktion, 'artikel_angelegt');
  assert.deepEqual(JSON.parse(eintrag.details), { werte: { artikel: 'Pommes' } });
  assert.match(eintrag.zeitpunkt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
});

test('protokolliere erlaubt einen Eintrag ohne Rolle (fehlgeschlagener Login)', () => {
  const { db } = frischeApp();
  protokolliere(db, { benutzername: 'unbekannt' }, 'anmeldung', 'login_fehlgeschlagen');
  const eintrag = alleEintraege(db).at(-1);
  assert.equal(eintrag.rolle, null);
  assert.equal(eintrag.details, '{}');
});

test('Einträge lassen sich weder ändern noch löschen', () => {
  const { db } = frischeApp();
  protokolliere(db, admin, 'kasse', 'kassiert', {});
  const id = alleEintraege(db).at(-1).id;

  assert.throws(
    () => db.prepare('UPDATE audit_eintrag SET aktion = ? WHERE id = ?').run('manipuliert', id),
    /nicht geändert/
  );
  assert.throws(
    () => db.prepare('DELETE FROM audit_eintrag WHERE id = ?').run(id),
    /nicht gelöscht/
  );
  assert.equal(db.prepare('SELECT aktion FROM audit_eintrag WHERE id = ?').get(id).aktion, 'kassiert');
});

test('Rollback der Transaktion nimmt auch den Eintrag zurück', () => {
  const { db } = frischeApp();
  const vorher = alleEintraege(db).length;

  const aktion = db.transaction(() => {
    db.prepare("INSERT INTO beilage (name) VALUES ('Ketchup')").run();
    protokolliere(db, admin, 'artikel', 'beilage_angelegt', {});
    throw new Error('Abbruch nach dem Eintrag');
  });
  assert.throws(aktion, /Abbruch/);

  assert.equal(alleEintraege(db).length, vorher);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM beilage').get().n, 0);
});

test('unterschiede liefert nur wirklich geänderte Felder', () => {
  const vorher = { name: 'Pommes', preis_cent: 300, aktiv: 1, beilagen: ['Ketchup'] };
  const nachher = { name: 'Pommes', preis_cent: 350, aktiv: 1, beilagen: ['Ketchup', 'Mayo'] };

  assert.deepEqual(unterschiede(vorher, nachher, ['name', 'preis_cent', 'aktiv', 'beilagen']), {
    preis_cent: { vorher: 300, nachher: 350 },
    beilagen: { vorher: ['Ketchup'], nachher: ['Ketchup', 'Mayo'] },
  });
  assert.deepEqual(unterschiede(vorher, vorher, ['name', 'preis_cent']), {});
});

test('unterschiede behandelt fehlende Werte als null', () => {
  const ergebnis = unterschiede({ name_tr: null }, { name_tr: 'Patates' }, ['name_tr']);
  assert.deepEqual(ergebnis, { name_tr: { vorher: null, nachher: 'Patates' } });
  assert.deepEqual(unterschiede({}, { name_tr: null }, ['name_tr']), {});
});

test('aktionFuerAenderung unterscheidet aktiviert, deaktiviert und geändert', () => {
  assert.equal(aktionFuerAenderung('artikel', { aktiv: { vorher: 1, nachher: 0 } }), 'artikel_deaktiviert');
  assert.equal(aktionFuerAenderung('artikel', { aktiv: { vorher: 0, nachher: 1 } }), 'artikel_aktiviert');
  assert.equal(aktionFuerAenderung('beilage', { name: { vorher: 'a', nachher: 'b' } }), 'beilage_geaendert');
  assert.equal(
    aktionFuerAenderung('artikel', { aktiv: { vorher: 1, nachher: 0 }, preis_cent: { vorher: 1, nachher: 2 } }),
    'artikel_geaendert'
  );
});

test('protokolliereAenderung schreibt bei leerem Unterschied nichts', () => {
  const { db } = frischeApp();
  const vorher = alleEintraege(db).length;

  protokolliereAenderung(db, admin, 'artikel', 'artikel', { artikel: 'Pommes' }, {});
  assert.equal(alleEintraege(db).length, vorher);

  protokolliereAenderung(db, admin, 'artikel', 'artikel', { artikel: 'Pommes' },
    { preis_cent: { vorher: 300, nachher: 350 } });
  const eintrag = alleEintraege(db).at(-1);
  assert.equal(eintrag.aktion, 'artikel_geaendert');
  assert.deepEqual(JSON.parse(eintrag.details), {
    werte: { artikel: 'Pommes' },
    aenderungen: { preis_cent: { vorher: 300, nachher: 350 } },
  });
});

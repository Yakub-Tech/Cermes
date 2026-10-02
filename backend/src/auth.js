import cookieSession from 'cookie-session';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { oeffneDatenbank, datenVerzeichnis } from './db.js';
import { jetztIso } from './zeit.js';
import { protokolliere } from './audit.js';
import { passwortRegelFehler } from './passwortRegeln.js';

function gekuerzterName(text) {
  return String(text ?? '').slice(0, 100);
}

function protokolliereOhneAbsturz(db, benutzer, bereich, aktion) {
  try {
    protokolliere(db, benutzer, bereich, aktion);
  } catch {
  }
}

function sessionGeheimnis() {
  const datei = path.join(datenVerzeichnis(), 'session-geheimnis');
  if (!fs.existsSync(datei)) {
    fs.writeFileSync(datei, crypto.randomBytes(32).toString('hex'));
  }
  return fs.readFileSync(datei, 'utf8');
}

export function einrichtungsKennwort() {
  const datei = path.join(datenVerzeichnis(), 'einrichtungs-kennwort');
  if (!fs.existsSync(datei)) {
    fs.writeFileSync(datei, crypto.randomBytes(8).toString('hex'));
  }
  return fs.readFileSync(datei, 'utf8').trim();
}

function einrichtungsKennwortStimmt(eingabe) {
  if (typeof eingabe !== 'string') return false;
  const sha = (text) => crypto.createHash('sha256').update(text).digest();
  return crypto.timingSafeEqual(sha(eingabe), sha(einrichtungsKennwort()));
}

const SITZUNG_DAUER_MS = 24 * 60 * 60 * 1000;

const FEHLVERSUCHE_BIS_PAUSE = 10;
const PAUSE_MS = 30 * 1000;
const fehlversucheJeSchluessel = new Map();

function bremsSchluessel(adresse, benutzer) {
  if (!benutzer) return adresse;
  return `${adresse}|${benutzer.benutzername}`;
}

function pauseRestSekunden(schluessel) {
  const eintrag = fehlversucheJeSchluessel.get(schluessel);
  if (!eintrag || eintrag.pauseBis <= Date.now()) return 0;
  return Math.ceil((eintrag.pauseBis - Date.now()) / 1000);
}

function fehlversuchMerken(schluessel) {
  const eintrag = fehlversucheJeSchluessel.get(schluessel) ?? { anzahl: 0, pauseBis: 0 };
  eintrag.anzahl += 1;
  if (eintrag.anzahl >= FEHLVERSUCHE_BIS_PAUSE) {
    eintrag.anzahl = 0;
    eintrag.pauseBis = Date.now() + PAUSE_MS;
  }
  fehlversucheJeSchluessel.set(schluessel, eintrag);
}

function sitzungAnlegen(db, anfrage, benutzerId) {
  db.prepare('DELETE FROM sitzung WHERE ausgestellt_ms < ?').run(Date.now() - SITZUNG_DAUER_MS);
  const kennung = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sitzung (id, benutzer_id, ausgestellt_ms) VALUES (?, ?, ?)')
    .run(kennung, benutzerId, Date.now());
  anfrage.session.sitzungId = kennung;
}

export function sitzungenDesKontosBeenden(db, benutzerId) {
  db.prepare('DELETE FROM sitzung WHERE benutzer_id = ?').run(benutzerId);
}

function kontoPruefen(db, anfrage, benutzername, passwort, fehlAktion, fehlText) {
  const benutzer = db.prepare('SELECT * FROM benutzer WHERE benutzername = ?').get(benutzername);
  const schluessel = bremsSchluessel(anfrage.ip, benutzer);
  const restSekunden = pauseRestSekunden(schluessel);
  if (restSekunden > 0) {
    return {
      fehlerStatus: 429,
      fehlerText: `Zu viele falsche Anmeldeversuche. Bitte in ${restSekunden} Sekunden noch einmal versuchen.`,
    };
  }
  if (!benutzer || !bcrypt.compareSync(passwort || '', benutzer.passwort_hash)) {
    fehlversuchMerken(schluessel);
    protokolliereOhneAbsturz(db, { benutzername: gekuerzterName(benutzername) }, 'anmeldung', fehlAktion);
    return { fehlerStatus: 401, fehlerText: fehlText };
  }
  fehlversucheJeSchluessel.delete(schluessel);
  return { benutzer };
}

export function authEinbinden(app) {
  app.use(cookieSession({
    name: 'cermes-session',
    secret: sessionGeheimnis(),
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SITZUNG_DAUER_MS,
  }));

  app.get('/api/ersteinrichtung', (_anfrage, antwort) => {
    const db = oeffneDatenbank();
    const anzahl = db.prepare('SELECT COUNT(*) AS n FROM benutzer').get().n;
    antwort.json({ noetig: anzahl === 0 });
  });

  app.post('/api/ersteinrichtung', (anfrage, antwort) => {
    const db = oeffneDatenbank();
    const anzahl = db.prepare('SELECT COUNT(*) AS n FROM benutzer').get().n;
    if (anzahl > 0) {
      return antwort.status(409).json({ fehler: 'Die Ersteinrichtung wurde bereits durchgeführt.' });
    }
    const { benutzername, passwort } = anfrage.body;
    if (!einrichtungsKennwortStimmt(anfrage.body.einrichtungsKennwort)) {
      return antwort.status(403).json({
        fehler: 'Das Einrichtungskennwort fehlt oder ist falsch. Es steht beim Start des Servers im Container-Log.',
      });
    }
    if (!benutzername || !passwort || passwort.length < 8) {
      return antwort.status(400).json({ fehler: 'Benutzername und ein Passwort mit mindestens 8 Zeichen sind nötig.' });
    }
    const regelFehler = passwortRegelFehler(passwort);
    if (regelFehler) {
      return antwort.status(400).json({ fehler: regelFehler });
    }
    let ergebnis;
    try {
      ergebnis = db.transaction(() => {
        const eingefuegt = db.prepare(
          'INSERT INTO benutzer (benutzername, passwort_hash, rolle, erstellt_am) VALUES (?, ?, ?, ?)'
        ).run(benutzername, bcrypt.hashSync(passwort, 10), 'admin', jetztIso());
        protokolliere(db, { benutzername, rolle: 'admin' }, 'benutzer', 'ersteinrichtung');
        return eingefuegt;
      })();
    } catch {
      return antwort.status(500).json({
        fehler: 'Die Ersteinrichtung konnte nicht gespeichert werden. Bitte noch einmal versuchen.',
      });
    }
    sitzungAnlegen(db, anfrage, ergebnis.lastInsertRowid);
    antwort.json({ rolle: 'admin' });
  });

  app.post('/api/login', (anfrage, antwort) => {
    const db = oeffneDatenbank();
    const { benutzername, passwort } = anfrage.body;
    const pruefung = kontoPruefen(db, anfrage, benutzername, passwort, 'login_fehlgeschlagen',
      'Benutzername oder Passwort ist falsch.');
    if (pruefung.fehlerStatus) {
      return antwort.status(pruefung.fehlerStatus).json({ fehler: pruefung.fehlerText });
    }
    const benutzer = pruefung.benutzer;
    sitzungAnlegen(db, anfrage, benutzer.id);
    protokolliereOhneAbsturz(db, benutzer, 'anmeldung', 'login');
    antwort.json({ rolle: benutzer.rolle });
  });

  app.post('/api/passwort-aendern', (anfrage, antwort) => {
    const db = oeffneDatenbank();
    const { aktuellesPasswort, neuesPasswort } = anfrage.body;
    const benutzername = typeof anfrage.body.benutzername === 'string' ? anfrage.body.benutzername : '';
    const pruefung = kontoPruefen(db, anfrage, benutzername,
      typeof aktuellesPasswort === 'string' ? aktuellesPasswort : '',
      'passwort_aendern_fehlgeschlagen', 'Benutzername oder aktuelles Passwort ist falsch.');
    if (pruefung.fehlerStatus) {
      return antwort.status(pruefung.fehlerStatus).json({ fehler: pruefung.fehlerText });
    }
    const benutzer = pruefung.benutzer;
    const regelFehler = passwortRegelFehler(neuesPasswort);
    if (regelFehler) {
      return antwort.status(400).json({ fehler: regelFehler });
    }
    if (bcrypt.compareSync(neuesPasswort, benutzer.passwort_hash)) {
      return antwort.status(400).json({ fehler: 'Das neue Passwort muss sich vom bisherigen unterscheiden.' });
    }
    try {
      db.transaction(() => {
        db.prepare('UPDATE benutzer SET passwort_hash = ? WHERE id = ?')
          .run(bcrypt.hashSync(neuesPasswort, 10), benutzer.id);
        sitzungenDesKontosBeenden(db, benutzer.id);
        protokolliere(db, benutzer, 'benutzer', 'passwort_selbst_geaendert', {
          werte: { konto: benutzer.benutzername },
        });
      })();
    } catch {
      return antwort.status(500).json({
        fehler: 'Es ist ein unerwarteter Fehler aufgetreten. Bitte noch einmal versuchen.',
      });
    }
    antwort.json({ ok: true });
  });

  app.post('/api/logout', (anfrage, antwort) => {
    const benutzer = aktuellerBenutzer(anfrage);
    if (benutzer) {
      const aktion = anfrage.body?.grund === 'inaktivitaet' ? 'logout_inaktivitaet' : 'logout';
      protokolliereOhneAbsturz(oeffneDatenbank(), benutzer, 'anmeldung', aktion);
    }
    if (anfrage.session?.sitzungId) {
      oeffneDatenbank().prepare('DELETE FROM sitzung WHERE id = ?').run(anfrage.session.sitzungId);
    }
    anfrage.session = null;
    antwort.status(204).end();
  });

  app.get('/api/session', (anfrage, antwort) => {
    const benutzer = aktuellerBenutzer(anfrage);
    if (!benutzer) return antwort.json({ angemeldet: false });
    antwort.json({ angemeldet: true, rolle: benutzer.rolle, benutzername: benutzer.benutzername });
  });
}

export function aktuellerBenutzer(anfrage) {
  if (!anfrage.session?.sitzungId) return null;
  return oeffneDatenbank().prepare(
    `SELECT b.* FROM sitzung s JOIN benutzer b ON b.id = s.benutzer_id
     WHERE s.id = ? AND s.ausgestellt_ms > ?`
  ).get(anfrage.session.sitzungId, Date.now() - SITZUNG_DAUER_MS) || null;
}

export function brauchtAnmeldung() {
  return (anfrage, antwort, weiter) => {
    if (!aktuellerBenutzer(anfrage)) {
      return antwort.status(401).json({ fehler: 'Bitte zuerst anmelden.' });
    }
    weiter();
  };
}

export function brauchtRolle(rolle) {
  const erlaubteRollen = Array.isArray(rolle) ? rolle : [rolle];
  return (anfrage, antwort, weiter) => {
    const benutzer = aktuellerBenutzer(anfrage);
    if (!benutzer) return antwort.status(401).json({ fehler: 'Bitte zuerst anmelden.' });
    if (!erlaubteRollen.includes(benutzer.rolle)) {
      return antwort.status(403).json({ fehler: 'Dieses Konto hat hierfür keine Berechtigung.' });
    }
    anfrage.benutzer = benutzer;
    weiter();
  };
}

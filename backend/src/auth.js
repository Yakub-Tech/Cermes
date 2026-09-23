import cookieSession from 'cookie-session';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { oeffneDatenbank, datenVerzeichnis } from './db.js';
import { jetztIso } from './zeit.js';
import { protokolliere } from './audit.js';

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

export function authEinbinden(app) {
  app.use(cookieSession({
    name: 'cermes-session',
    secret: sessionGeheimnis(),
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
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
    if (!benutzername || !passwort || passwort.length < 8) {
      return antwort.status(400).json({ fehler: 'Benutzername und ein Passwort mit mindestens 8 Zeichen sind nötig.' });
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
    anfrage.session.benutzerId = ergebnis.lastInsertRowid;
    antwort.json({ rolle: 'admin' });
  });

  app.post('/api/login', (anfrage, antwort) => {
    const db = oeffneDatenbank();
    const { benutzername, passwort } = anfrage.body;
    const benutzer = db.prepare('SELECT * FROM benutzer WHERE benutzername = ?').get(benutzername);
    if (!benutzer || !bcrypt.compareSync(passwort || '', benutzer.passwort_hash)) {
      protokolliereOhneAbsturz(db, { benutzername: gekuerzterName(benutzername) }, 'anmeldung', 'login_fehlgeschlagen');
      return antwort.status(401).json({ fehler: 'Benutzername oder Passwort ist falsch.' });
    }
    anfrage.session.benutzerId = benutzer.id;
    protokolliereOhneAbsturz(db, benutzer, 'anmeldung', 'login');
    antwort.json({ rolle: benutzer.rolle });
  });

  app.post('/api/logout', (anfrage, antwort) => {
    const benutzer = aktuellerBenutzer(anfrage);
    if (benutzer) {
      const aktion = anfrage.body?.grund === 'inaktivitaet' ? 'logout_inaktivitaet' : 'logout';
      protokolliereOhneAbsturz(oeffneDatenbank(), benutzer, 'anmeldung', aktion);
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
  if (!anfrage.session?.benutzerId) return null;
  return oeffneDatenbank().prepare('SELECT * FROM benutzer WHERE id = ?').get(anfrage.session.benutzerId) || null;
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

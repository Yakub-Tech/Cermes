import cookieSession from 'cookie-session';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { oeffneDatenbank, datenVerzeichnis } from './db.js';
import { jetztIso } from './zeit.js';

function sessionGeheimnis() {
  const datei = path.join(datenVerzeichnis(), 'session-geheimnis');
  if (!fs.existsSync(datei)) {
    fs.writeFileSync(datei, crypto.randomBytes(32).toString('hex'));
  }
  return fs.readFileSync(datei, 'utf8');
}

export function authEinbinden(app) {
  const db = oeffneDatenbank();
  app.use(cookieSession({
    name: 'cermes-session',
    secret: sessionGeheimnis(),
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  }));

  app.get('/api/ersteinrichtung', (_anfrage, antwort) => {
    const anzahl = db.prepare('SELECT COUNT(*) AS n FROM benutzer').get().n;
    antwort.json({ noetig: anzahl === 0 });
  });

  app.post('/api/ersteinrichtung', (anfrage, antwort) => {
    const anzahl = db.prepare('SELECT COUNT(*) AS n FROM benutzer').get().n;
    if (anzahl > 0) {
      return antwort.status(409).json({ fehler: 'Die Ersteinrichtung wurde bereits durchgeführt.' });
    }
    const { benutzername, passwort } = anfrage.body;
    if (!benutzername || !passwort || passwort.length < 8) {
      return antwort.status(400).json({ fehler: 'Benutzername und ein Passwort mit mindestens 8 Zeichen sind nötig.' });
    }
    const ergebnis = db.prepare(
      'INSERT INTO benutzer (benutzername, passwort_hash, rolle, erstellt_am) VALUES (?, ?, ?, ?)'
    ).run(benutzername, bcrypt.hashSync(passwort, 10), 'admin', jetztIso());
    anfrage.session.benutzerId = ergebnis.lastInsertRowid;
    antwort.json({ rolle: 'admin' });
  });

  app.post('/api/login', (anfrage, antwort) => {
    const { benutzername, passwort } = anfrage.body;
    const benutzer = db.prepare('SELECT * FROM benutzer WHERE benutzername = ?').get(benutzername);
    if (!benutzer || !bcrypt.compareSync(passwort || '', benutzer.passwort_hash)) {
      return antwort.status(401).json({ fehler: 'Benutzername oder Passwort ist falsch.' });
    }
    anfrage.session.benutzerId = benutzer.id;
    antwort.json({ rolle: benutzer.rolle });
  });

  app.post('/api/logout', (anfrage, antwort) => {
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

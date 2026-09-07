PRAGMA foreign_keys=OFF;

CREATE TABLE benutzer_neu (
  id INTEGER PRIMARY KEY,
  benutzername TEXT NOT NULL UNIQUE,
  passwort_hash TEXT NOT NULL,
  rolle TEXT NOT NULL CHECK (rolle IN ('admin','kasse','ausgabe','verwaltung','belegen')),
  erstellt_am TEXT NOT NULL
);

INSERT INTO benutzer_neu (id, benutzername, passwort_hash, rolle, erstellt_am)
  SELECT id, benutzername, passwort_hash, rolle, erstellt_am FROM benutzer;

DROP TABLE benutzer;

ALTER TABLE benutzer_neu RENAME TO benutzer;

PRAGMA foreign_keys=ON;

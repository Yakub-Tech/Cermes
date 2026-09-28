PRAGMA foreign_keys=OFF;

CREATE TABLE benutzer_neu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  benutzername TEXT NOT NULL UNIQUE,
  passwort_hash TEXT NOT NULL,
  rolle TEXT NOT NULL CHECK (rolle IN ('admin','kasse','ausgabe','verwaltung','belegen')),
  erstellt_am TEXT NOT NULL
);

INSERT INTO benutzer_neu (id, benutzername, passwort_hash, rolle, erstellt_am)
  SELECT id, benutzername, passwort_hash, rolle, erstellt_am FROM benutzer;

DROP TABLE benutzer;
ALTER TABLE benutzer_neu RENAME TO benutzer;

UPDATE sqlite_sequence SET seq = MAX(
  seq,
  COALESCE((SELECT MAX(benutzer_id) FROM kassiervorgang), 0),
  COALESCE((SELECT MAX(storniert_von) FROM kaertchen), 0)
) WHERE name = 'benutzer';
INSERT INTO sqlite_sequence (name, seq)
  SELECT 'benutzer', MAX(
    COALESCE((SELECT MAX(benutzer_id) FROM kassiervorgang), 0),
    COALESCE((SELECT MAX(storniert_von) FROM kaertchen), 0))
  WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'benutzer');

CREATE TABLE sitzung (
  id TEXT PRIMARY KEY,
  benutzer_id INTEGER NOT NULL REFERENCES benutzer(id) ON DELETE CASCADE,
  ausgestellt_ms INTEGER NOT NULL
);
CREATE INDEX idx_sitzung_benutzer ON sitzung(benutzer_id);

PRAGMA foreign_keys=ON;

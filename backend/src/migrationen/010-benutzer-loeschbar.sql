PRAGMA foreign_keys=OFF;

CREATE TABLE kassiervorgang_neu (
  id INTEGER PRIMARY KEY,
  zeitpunkt TEXT NOT NULL,
  summe_cent INTEGER NOT NULL,
  benutzer_id INTEGER NOT NULL
);
INSERT INTO kassiervorgang_neu SELECT id, zeitpunkt, summe_cent, benutzer_id FROM kassiervorgang;
DROP TABLE kassiervorgang;
ALTER TABLE kassiervorgang_neu RENAME TO kassiervorgang;

CREATE TABLE kaertchen_neu (
  id INTEGER PRIMARY KEY,
  kassiervorgang_id INTEGER NOT NULL REFERENCES kassiervorgang(id),
  artikel_id INTEGER NOT NULL REFERENCES artikel(id),
  nummer INTEGER NOT NULL,
  artikel_name TEXT NOT NULL,
  artikel_farbe TEXT NOT NULL,
  preis_cent INTEGER NOT NULL,
  einkaufskosten_cent INTEGER,
  beilagen TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'in_bearbeitung'
    CHECK (status IN ('in_bearbeitung','abholbereit','abgeholt','storniert')),
  erstellt_am TEXT NOT NULL,
  abholbereit_am TEXT,
  abgeholt_am TEXT,
  storniert_am TEXT,
  storniert_von INTEGER,
  artikel_name_tr TEXT,
  beilagen_tr TEXT NOT NULL DEFAULT '[]'
);
INSERT INTO kaertchen_neu SELECT
  id, kassiervorgang_id, artikel_id, nummer, artikel_name, artikel_farbe, preis_cent,
  einkaufskosten_cent, beilagen, status, erstellt_am, abholbereit_am, abgeholt_am,
  storniert_am, storniert_von, artikel_name_tr, beilagen_tr
FROM kaertchen;
DROP TABLE kaertchen;
ALTER TABLE kaertchen_neu RENAME TO kaertchen;
CREATE INDEX idx_kaertchen_status ON kaertchen(status);
CREATE INDEX idx_kaertchen_erstellt ON kaertchen(erstellt_am);

PRAGMA foreign_keys=ON;

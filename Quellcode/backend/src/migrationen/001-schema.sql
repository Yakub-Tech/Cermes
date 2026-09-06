CREATE TABLE benutzer (
  id INTEGER PRIMARY KEY,
  benutzername TEXT NOT NULL UNIQUE,
  passwort_hash TEXT NOT NULL,
  rolle TEXT NOT NULL CHECK (rolle IN ('admin','kasse','ausgabe')),
  erstellt_am TEXT NOT NULL
);

CREATE TABLE artikel (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  farbe TEXT NOT NULL,
  preis_cent INTEGER NOT NULL,
  einkaufskosten_cent INTEGER,
  aktiv INTEGER NOT NULL DEFAULT 1,
  geloescht INTEGER NOT NULL DEFAULT 0,
  naechste_nummer INTEGER NOT NULL DEFAULT 1,
  sortierung INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE beilage (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  aktiv INTEGER NOT NULL DEFAULT 1,
  geloescht INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE artikel_beilage (
  artikel_id INTEGER NOT NULL REFERENCES artikel(id),
  beilage_id INTEGER NOT NULL REFERENCES beilage(id),
  PRIMARY KEY (artikel_id, beilage_id)
);

CREATE TABLE kassiervorgang (
  id INTEGER PRIMARY KEY,
  zeitpunkt TEXT NOT NULL,
  summe_cent INTEGER NOT NULL,
  benutzer_id INTEGER NOT NULL REFERENCES benutzer(id)
);

CREATE TABLE kaertchen (
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
  storniert_von INTEGER REFERENCES benutzer(id)
);
CREATE INDEX idx_kaertchen_status ON kaertchen(status);
CREATE INDEX idx_kaertchen_erstellt ON kaertchen(erstellt_am);

CREATE TABLE werbebild (
  id INTEGER PRIMARY KEY,
  dateiname TEXT NOT NULL,
  aktiv INTEGER NOT NULL DEFAULT 1,
  hochgeladen_am TEXT NOT NULL
);

CREATE TABLE einstellung (
  schluessel TEXT PRIMARY KEY,
  wert TEXT NOT NULL
);
INSERT INTO einstellung (schluessel, wert) VALUES ('abholbereit_warnminuten', '15');

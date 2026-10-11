CREATE TABLE audit_eintrag (
  id INTEGER PRIMARY KEY,
  zeitpunkt TEXT NOT NULL,
  benutzername TEXT NOT NULL,
  rolle TEXT,
  bereich TEXT NOT NULL,
  aktion TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_audit_bereich ON audit_eintrag(bereich, id);
CREATE INDEX idx_audit_zeitpunkt ON audit_eintrag(zeitpunkt);

CREATE TRIGGER audit_eintrag_kein_update BEFORE UPDATE ON audit_eintrag
BEGIN
  SELECT RAISE(ABORT, 'Audit-Einträge dürfen nicht geändert werden.');
END;

CREATE TRIGGER audit_eintrag_kein_delete BEFORE DELETE ON audit_eintrag
BEGIN
  SELECT RAISE(ABORT, 'Audit-Einträge dürfen nicht gelöscht werden.');
END;

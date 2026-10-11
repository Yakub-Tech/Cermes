ALTER TABLE sitzung ADD COLUMN letzte_aktivitaet_ms INTEGER NOT NULL DEFAULT 0;
UPDATE sitzung SET letzte_aktivitaet_ms = CAST(strftime('%s', 'now') AS INTEGER) * 1000;

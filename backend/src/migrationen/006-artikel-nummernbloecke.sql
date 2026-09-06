CREATE TABLE artikel_nummernblock (
  id INTEGER PRIMARY KEY,
  artikel_id INTEGER NOT NULL REFERENCES artikel(id),
  von INTEGER NOT NULL,
  bis INTEGER NOT NULL
);
CREATE INDEX idx_nummernblock_artikel ON artikel_nummernblock(artikel_id);

INSERT INTO artikel_nummernblock (artikel_id, von, bis)
  SELECT id, 1, 999999999 FROM artikel;

CREATE INDEX idx_kaertchen_tag_artikel ON kaertchen(substr(erstellt_am, 1, 10), artikel_id);

ALTER TABLE kassiervorgang ADD COLUMN kennung TEXT;
ALTER TABLE kassiervorgang ADD COLUMN anfrage TEXT;
ALTER TABLE kassiervorgang ADD COLUMN antwort TEXT;
CREATE UNIQUE INDEX kassiervorgang_kennung ON kassiervorgang(kennung) WHERE kennung IS NOT NULL;

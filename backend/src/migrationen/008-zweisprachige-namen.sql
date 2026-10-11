ALTER TABLE artikel ADD COLUMN name_tr TEXT;
ALTER TABLE beilage ADD COLUMN name_tr TEXT;
ALTER TABLE kaertchen ADD COLUMN artikel_name_tr TEXT;
ALTER TABLE kaertchen ADD COLUMN beilagen_tr TEXT NOT NULL DEFAULT '[]';

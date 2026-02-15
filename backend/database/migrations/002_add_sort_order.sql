ALTER TABLE todos ADD COLUMN sort_order INT NOT NULL DEFAULT 0;
UPDATE todos SET sort_order = id;

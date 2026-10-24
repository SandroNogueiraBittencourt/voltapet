-- Preserva photo_key (foto existente) e adiciona até duas imagens extras.
ALTER TABLE pet_reports ADD COLUMN photo_key_2 VARCHAR(255);
ALTER TABLE pet_reports ADD COLUMN photo_key_3 VARCHAR(255);

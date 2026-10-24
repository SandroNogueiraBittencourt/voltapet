-- VoltaPet V4: espécie/animal informado livremente quando pet_type = OTHER.
-- Não exige valor das ocorrências antigas (mantém compatibilidade).
ALTER TABLE pet_reports ADD COLUMN other_animal_type VARCHAR(100);
ALTER TABLE pet_reports ADD CONSTRAINT ck_pet_other_animal_type
    CHECK (other_animal_type IS NULL OR
           (pet_type = 'OTHER' AND length(btrim(other_animal_type)) > 0));

-- V6: cidade e bairro informados em cada avistamento.
-- Nullable para preservar avistamentos cadastrados antes do ViaCEP.
-- Novos cadastros exigem ambos os campos pela validação da API.
ALTER TABLE pet_sightings ADD COLUMN city VARCHAR(100);
ALTER TABLE pet_sightings ADD COLUMN neighborhood VARCHAR(100);

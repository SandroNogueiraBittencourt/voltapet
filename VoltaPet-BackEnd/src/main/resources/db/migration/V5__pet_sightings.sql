-- V5: relatos de avistamento privados, associados ao autor da ocorrência.
-- Não modifica ocorrências anteriores.
CREATE TABLE pet_sightings (
    id UUID PRIMARY KEY,
    pet_id UUID NOT NULL REFERENCES pet_reports(id),
    reporter_id UUID NOT NULL REFERENCES app_users(id),
    postal_code VARCHAR(9) NOT NULL,
    street VARCHAR(150) NOT NULL,
    house_number VARCHAR(20) NOT NULL,
    address_details VARCHAR(200),
    seen_at TIMESTAMPTZ NOT NULL,
    description VARCHAR(1000),
    photo_key_1 VARCHAR(255),
    photo_key_2 VARCHAR(255),
    photo_key_3 VARCHAR(255),
    video_key VARCHAR(255),
    video_mime_type VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_sighting_zip CHECK (postal_code ~ '^[0-9]{5}-?[0-9]{3}$'),
    CONSTRAINT ck_sighting_video CHECK ((video_key IS NULL) = (video_mime_type IS NULL))
);
CREATE INDEX idx_pet_sightings_pet_seen ON pet_sightings(pet_id, seen_at DESC);

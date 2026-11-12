-- V7: coordenadas escolhidas no mapa no momento do avistamento.
-- Relatos antigos continuam válidos, com coordenadas ausentes até serem informadas.
ALTER TABLE pet_sightings ADD COLUMN latitude NUMERIC(9,6);
ALTER TABLE pet_sightings ADD COLUMN longitude NUMERIC(9,6);
ALTER TABLE pet_sightings ADD CONSTRAINT ck_sighting_coordinates_pair
  CHECK ((latitude IS NULL) = (longitude IS NULL));
ALTER TABLE pet_sightings ADD CONSTRAINT ck_sighting_coordinates_range
  CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180);

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE app_users (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL
);

CREATE TABLE pet_reports (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    pet_type VARCHAR(20) NOT NULL CHECK (pet_type IN ('DOG', 'CAT', 'OTHER')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('LOST', 'FOUND', 'REUNITED')),
    description VARCHAR(2000) NOT NULL,
    city VARCHAR(100) NOT NULL,
    neighborhood VARCHAR(100) NOT NULL,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    location geography(Point, 4326) GENERATED ALWAYS AS (
        CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
            THEN ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography
            ELSE NULL END
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL,
    owner_id UUID NOT NULL REFERENCES app_users(id),
    CONSTRAINT coordinates_together CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE INDEX idx_pet_reports_created_at ON pet_reports(created_at DESC);
CREATE INDEX idx_pet_reports_status ON pet_reports(status);
CREATE INDEX idx_pet_reports_location ON pet_reports USING GIST(location);

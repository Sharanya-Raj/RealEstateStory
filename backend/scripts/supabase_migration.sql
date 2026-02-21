-- Run this in the Supabase SQL Editor (one time)
-- 1. Enable PostGIS for geo-radius queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create the listings table
CREATE TABLE IF NOT EXISTS listings (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name         TEXT NOT NULL,
    address      TEXT NOT NULL,
    city         TEXT,
    state        TEXT DEFAULT 'NJ',
    zip          TEXT,
    price        NUMERIC,
    bedrooms     INTEGER DEFAULT 1,
    bathrooms    INTEGER DEFAULT 1,
    sqft         INTEGER,
    amenities    TEXT[] DEFAULT '{}',
    pet_friendly BOOLEAN DEFAULT FALSE,
    has_gym      BOOLEAN DEFAULT FALSE,
    description  TEXT,
    source       TEXT DEFAULT 'apartments.com',
    source_url   TEXT,
    latitude     DOUBLE PRECISION,
    longitude    DOUBLE PRECISION,
    location     GEOGRAPHY(POINT, 4326),
    scraped_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Spatial index for fast radius queries
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING GIST (location);

-- 4. Index for price filtering
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings (price);

-- 5. Unique constraint to prevent duplicate scrapes
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_address_unique ON listings (address, name);

-- 6. Function: find listings within a radius of a point
CREATE OR REPLACE FUNCTION nearby_listings(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 16093,  -- ~10 miles
    max_price NUMERIC DEFAULT 99999,
    lim INTEGER DEFAULT 100
)
RETURNS SETOF listings
LANGUAGE sql STABLE
AS $$
    SELECT *
    FROM listings
    WHERE ST_DWithin(
        location,
        ST_MakePoint(lon, lat)::geography,
        radius_meters
    )
    AND (price <= max_price OR price IS NULL)
    ORDER BY price ASC NULLS LAST
    LIMIT lim;
$$;

-- Run this in the Supabase SQL Editor (one time)
-- ─────────────────────────────────────────────
-- geocode_cache: persistent geocoding cache so Nominatim is only hit once per address
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS geocode_cache (
    address_key  TEXT PRIMARY KEY,         -- normalized address (lowercase, trimmed)
    latitude     DOUBLE PRECISION NOT NULL,
    longitude    DOUBLE PRECISION NOT NULL,
    display_name TEXT,
    city         TEXT,
    zipcode      TEXT,
    cached_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast existence checks
CREATE INDEX IF NOT EXISTS idx_geocode_cache_key ON geocode_cache (address_key);
-- ─────────────────────────────────────────────
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

-- 7. RPC function: Upsert listing with proper PostGIS geography creation
CREATE OR REPLACE FUNCTION upsert_listing_with_location(
    p_name TEXT,
    p_address TEXT,
    p_city TEXT,
    p_state TEXT,
    p_zip TEXT,
    p_price NUMERIC,
    p_bedrooms INTEGER,
    p_bathrooms INTEGER,
    p_amenities TEXT[],
    p_pet_friendly BOOLEAN,
    p_has_gym BOOLEAN,
    p_description TEXT,
    p_source TEXT,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    listing_id UUID;
BEGIN
    INSERT INTO listings (
        name, address, city, state, zip, price, bedrooms, bathrooms,
        amenities, pet_friendly, has_gym, description, source,
        latitude, longitude, location
    )
    VALUES (
        p_name, p_address, p_city, p_state, p_zip, p_price, p_bedrooms, p_bathrooms,
        p_amenities, p_pet_friendly, p_has_gym, p_description, p_source,
        p_latitude, p_longitude,
        ST_Point(p_longitude, p_latitude)::geography
    )
    ON CONFLICT (address, name)
    DO UPDATE SET
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip = EXCLUDED.zip,
        price = EXCLUDED.price,
        bedrooms = EXCLUDED.bedrooms,
        bathrooms = EXCLUDED.bathrooms,
        amenities = EXCLUDED.amenities,
        pet_friendly = EXCLUDED.pet_friendly,
        has_gym = EXCLUDED.has_gym,
        description = EXCLUDED.description,
        source = EXCLUDED.source,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        location = EXCLUDED.location,
        scraped_at = NOW()
    RETURNING id INTO listing_id;
    
    RETURN listing_id;
END;
$$;

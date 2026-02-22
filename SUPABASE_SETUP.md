# 🗄️ Supabase Setup Guide

## Quick Start (8-Hour Sprint Edition)

### 1. Run the Migration (One Time Only)
Copy the entire contents of `backend/scripts/supabase_migration.sql` and paste it into your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Paste the entire migration SQL
5. Click "Run"

✅ This creates the `listings` table, indexes, and the `upsert_listing_with_location` RPC function.

---

### 2. Seed Your Database

You have two options:

#### Option A: Quick Seed from CSV (Recommended - 5 minutes)
```bash
cd backend
python scripts/seed_from_csv.py
```

This will:
- Load all listings from `data/listings.csv`
- Geocode missing coordinates (respects Nominatim rate limit)
- Properly populate the PostGIS `location` field
- Take ~5-10 minutes for 100 listings

#### Option B: Full Scrape (Slow - 2+ hours)
```bash
cd backend
python scripts/scrape_nj.py
```

⚠️ **Warning:** This uses Selenium to scrape Apartments.com for 20+ universities. It will:
- Require Chrome/ChromeDriver installed
- Take 2-3 hours to complete
- Geocode each apartment individually
- Respect Nominatim's 1 req/sec rate limit

**For your 8-hour sprint, use Option A!**

---

### 3. Test Everything Works

```bash
cd backend
python scripts/test_supabase.py
```

This will verify:
- ✅ Connection to Supabase
- ✅ Listings count
- ✅ College coordinate lookup
- ✅ Geo-radius queries
- ✅ Get listing by ID

Expected output:
```
🧪 SUPABASE INTEGRATION TEST
═══════════════════════════════════════════════════════════
✅ PASS: Connection
✅ PASS: Count Listings
✅ PASS: College Coords
✅ PASS: Geo-Radius Query
✅ PASS: Get By ID
═══════════════════════════════════════════════════════════
Total: 5/5 tests passed
🎉 All tests passed! Supabase is ready to use.
```

---

### 4. Environment Variables

Your `.env` file should already have:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
```

No changes needed if it's already working!

---

## What Was Fixed

### 🐛 Issues Before:
1. **Wrong coordinates**: All apartments got the university's lat/lon instead of their own
2. **PostGIS geography field**: String format `"POINT(x y)"` doesn't work with Supabase
3. **No geocoding**: Individual apartment addresses weren't being geocoded

### ✅ Issues Fixed:
1. **Individual geocoding**: Each apartment now gets geocoded separately
2. **RPC function**: New `upsert_listing_with_location()` properly creates PostGIS geography
3. **Rate limiting**: Respects Nominatim's 1 req/sec limit
4. **Duplicate handling**: Upserts prevent duplicate scrapes

---

## Troubleshooting

### "No listings found"
Run the seed script: `python scripts/seed_from_csv.py`

### "Geocoding failed"
Nominatim rate limit hit. The scripts handle this gracefully, but some listings may have (0, 0) coords. That's OK - they'll still be in the DB.

### "RPC function not found"
Re-run the migration SQL in Supabase SQL Editor.

### "Connection failed"
Check your `SUPABASE_URL` and `SUPABASE_KEY` in `.env`

---

## API Endpoints (Already Working)

Once seeded, your backend will use Supabase automatically:

- `GET /api/listings?college=Rutgers&radius=10&max_price=2000` - Geo-radius search
- `GET /api/listings/{id}` - Get single listing
- `GET /api/listings` - Get all listings (fallback if no college)

The backend already has fallback to CSV if Supabase fails, so you're covered!

---

## Next Steps After Supabase

Once this is working:
1. ✅ Test frontend can fetch listings
2. ✅ Verify map coordinates show correct apartment locations
3. ⏭️ Move on to fixing other critical issues (see TODO.md)

"""
Quick test of the Craigslist scraper to debug coordinate extraction.

Usage:
    cd backend
    python scripts/test_craigslist.py
"""
import logging
import os
import sys

# Add backend/ to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from services.craigslist import get_craigslist

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("test_craigslist")


def main():
    logger.info("🧪 Testing Craigslist scraper...")
    
    # Test with Rutgers (should have lots of results)
    university = "Rutgers University"
    
    logger.info("Scraping for: %s", university)
    apartments = get_craigslist(university)
    
    logger.info("")
    logger.info("=" * 60)
    logger.info("Results: %d apartments found", len(apartments))
    logger.info("=" * 60)
    
    if apartments:
        # Show first 5 listings
        for i, apt in enumerate(apartments[:5], 1):
            logger.info("")
            logger.info("Listing #%d:", i)
            logger.info("  Name:     %s", apt.name)
            logger.info("  Address:  %s", apt.address)
            logger.info("  Price:    %s", apt.price)
            logger.info("  Bedrooms: %s", apt.bedrooms)
            logger.info("  Coords:   lat=%.4f, lon=%.4f", apt.latitude, apt.longitude)
            logger.info("  Source:   %s", apt.source)
    
    logger.info("")
    logger.info("=" * 60)
    
    # Count how many have valid coordinates
    with_coords = sum(1 for apt in apartments if apt.latitude != 0.0 and apt.longitude != 0.0)
    logger.info("✅ Listings with coordinates: %d / %d (%.1f%%)", 
               with_coords, len(apartments), 
               (with_coords / len(apartments) * 100) if apartments else 0)


if __name__ == "__main__":
    main()

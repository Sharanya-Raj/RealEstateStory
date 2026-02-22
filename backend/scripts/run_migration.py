"""
Run the Supabase migration automatically via SQL execution.

Usage:
    cd backend
    python scripts/run_migration.py
"""
import logging
import os
import sys
import requests

# Add backend/ to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("migration")


def main():
    logger.info("🔧 Running Supabase migration...")
    
    # Check environment variables
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    
    if not SUPABASE_URL:
        logger.error("❌ SUPABASE_URL not set!")
        return False
    if not SUPABASE_KEY:
        logger.error("❌ SUPABASE_KEY not set!")
        return False
    
    # Read the migration SQL
    migration_path = os.path.join(os.path.dirname(__file__), "supabase_migration.sql")
    
    if not os.path.exists(migration_path):
        logger.error("❌ Migration file not found: %s", migration_path)
        return False
    
    with open(migration_path, "r", encoding="utf-8") as f:
        sql = f.read()
    
    logger.info("✅ Loaded migration SQL (%d characters)", len(sql))
    
    # Execute via Supabase REST API
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    
    # Split SQL into individual statements and execute them
    # This is needed because PostgREST doesn't support multi-statement SQL
    statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    logger.info("📤 Executing %d SQL statements...", len(statements))
    
    success_count = 0
    error_count = 0
    
    for i, stmt in enumerate(statements, 1):
        # Skip comments and empty statements
        if not stmt or stmt.startswith('--'):
            continue
            
        logger.info("   [%d/%d] Executing: %s...", i, len(statements), stmt[:60])
        
        try:
            # Use the /rest/v1/rpc endpoint with a custom query
            # Actually, we need to use the SQL editor API or direct psql
            # PostgREST doesn't allow arbitrary SQL execution for security reasons
            
            # Alternative: Use supabase-py client's .rpc() with a custom function
            # But we need to create that function first... chicken and egg problem!
            
            # The proper way is through the Supabase Management API
            # But that requires a service_role key
            
            logger.warning("⚠️  Cannot execute raw SQL via REST API (security restriction)")
            logger.info("    You need to run this manually in the Supabase SQL Editor")
            break
            
        except Exception as e:
            logger.error("❌ Failed to execute statement %d: %s", i, e)
            error_count += 1
    
    logger.info("")
    logger.info("=" * 60)
    logger.info("MANUAL MIGRATION REQUIRED")
    logger.info("=" * 60)
    logger.info("")
    logger.info("Supabase doesn't allow raw SQL execution via the REST API.")
    logger.info("You need to run the migration manually:")
    logger.info("")
    logger.info("1. Go to: %s", SUPABASE_URL.replace('https://', 'https://app.supabase.com/project/'))
    logger.info("2. Click 'SQL Editor' in the left sidebar")
    logger.info("3. Click 'New Query'")
    logger.info("4. Copy the contents of: backend/scripts/supabase_migration.sql")
    logger.info("5. Paste and click 'Run'")
    logger.info("")
    logger.info("OR use psql directly:")
    logger.info("")
    logger.info("  psql 'postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres' < backend/scripts/supabase_migration.sql")
    logger.info("")
    
    return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

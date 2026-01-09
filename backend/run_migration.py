"""
Migration runner script with PostgreSQL direct connection
Usage: python run_migration.py 007_fix_order_items_sku_id
"""
import sys
import os
from pathlib import Path

def run_migration(migration_name: str):
    """Run a SQL migration by name"""
    migrations_dir = Path(__file__).parent / "migrations"
    migration_file = migrations_dir / f"{migration_name}.sql"

    if not migration_file.exists():
        print(f"ERROR: Migration file {migration_name}.sql not found")
        sys.exit(1)

    print(f"Reading migration: {migration_file}")
    with open(migration_file, 'r') as f:
        sql_content = f.read()

    print(f"\nMigration SQL:\n{'='*60}\n{sql_content}\n{'='*60}\n")

    try:
        import psycopg2
        from app.core.config import settings

        # Extract project ref from Supabase URL
        # Format: https://hjfdepboaetelztegfip.supabase.co
        project_ref = settings.SUPABASE_URL.split('//')[1].split('.')[0]

        # Construct PostgreSQL connection URL
        # Note: You need to get the database password from Supabase dashboard
        # For now, we'll use the service key approach
        print(f"WARNING: To run this migration, you need the database password.")
        print(f"   1. Go to https://supabase.com/dashboard/project/{project_ref}/settings/database")
        print(f"   2. Find your database connection string")
        print(f"   3. Run: psql 'postgresql://postgres:[PASSWORD]@db.{project_ref}.supabase.co:5432/postgres' < {migration_file}")
        print(f"\nOR use Supabase SQL Editor:")
        print(f"   https://supabase.com/dashboard/project/{project_ref}/sql/new")

        return False

    except ImportError:
        print("WARNING: psycopg2 not installed.")
        print("\nTo install: pip install psycopg2-binary")
        print(f"\nAlternatively, run this SQL in Supabase SQL Editor:")
        print(f"   https://supabase.com/dashboard/project/hjfdepboaetelztegfip/sql/new")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_migration.py <migration_name>")
        print("Example: python run_migration.py 007_fix_order_items_sku_id")
        sys.exit(1)

    migration_name = sys.argv[1]
    run_migration(migration_name)

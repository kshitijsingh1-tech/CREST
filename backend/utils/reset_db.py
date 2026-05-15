"""
CREST — Database Reset Utility
Wipes all tables and re-seeds default data (Regions, Super Admin).
USE WITH CAUTION.
"""

from backend.utils.db import Base, engine, SessionLocal
from backend.utils.init_db import initialize_database
from backend.utils.logger import get_logger

logger = get_logger("crest.db.reset")

def reset_database():
    logger.warning("DROPPING ALL TABLES...")
    # 1. Drop everything
    Base.metadata.drop_all(bind=engine)
    
    # 2. Re-create and re-seed
    logger.info("RE-INITIALIZING DATABASE...")
    initialize_database()
    
    logger.info("DATABASE RESET COMPLETE. Ready for a fresh start.")

if __name__ == "__main__":
    reset_database()

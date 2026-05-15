from __future__ import annotations

from backend.models.complaint import Channel
from backend.utils.db import Base, SessionLocal, engine
from backend.utils.logger import get_logger
from backend.models.user import Region, User
from backend.utils.auth import get_password_hash

logger = get_logger("crest.db.init")

DEFAULT_CHANNELS = ("email", "whatsapp", "app", "twitter", "voice", "branch")


def initialize_database() -> None:
    """
    Create the ORM-backed schema for the current database backend and ensure
    the base channel rows exist before the API starts serving traffic.
    """
    # Import models so SQLAlchemy registers every table on Base.metadata.
    import backend.models.complaint  # noqa: F401
    import backend.models.knowledge  # noqa: F401
    import backend.models.user # noqa: F401

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = {name for (name,) in db.query(Channel.name).all()}
        missing = [name for name in DEFAULT_CHANNELS if name not in existing]
        if missing:
            db.add_all(Channel(name=name, is_active=True) for name in missing)
            db.commit()
            logger.info("Seeded default channels", extra={"channels": missing})

        # Seed default regions
        if db.query(Region).count() == 0:
            db.add_all([
                Region(name="Delhi"),
                Region(name="Mumbai"),
                Region(name="Bangalore")
            ])
            db.commit()
            logger.info("Seeded default regions")

        # Seed Super Admin
        if db.query(User).filter(User.role == "SUPER_ADMIN").count() == 0:
            admin = User(
                email="admin@unionbank.com",
                name="Super Admin",
                hashed_password=get_password_hash("admin123"),
                role="SUPER_ADMIN"
            )
            db.add(admin)
            db.commit()
            logger.info("Seeded default Super Admin")
    finally:
        db.close()

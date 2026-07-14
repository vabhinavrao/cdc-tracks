from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app import config

# Create engine with conservative pooling constraints for Render and Neon
engine = create_engine(
    config.DATABASE_URL,
    pool_size=5,
    max_overflow=2,
    pool_pre_ping=True,
    pool_recycle=300
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

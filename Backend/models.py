import os
from datetime import datetime

from dotenv import load_dotenv
from sqlalchemy import (Boolean, Column, DateTime, Integer, String, Text,
                        create_engine)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class GenerationHistory(Base):
    __tablename__ = "generation_history"
    
    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, nullable=False)
    rows_generated = Column(Integer, nullable=False)
    data_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, nullable=True)  # Will link to User.id
    custom_prompt = Column(Text, nullable=True)  # For custom domain prompts

# Database setup - UPDATED FOR POSTGRESQL SUPPORT
DATABASE_URL = os.getenv("DATABASE_URL")

# Railway provides DATABASE_URL with postgres:// which SQLAlchemy 2.0 doesn't support
# Need to convert to postgresql://
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    print(f"✅ Converted postgres:// to postgresql:// for SQLAlchemy 2.0 compatibility")

# Fallback to SQLite for local development
if not DATABASE_URL:
    print("⚠️  No DATABASE_URL found, using SQLite for local development")
    DATABASE_URL = "sqlite:///./synthetic_app.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # PostgreSQL connection with connection pooling for production
    print(f"✅ Using PostgreSQL database")
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,      # Verify connections before using
        pool_recycle=3600,       # Recycle connections after 1 hour
        pool_size=10,            # Maximum number of connections to keep open
        max_overflow=20,         # Maximum number of connections to create beyond pool_size
        echo=False               # Set to True for SQL query logging (debugging)
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all tables
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
except Exception as e:
    print(f"❌ Error creating database tables: {e}")
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

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./synthetic_app.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all tables
Base.metadata.create_all(bind=engine)
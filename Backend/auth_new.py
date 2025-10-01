import os
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from models import SessionLocal, User
from passlib.context import CryptContext
from sqlalchemy.orm import Session

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Password reset token expiration (e.g., 15 minutes)
RESET_TOKEN_EXPIRE_MINUTES = 15

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class AuthManager:
    def _truncate_password(self, password: str) -> str:
        """Truncate password to 72 bytes for bcrypt compatibility"""
        if len(password.encode('utf-8')) > 72:
            return password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
        return password

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against its hash"""
        # Truncate password to 72 bytes for bcrypt compatibility
        truncated_password = self._truncate_password(plain_password)
        return pwd_context.verify(truncated_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        # Truncate password to 72 bytes for bcrypt compatibility
        truncated_password = self._truncate_password(password)
        return pwd_context.hash(truncated_password)
    
    # This is the missing method that caused the error
    def verify_token(self, token: str) -> Optional[str]:
        """Verify JWT token and return username"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                return None
            return username
        except jwt.PyJWTError:
            return None

    def create_access_token(self, data: dict) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    # --- NEW: Password Reset Token Functions ---
    def create_reset_token(self, data: dict) -> str:
        """Create a JWT token for password reset with a short expiration"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def verify_reset_token(self, token: str) -> Optional[str]:
        """Verify a JWT password reset token and return email"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                return None
            return email
        except jwt.PyJWTError:
            return None

    def update_password(self, db: Session, user: User, new_password: str):
        """Update a user's password in the database"""
        hashed_password = self.get_password_hash(new_password)
        user.hashed_password = hashed_password
        db.add(user)
        db.commit()
        db.refresh(user)
        
    def get_user(self, db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username).first()

    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()

    def authenticate_user(self, db: Session, username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password"""
        user = self.get_user(db, username)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user

    def create_user(self, db: Session, username: str, email: str, password: str) -> User:
        """Create a new user"""
        hashed_password = self.get_password_hash(password)
        db_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user


# Global auth instance
auth_manager = AuthManager()


def get_db():
    """Database dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    username = auth_manager.verify_token(token)
    if username is None:
        raise credentials_exception
    
    user = auth_manager.get_user(db, username=username)
    if user is None:
        raise credentials_exception
    
    return user

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
        try:
            # Convert to bytes and truncate if needed
            password_bytes = password.encode('utf-8')
            if len(password_bytes) > 72:
                print(f"🔍 Password truncation needed: {len(password_bytes)} bytes -> 72 bytes")
                # Truncate to 72 bytes and decode back
                truncated_bytes = password_bytes[:72]
                # Find the last valid UTF-8 character boundary
                while len(truncated_bytes) > 0:
                    try:
                        truncated_password = truncated_bytes.decode('utf-8')
                        print(f"✅ Password truncated successfully")
                        return truncated_password
                    except UnicodeDecodeError:
                        truncated_bytes = truncated_bytes[:-1]
                print("⚠️ Password truncation fallback to empty string")
                return ""  # Fallback if all fails
            return password
        except Exception as e:
            print(f"❌ Password truncation error: {e}")
            # Fallback: simple string truncation
            fallback_password = password[:72] if len(password) > 72 else password
            print(f"🔄 Using fallback truncation: {len(fallback_password)} chars")
            return fallback_password

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against its hash"""
        try:
            # Truncate password to 72 bytes for bcrypt compatibility
            truncated_password = self._truncate_password(plain_password)
            print(f"🔍 Verifying password: original={len(plain_password)} chars, truncated={len(truncated_password)} chars")
            result = pwd_context.verify(truncated_password, hashed_password)
            print(f"🔍 Password verification result: {result}")
            return result
        except Exception as e:
            print(f"❌ Password verification error: {e}")
            return False

    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        try:
            # Truncate password to 72 bytes for bcrypt compatibility
            truncated_password = self._truncate_password(password)
            print(f"🔍 Hashing password: original={len(password)} chars, truncated={len(truncated_password)} chars")
            hashed = pwd_context.hash(truncated_password)
            print(f"✅ Password hashed successfully")
            return hashed
        except Exception as e:
            print(f"❌ Password hashing error: {e}")
            raise e
    
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
        print(f"🔍 Updating password for user: {user.username}")
        hashed_password = self.get_password_hash(new_password)
        user.hashed_password = hashed_password
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"✅ Password updated successfully for user: {user.username}")
        
    def get_user(self, db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        print(f"🔍 Looking up user: {username}")
        user = db.query(User).filter(User.username == username).first()
        print(f"🔍 User lookup result: {'Found' if user else 'Not found'}")
        return user

    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        print(f"🔍 Looking up user by email: {email}")
        user = db.query(User).filter(User.email == email).first()
        print(f"🔍 Email lookup result: {'Found' if user else 'Not found'}")
        return user

    def authenticate_user(self, db: Session, username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password"""
        print(f"🔍 Authenticating user: {username}")
        user = self.get_user(db, username)
        if not user:
            print(f"❌ User not found: {username}")
            return None
        
        print(f"🔍 User found, verifying password")
        if not self.verify_password(password, user.hashed_password):
            print(f"❌ Password verification failed for user: {username}")
            return None
        
        print(f"✅ Authentication successful for user: {username}")
        return user

    def create_user(self, db: Session, username: str, email: str, password: str) -> User:
        """Create a new user"""
        print(f"🔍 Creating new user: {username} with email: {email}")
        print(f"🔍 Password length: {len(password)} characters")
        
        try:
            hashed_password = self.get_password_hash(password)
            db_user = User(
                username=username,
                email=email,
                hashed_password=hashed_password
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            print(f"✅ User created successfully: {username} (ID: {db_user.id})")
            return db_user
        except Exception as e:
            print(f"❌ User creation failed: {e}")
            db.rollback()
            raise e


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

"""
Security utilities: JWT authentication, password hashing, API key management
Following STRIDE security model from v4.0 specification
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import hashlib
import secrets

from app.core.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token
    S (Spoofing): Strict JWT authentication
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    to_encode.setdefault("type", "access")

    # JWT 规范要求 sub 为字符串；python-jose 解码时会强校验，故统一转为 str
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({"exp": expire, "type": "refresh"})

    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def generate_api_key() -> str:
    """
    Generate a secure API key for enterprise users
    Returns: Plain text API key (only shown once to user)
    """
    return f"pdf_{secrets.token_urlsafe(32)}"


def hash_api_key(api_key: str) -> str:
    """
    Hash API key for database storage
    S (Spoofing): API Keys stored as SHA-256 hashes only, never in plaintext
    """
    return hashlib.sha256(api_key.encode()).hexdigest()


def verify_api_key(plain_key: str, hashed_key: str) -> bool:
    """Verify API key against its hash"""
    return hash_api_key(plain_key) == hashed_key


def validate_file_magic_number(file_content: bytes, expected_type: str) -> bool:
    """
    Validate file type using magic number (file header)
    T (Tampering): Magic number validation, not just file extension

    Args:
        file_content: First bytes of the file
        expected_type: Expected file type (pdf, jpg, png, etc.)

    Returns:
        bool: True if file type matches
    """
    magic_numbers = {
        "pdf": b"%PDF",
        "jpg": b"\xff\xd8\xff",
        "jpeg": b"\xff\xd8\xff",
        "png": b"\x89PNG\r\n\x1a\n",
        "docx": b"PK\x03\x04",  # ZIP-based (Office Open XML)
        "xlsx": b"PK\x03\x04",
        "pptx": b"PK\x03\x04",
    }

    if expected_type not in magic_numbers:
        return False

    magic = magic_numbers[expected_type]
    return file_content.startswith(magic)


def generate_csrf_token() -> str:
    """Generate CSRF token"""
    return secrets.token_urlsafe(32)


def verify_csrf_token(token: str, stored_token: str) -> bool:
    """Verify CSRF token"""
    return secrets.compare_digest(token, stored_token)

"""
安全工具单元测试（纯函数，无需基础设施）
覆盖：密码哈希、JWT 编解码、API Key 哈希、魔术数字校验
"""
import os
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_pdfflow.db")

from datetime import timedelta

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_api_key,
    hash_api_key,
    verify_api_key,
    validate_file_magic_number,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = get_password_hash("SecurePass123!")
        assert hashed != "SecurePass123!"
        assert hashed.startswith("$2")  # bcrypt 前缀

    def test_verify_correct_password(self):
        hashed = get_password_hash("SecurePass123!")
        assert verify_password("SecurePass123!", hashed) is True

    def test_verify_wrong_password(self):
        hashed = get_password_hash("SecurePass123!")
        assert verify_password("WrongPass", hashed) is False

    def test_same_password_different_hash(self):
        # bcrypt 自带 salt，两次哈希应不同
        assert get_password_hash("abc12345") != get_password_hash("abc12345")


class TestJWT:
    def test_access_token_roundtrip(self):
        token = create_access_token({"sub": 42})
        payload = decode_token(token)
        assert payload["sub"] == "42"  # sub 按 JWT 规范以字符串存储
        assert payload["type"] == "access"

    def test_refresh_token_type(self):
        token = create_refresh_token({"sub": 7})
        payload = decode_token(token)
        assert payload["type"] == "refresh"

    def test_invalid_token_returns_none(self):
        assert decode_token("not.a.valid.token") is None

    def test_expired_token_returns_none(self):
        token = create_access_token({"sub": 1}, expires_delta=timedelta(seconds=-1))
        assert decode_token(token) is None


class TestAPIKey:
    def test_generated_key_prefix(self):
        key = generate_api_key()
        assert key.startswith("pdf_")

    def test_hash_then_verify(self):
        key = generate_api_key()
        hashed = hash_api_key(key)
        assert hashed != key                 # 不明文落库
        assert len(hashed) == 64             # SHA-256 hex
        assert verify_api_key(key, hashed) is True
        assert verify_api_key("pdf_wrong", hashed) is False


class TestMagicNumber:
    def test_valid_pdf(self):
        assert validate_file_magic_number(b"%PDF-1.4 ...", "pdf") is True

    def test_invalid_pdf(self):
        assert validate_file_magic_number(b"<html>", "pdf") is False

    def test_png(self):
        assert validate_file_magic_number(b"\x89PNG\r\n\x1a\n", "png") is True

    def test_unknown_type(self):
        assert validate_file_magic_number(b"anything", "exe") is False

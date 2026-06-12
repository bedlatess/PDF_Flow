"""Cryptographic helpers for payment provider adapters."""

from __future__ import annotations

import base64
import hashlib
import hmac
from urllib.parse import urlencode

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def canonical_query(params: dict, *, exclude: set[str] | None = None) -> str:
    exclude = exclude or set()
    pairs = [
        (str(key), "" if value is None else str(value))
        for key, value in params.items()
        if key not in exclude and value is not None and value != ""
    ]
    return "&".join(f"{key}={value}" for key, value in sorted(pairs))


def form_urlencode(params: dict) -> str:
    return urlencode({key: value for key, value in params.items() if value is not None})


def md5_upper(value: str) -> str:
    return hashlib.md5(value.encode("utf-8")).hexdigest().upper()


def hmac_sha256_hex(secret: str, value: str) -> str:
    return hmac.new(secret.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def rsa2_sign(private_key_pem: str, value: str) -> str:
    private_key = serialization.load_pem_private_key(private_key_pem.encode("utf-8"), password=None)
    signature = private_key.sign(value.encode("utf-8"), padding.PKCS1v15(), hashes.SHA256())
    return base64.b64encode(signature).decode("ascii")


def rsa2_verify(public_key_pem: str, value: str, signature: str) -> bool:
    public_key = serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
    try:
        public_key.verify(
            base64.b64decode(signature),
            value.encode("utf-8"),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except Exception:
        return False


def wechat_pay_sign(private_key_pem: str, method: str, url_path: str, timestamp: str, nonce: str, body: str) -> str:
    message = f"{method}\n{url_path}\n{timestamp}\n{nonce}\n{body}\n"
    return rsa2_sign(private_key_pem, message)


def wechat_pay_verify(public_key_pem: str, timestamp: str, nonce: str, body: bytes, signature: str) -> bool:
    message = f"{timestamp}\n{nonce}\n{body.decode('utf-8')}\n"
    return rsa2_verify(public_key_pem, message, signature)


def aesgcm_decrypt_base64(api_v3_key: str, nonce: str, ciphertext: str, associated_data: str) -> bytes:
    aesgcm = AESGCM(api_v3_key.encode("utf-8"))
    return aesgcm.decrypt(
        nonce.encode("utf-8"),
        base64.b64decode(ciphertext),
        associated_data.encode("utf-8"),
    )

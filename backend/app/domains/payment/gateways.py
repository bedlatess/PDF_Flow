"""Hosted payment gateway helpers for EPay and crypto-payment providers."""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlencode

from app.domains.payment.crypto import canonical_query, hmac_sha256_hex, md5_upper


@dataclass(frozen=True)
class HostedGatewayConfig:
    provider: str
    merchant_id: str
    secret: str
    create_url: str
    notify_url: str | None = None
    return_url: str | None = None
    sign_type: str = "md5"
    currency: str = "USD"
    extra: dict | None = None


def parse_gateway_config(provider: str, raw: dict | None) -> HostedGatewayConfig:
    raw = raw or {}
    return HostedGatewayConfig(
        provider=provider,
        merchant_id=str(raw.get("merchant_id") or raw.get("pid") or ""),
        secret=str(raw.get("secret") or raw.get("key") or ""),
        create_url=str(raw.get("create_url") or raw.get("pay_url") or ""),
        notify_url=raw.get("notify_url"),
        return_url=raw.get("return_url"),
        sign_type=str(raw.get("sign_type") or "md5").lower(),
        currency=str(raw.get("currency") or "USD"),
        extra=dict(raw.get("extra") or {}),
    )


def sign_gateway_params(params: dict, secret: str, sign_type: str = "md5") -> str:
    canonical = canonical_query(params, exclude={"sign", "sign_type"})
    if sign_type == "hmac-sha256":
        return hmac_sha256_hex(secret, canonical)
    return md5_upper(f"{canonical}{secret}")


def build_gateway_url(base_url: str, params: dict) -> str:
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}{urlencode(params)}"

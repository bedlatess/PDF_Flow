from datetime import datetime, timedelta


def _register(client, email="enterprise@example.com", password="SecurePass123!"):
    return client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Enterprise User",
    })


def _login(client, email="enterprise@example.com", password="SecurePass123!"):
    return client.post("/api/v1/auth/login", data={
        "username": email,
        "password": password,
    })


def _enterprise_headers(client, email="enterprise@example.com"):
    from app.core.database import get_db
    from app.models.user import User, UserRole

    _register(client, email=email)
    db = next(client.app.dependency_overrides[get_db]())
    try:
        user = db.query(User).filter(User.email == email).first()
        user.role = UserRole.ENTERPRISE
        db.commit()
    finally:
        db.close()

    token = _login(client, email=email).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _free_headers(client, email="free-enterprise@example.com"):
    _register(client, email=email)
    token = _login(client, email=email).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _add_usage(db, user_id, endpoint, days_ago=0, **overrides):
    from app.models.user import UsageLog

    log = UsageLog(
        user_id=user_id,
        endpoint=endpoint,
        method=overrides.pop("method", "POST"),
        file_type=overrides.pop("file_type", "pdf"),
        file_size=overrides.pop("file_size", 100),
        processing_time=overrides.pop("processing_time", 50),
        success=overrides.pop("success", True),
        error_message=overrides.pop("error_message", None),
        tokens_used=overrides.pop("tokens_used", 1000),
        cost=overrides.pop("cost", 20),
        ip_address=overrides.pop("ip_address", "127.0.0.1"),
        user_agent=overrides.pop("user_agent", "pytest"),
        created_at=datetime.utcnow() - timedelta(days=days_ago),
    )
    db.add(log)
    return log


def test_enterprise_endpoints_require_enterprise_role(client):
    headers = _free_headers(client)

    response = client.get("/api/v1/enterprise/dashboard", headers=headers)

    assert response.status_code == 403
    assert response.json()["detail"] == "Enterprise subscription required"


def test_api_key_lifecycle_only_exposes_plain_key_on_create(client):
    from app.core.database import get_db
    from app.core.security import verify_api_key
    from app.models.user import APIKey

    headers = _enterprise_headers(client)

    create_response = client.post(
        "/api/v1/enterprise/api-keys",
        headers=headers,
        json={"name": "CI key", "rate_limit": 120, "expires_in_days": 7},
    )

    assert create_response.status_code == 201
    body = create_response.json()
    assert body["name"] == "CI key"
    assert body["api_key"].startswith("pdf_")
    assert body["key_prefix"] == body["api_key"][:12]
    assert body["rate_limit"] == 120
    assert body["expires_at"] is not None

    db = next(client.app.dependency_overrides[get_db]())
    try:
        stored = db.query(APIKey).filter(APIKey.id == body["id"]).first()
        assert stored is not None
        assert stored.key_hash != body["api_key"]
        assert verify_api_key(body["api_key"], stored.key_hash)
    finally:
        db.close()

    list_response = client.get("/api/v1/enterprise/api-keys", headers=headers)
    assert list_response.status_code == 200
    listed = list_response.json()["keys"][0]
    assert listed["api_key"] is None

    patch_response = client.patch(
        f"/api/v1/enterprise/api-keys/{body['id']}",
        headers=headers,
        json={"name": "Renamed", "is_active": False, "rate_limit": 10},
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["name"] == "Renamed"
    assert patch_response.json()["is_active"] is False
    assert patch_response.json()["rate_limit"] == 10

    delete_response = client.delete(
        f"/api/v1/enterprise/api-keys/{body['id']}",
        headers=headers,
    )
    assert delete_response.status_code == 204

    missing_response = client.get(
        f"/api/v1/enterprise/api-keys/{body['id']}",
        headers=headers,
    )
    assert missing_response.status_code == 404


def test_enterprise_resources_are_scoped_to_current_user(client):
    owner_headers = _enterprise_headers(client, email="owner@example.com")
    other_headers = _enterprise_headers(client, email="other@example.com")

    create_response = client.post(
        "/api/v1/enterprise/api-keys",
        headers=owner_headers,
        json={"name": "Owner key"},
    )
    key_id = create_response.json()["id"]

    other_get = client.get(f"/api/v1/enterprise/api-keys/{key_id}", headers=other_headers)
    other_delete = client.delete(f"/api/v1/enterprise/api-keys/{key_id}", headers=other_headers)

    assert other_get.status_code == 404
    assert other_delete.status_code == 404


def test_usage_logs_and_stats_are_filtered_and_aggregated(client):
    from app.core.database import get_db
    from app.models.user import User

    email = "usage@example.com"
    headers = _enterprise_headers(client, email=email)

    db = next(client.app.dependency_overrides[get_db]())
    try:
        user = db.query(User).filter(User.email == email).first()
        _add_usage(db, user.id, "/api/v1/files/merge", file_size=1000, tokens_used=1500, cost=15)
        _add_usage(db, user.id, "/api/v1/files/merge", file_size=2000, tokens_used=2500, cost=25)
        _add_usage(
            db,
            user.id,
            "/api/v1/files/ocr",
            file_size=None,
            tokens_used=500,
            cost=5,
            success=False,
            error_message="ocr failed",
        )
        _add_usage(db, user.id, "/api/v1/files/old", days_ago=40, file_size=9999)
        db.commit()
    finally:
        db.close()

    logs_response = client.get(
        "/api/v1/enterprise/usage/logs?endpoint=/api/v1/files/merge",
        headers=headers,
    )
    assert logs_response.status_code == 200
    assert len(logs_response.json()) == 2
    assert all(log["endpoint"] == "/api/v1/files/merge" for log in logs_response.json())

    stats_response = client.get("/api/v1/enterprise/usage/stats", headers=headers)
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["total_requests"] == 3
    assert stats["successful_requests"] == 2
    assert stats["failed_requests"] == 1
    assert stats["total_files_processed"] == 2
    assert stats["total_bytes_processed"] == 3000
    assert stats["total_tokens_used"] == 4500
    assert stats["total_cost_cents"] == 45
    assert stats["endpoint_breakdown"]["/api/v1/files/merge"] == 2
    assert stats["endpoint_breakdown"]["/api/v1/files/ocr"] == 1
    assert stats["daily_breakdown"]


def test_webhook_lifecycle_and_limit(client):
    headers = _enterprise_headers(client, email="webhook@example.com")

    create_response = client.post(
        "/api/v1/enterprise/webhooks",
        headers=headers,
        json={
            "url": "https://example.com/hook",
            "events": ["job.completed"],
            "secret": "secret",
            "is_active": True,
        },
    )

    assert create_response.status_code == 201
    webhook = create_response.json()
    assert webhook["events"] == ["job.completed"]
    assert webhook["is_active"] is True

    update_response = client.patch(
        f"/api/v1/enterprise/webhooks/{webhook['id']}",
        headers=headers,
        json={
            "url": "https://example.com/updated",
            "events": ["job.failed", "quota.warning"],
            "is_active": False,
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["events"] == ["job.failed", "quota.warning"]
    assert update_response.json()["is_active"] is False

    list_response = client.get("/api/v1/enterprise/webhooks", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1

    for index in range(4):
        response = client.post(
            "/api/v1/enterprise/webhooks",
            headers=headers,
            json={
                "url": f"https://example.com/hook-{index}",
                "events": ["job.completed"],
            },
        )
        assert response.status_code == 201

    limit_response = client.post(
        "/api/v1/enterprise/webhooks",
        headers=headers,
        json={"url": "https://example.com/too-many", "events": ["job.completed"]},
    )
    assert limit_response.status_code == 400
    assert limit_response.json()["detail"] == "Maximum 5 webhooks per user"

    delete_response = client.delete(
        f"/api/v1/enterprise/webhooks/{webhook['id']}",
        headers=headers,
    )
    assert delete_response.status_code == 204

    missing_response = client.get(
        f"/api/v1/enterprise/webhooks/{webhook['id']}",
        headers=headers,
    )
    assert missing_response.status_code == 404


def test_billing_and_dashboard_summarize_current_month(client):
    from app.core.database import get_db
    from app.models.user import APIKey, User, Webhook
    from app.schemas.enterprise import TokenPricing

    email = "dashboard@example.com"
    headers = _enterprise_headers(client, email=email)

    db = next(client.app.dependency_overrides[get_db]())
    try:
        user = db.query(User).filter(User.email == email).first()
        db.add_all([
            APIKey(
                user_id=user.id,
                name="Active",
                key_hash="hash-1",
                key_prefix="pdf_active",
                is_active=True,
            ),
            APIKey(
                user_id=user.id,
                name="Inactive",
                key_hash="hash-2",
                key_prefix="pdf_inact",
                is_active=False,
            ),
            Webhook(
                user_id=user.id,
                url="https://example.com/a",
                events='["job.completed"]',
                is_active=True,
            ),
            Webhook(
                user_id=user.id,
                url="https://example.com/b",
                events='["job.failed"]',
                is_active=False,
            ),
        ])
        _add_usage(db, user.id, "/api/v1/files/merge", file_size=1024, tokens_used=60000, cost=100)
        _add_usage(db, user.id, "/api/v1/files/ocr", file_size=2048, tokens_used=70000, cost=200)
        _add_usage(db, user.id, "/api/v1/files/old", days_ago=40, file_size=9999, tokens_used=90000, cost=900)
        db.commit()
    finally:
        db.close()

    billing_response = client.get("/api/v1/enterprise/billing/stats", headers=headers)
    assert billing_response.status_code == 200
    billing = billing_response.json()
    pricing = TokenPricing()
    assert billing["tokens_used"] == 130000
    assert billing["tokens_included"] == pricing.enterprise_included_tokens
    assert billing["tokens_overage"] == 30000
    assert billing["overage_cost"] == 300
    assert billing["total_cost"] == 300

    dashboard_response = client.get("/api/v1/enterprise/dashboard", headers=headers)
    assert dashboard_response.status_code == 200
    dashboard = dashboard_response.json()
    assert dashboard["total_api_keys"] == 2
    assert dashboard["active_api_keys"] == 1
    assert dashboard["total_requests_30d"] == 2
    assert dashboard["total_files_processed_30d"] == 2
    assert dashboard["total_bytes_processed_30d"] == 3072
    assert dashboard["current_month_tokens"] == 130000
    assert dashboard["current_month_cost_cents"] == 300
    assert dashboard["total_webhooks"] == 2
    assert dashboard["active_webhooks"] == 1
    assert dashboard["last_request_at"] is not None
    assert dashboard["last_api_key_created_at"] is not None

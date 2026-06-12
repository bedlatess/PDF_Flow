"""Admin feedback triage domain tests."""

import pytest
from fastapi import HTTPException


def _register(client, email="admin-feedback-domain@example.com", password="SecurePass123!"):
    return client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Admin Feedback Domain",
    })


def _request_stub():
    return type("RequestStub", (), {
        "client": type("ClientStub", (), {"host": "127.0.0.1"})(),
        "headers": {"user-agent": "domain-test"},
    })()


def test_admin_feedback_domain_lists_updates_and_validates_status(client):
    from app.core.database import get_db
    from app.domains.admin.feedback import list_audit_logs, list_feedback, update_feedback
    from app.models.user import FeedbackReport, User, UserRole
    from app.schemas.feedback import AdminFeedbackUpdate

    _register(client)

    db = next(client.app.dependency_overrides[get_db]())
    try:
        admin = db.query(User).filter(User.email == "admin-feedback-domain@example.com").first()
        admin.role = UserRole.ADMIN
        db.add_all([
            FeedbackReport(
                title="feedback domain open",
                message="open report",
                severity="high",
            ),
            FeedbackReport(
                title="feedback domain closed",
                message="closed report",
                status="closed",
            ),
        ])
        db.commit()
        target = db.query(FeedbackReport).filter(
            FeedbackReport.title == "feedback domain open"
        ).first()

        open_items = list_feedback(db, status_filter="new", limit=10)
        assert [item.title for item in open_items] == ["feedback domain open"]

        updated = update_feedback(
            db,
            feedback_id=target.id,
            payload=AdminFeedbackUpdate(status="reviewing", admin_note="Need screenshot"),
            request=_request_stub(),
            admin=admin,
        )
        assert updated.status == "reviewing"
        assert updated.admin_note == "Need screenshot"

        with pytest.raises(HTTPException) as invalid_status:
            update_feedback(
                db,
                feedback_id=target.id,
                payload=AdminFeedbackUpdate(status="invalid"),
                request=_request_stub(),
                admin=admin,
            )
        assert invalid_status.value.status_code == 422

        audit = list_audit_logs(db, limit=10)[0]
        assert audit.action == "update"
        assert audit.target_type == "feedback"
        assert audit.target_key == str(target.id)
        assert "Need screenshot" in audit.detail
    finally:
        db.close()


def test_admin_feedback_domain_cleans_live_acceptance_only(client):
    from app.core.database import get_db
    from app.domains.admin.feedback import cleanup_live_acceptance_feedback, list_audit_logs
    from app.models.user import FeedbackReport, User, UserRole

    _register(client)

    db = next(client.app.dependency_overrides[get_db]())
    try:
        admin = db.query(User).filter(User.email == "admin-feedback-domain@example.com").first()
        admin.role = UserRole.ADMIN
        db.add_all([
            FeedbackReport(
                title="live acceptance domain probe",
                message="synthetic probe",
                status="new",
            ),
            FeedbackReport(
                title="real user feedback domain",
                message="keep this open",
                status="new",
            ),
        ])
        db.commit()

        result = cleanup_live_acceptance_feedback(db, request=_request_stub(), admin=admin)
        reports = {item.title: item.status for item in db.query(FeedbackReport).all()}

        assert result["closed_count"] == 1
        assert result["remaining_open_count"] == 1
        assert reports["live acceptance domain probe"] == "closed"
        assert reports["real user feedback domain"] == "new"
        audit = list_audit_logs(db, limit=10)[0]
        assert audit.action == "cleanup"
        assert audit.target_type == "feedback"
        assert audit.target_key == "live_acceptance"
        assert audit.detail == "closed=1"
    finally:
        db.close()

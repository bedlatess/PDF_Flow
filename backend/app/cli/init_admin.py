"""Initialize or promote a PDF-Flow admin account.

Run from the backend container or backend working directory:

    python -m app.cli.init_admin --email admin@example.com --password '...'

For non-interactive deployment, set PDF_FLOW_ADMIN_EMAIL and
PDF_FLOW_ADMIN_PASSWORD instead of passing secrets on the command line.
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create or promote a trusted PDF-Flow administrator.",
    )
    parser.add_argument(
        "--email",
        default=os.getenv("PDF_FLOW_ADMIN_EMAIL") or os.getenv("ADMIN_EMAIL"),
        help="Admin email. Can also be set with PDF_FLOW_ADMIN_EMAIL.",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("PDF_FLOW_ADMIN_PASSWORD") or os.getenv("ADMIN_PASSWORD"),
        help=(
            "Initial password. Prefer PDF_FLOW_ADMIN_PASSWORD in production so "
            "the password is not stored in shell history."
        ),
    )
    parser.add_argument(
        "--full-name",
        default=os.getenv("PDF_FLOW_ADMIN_NAME") or os.getenv("ADMIN_NAME"),
        help="Optional display name for a newly created or updated admin.",
    )
    parser.add_argument(
        "--update-password",
        action="store_true",
        help="Reset the password when the email already exists.",
    )
    return parser.parse_args()


def resolve_password(password: str | None) -> str:
    if password:
        return password

    first = getpass.getpass("Admin password: ")
    second = getpass.getpass("Confirm admin password: ")
    if first != second:
        raise ValueError("Passwords do not match.")
    return first


def main() -> int:
    args = parse_args()
    if not args.email:
        print(
            "Missing admin email. Pass --email or set PDF_FLOW_ADMIN_EMAIL.",
            file=sys.stderr,
        )
        return 2

    try:
        password = resolve_password(args.password)
        from app.core.database import SessionLocal
        from app.domains.admin.bootstrap import bootstrap_admin_user

        db = SessionLocal()
        try:
            result = bootstrap_admin_user(
                db,
                email=args.email,
                password=password,
                full_name=args.full_name,
                update_password=args.update_password,
            )
        finally:
            db.close()
    except Exception as exc:
        print(f"Admin bootstrap failed: {exc}", file=sys.stderr)
        return 1

    password_note = "updated" if result.password_updated else "unchanged"
    print(
        "Admin bootstrap complete: "
        f"action={result.action} user_id={result.user_id} "
        f"email={result.email} role={result.role} password={password_note}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

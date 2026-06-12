# PDF-Flow v2 Staging / Main Deployment Guide

This guide is the operational checklist for deploying the v2 rewrite from
`https://github.com/bedlatess/PDF_Flow_v2`. The single source of project status
remains `docs/PROJECT_MASTER.md`; this file only describes deployment steps.

## 1. Branch Rule

- `main` is the current release-candidate branch for the new v2 repository.
- Use `staging` only when you want a separate server test branch.
- Do not delete the old server project directory until the new clone passes smoke
  scripts and manual browser checks.

Recommended order:

1. Finish and push a major work category to `v2/main`.
2. Clean or move the old server project into a dated backup folder.
3. Clone `PDF_Flow_v2` on the server.
4. Restore `backend/.env` and optional compose override files.
5. Run deploy scripts and smoke checks.
6. Keep the old backup until real browser/payment/file-processing checks pass.

## 2. Server Prerequisites

Check these on the server:

```bash
git --version
docker --version
docker compose version
curl --version
```

If the server only has legacy Compose, confirm:

```bash
docker-compose --version
```

## 3. First Clone

```bash
git clone https://github.com/bedlatess/PDF_Flow_v2.git pdf-flow-v2
cd pdf-flow-v2
git checkout main
```

For a clean replacement of the old project, prefer the dry-run helper first:

```bash
RECLONE_REPO_URL=https://github.com/bedlatess/PDF_Flow_v2.git \
RECLONE_TARGET_DIR=/opt/pdf-flow-v2 \
RECLONE_BRANCH=main \
bash scripts/server-clean-reclone.sh
```

After checking the printed plan, run it for real:

```bash
RECLONE_REPO_URL=https://github.com/bedlatess/PDF_Flow_v2.git \
RECLONE_TARGET_DIR=/opt/pdf-flow-v2 \
RECLONE_BRANCH=main \
RECLONE_DRY_RUN=0 \
bash scripts/server-clean-reclone.sh
```

## 4. Environment Files

The canonical backend template is:

```bash
cp backend/.env.example backend/.env
```

Fill real values in `backend/.env`. The deploy and rollback scripts now pass
`backend/.env` to Docker Compose through `--env-file` when it exists.

Minimum values to review before server smoke tests:

- `SECRET_KEY`
- `ALLOWED_ORIGINS`
- `ALLOWED_HOSTS`
- `FRONTEND_URL`
- `BACKEND_PUBLIC_URL`
- `OAUTH_REDIRECT_URL`
- `RESEND_API_KEY` and `EMAIL_FROM` if email is enabled
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Payment keys for enabled providers
- `GEMINI_API_KEY` if AI tools are enabled
- `SENTRY_DSN` / `POSTHOG_API_KEY` if monitoring is enabled

For the root Docker Compose file, the default database is the bundled
`postgres` service. If you want an external database, set `COMPOSE_DATABASE_URL`
in `backend/.env` or provide a `docker-compose.override.yml`.

Do not commit real credentials.

## 5. Payment Callback URLs

The backend is the only payment trust boundary. Provider dashboards should use:

```text
{BACKEND_PUBLIC_URL}/api/v1/payment/webhooks/{provider}
```

Examples:

- `https://your-domain.com/api/v1/payment/webhooks/stripe`
- `https://your-domain.com/api/v1/payment/webhooks/paypal`
- `https://your-domain.com/api/v1/payment/webhooks/epay`
- `https://your-domain.com/api/v1/payment/webhooks/alipay`
- `https://your-domain.com/api/v1/payment/webhooks/wechat`
- `https://your-domain.com/api/v1/payment/webhooks/tokenpay`
- `https://your-domain.com/api/v1/payment/webhooks/bepusdt`
- `https://your-domain.com/api/v1/payment/webhooks/epusdt`
- `https://your-domain.com/api/v1/payment/webhooks/okpay`

Frontend success/cancel URLs are user return pages only. They do not grant
plans or entitlements.

## 6. Deploy

Main branch release-candidate deploy:

```bash
bash scripts/deploy-main.sh
```

Staging branch deploy:

```bash
DEPLOY_BRANCH=staging bash scripts/deploy-staging.sh
```

The deploy helper does this:

1. Verifies `git`, Docker, and Compose.
2. Uses `backend/.env` as the Compose env file when present.
3. Refuses tracked server-side changes.
4. Creates a timestamped deploy backup.
5. Pulls the selected branch with `--ff-only`.
6. Runs `docker compose up -d --build`.
7. Runs `alembic upgrade head` inside the backend container.
8. Runs `scripts/smoke-test.sh`.
9. Records the successful deployed commit.

## 7. Smoke Gates

After deploy, run the full server smoke suite:

```bash
bash scripts/main-smoke-suite.sh
```

Equivalent expanded commands:

```bash
bash scripts/smoke-test.sh
BUSINESS_SMOKE_EMAIL="smoke-$(date +%s)@example.com" bash scripts/business-smoke-test.sh
OCR_SMOKE_EMAIL="ocr-$(date +%s)@example.com" bash scripts/ocr-smoke-test.sh
OFFICE_SMOKE_EMAIL="office-$(date +%s)@example.com" bash scripts/office-smoke-test.sh
```

Minimum manual browser checks after scripts pass:

1. Homepage and tools center load through the real domain.
2. Register, login, logout, profile refresh, and account usage states work.
3. Merge, Compress, Split, Extract Text, OCR, Office to PDF, and one advanced
   cloud tool can submit and return understandable results or diagnostics.
4. Pricing checkout creates a backend order and redirects to a provider or
   configured test checkout URL.
5. Admin Control Room loads provider health, callback setup hints, diagnostics,
   jobs, feedback, audit logs, and site settings.
6. Enterprise dashboard tabs load without overflow on desktop and mobile.
7. Error messages show user-safe `PF-*` diagnostics and do not expose traces or
   secrets.

## 8. Rollback

Application rollback for staging:

```bash
bash scripts/rollback-staging.sh
```

Application rollback for main:

```bash
bash scripts/rollback-main.sh
```

Rollback uses the last successful deploy commit recorded under `.deploy_state`.
Database rollback is not automatic. Keep database backups before risky
migrations.

## 9. Nginx Proxy Manager

Typical single-server setup:

- Domain: your PDF-Flow domain
- Scheme: `http`
- Forward host: server IP or Docker host
- Forward port: `5173`
- Enable Websockets Support
- Enable Block Common Exploits

Recommended order:

1. Verify plain HTTP first.
2. Request SSL after the site loads.
3. Enable Force SSL only after API and WebSocket routes still work.

The frontend container proxies `/api`, `/health`, and WebSocket paths to the
backend container, so browser calls should stay same-origin.

## 10. Local Release-Candidate Checks

Before pushing a major category:

```bash
pytest backend/tests/test_auth_domain.py backend/tests/test_account_domain.py backend/tests/test_enterprise_domain.py backend/tests/test_admin_payment_domain.py backend/tests/test_admin_content_domain.py backend/tests/test_admin_users_domain.py backend/tests/test_admin_operations_domain.py backend/tests/test_admin_feedback_domain.py backend/tests/test_auth.py backend/tests/test_files.py backend/tests/test_admin.py backend/tests/test_payment_domain.py backend/tests/test_advanced_pdf_service.py -q
npm run type-check
npm run build
```

Clean generated artifacts before committing:

```bash
rm -rf dist test-results playwright-report
find backend -type d -name __pycache__ -prune -exec rm -rf {} +
```

On Windows, use PowerShell equivalents.

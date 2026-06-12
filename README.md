# PDF-Flow

Privacy-first PDF workspace with a Vue frontend, FastAPI backend, admin Control Room, account/enterprise surfaces, and provider-neutral payment architecture.

This repository is under an active rewrite. Treat [docs/PROJECT_MASTER.md](./docs/PROJECT_MASTER.md) as the single source of truth for product direction, current status, backlog, verification history, and cleanup rules.

## What This Project Contains

- Public PDF workspace inspired by iLovePDF, Smallpdf, and LightPDF patterns.
- Local-first PDF tools for common organize, convert, optimize, extract, and security workflows.
- Cloud/API-backed paths for OCR, Office conversion, AI analysis, enterprise features, and large-file operations.
- Admin Control Room for site settings, feature flags, content, users, jobs, feedback, diagnostics, maintenance, audit logs, and payment operations.
- Payment framework for Stripe, PayPal, 易支付, 支付宝, 微信支付, TokenPay, BEPUSDT, EPUSDT, and OKPay.
- Backend-owned payment trust boundary: frontend may create/select checkout, but only verified backend payment events grant entitlements.

## Documentation Rules

- Status, roadmap, architecture decisions, and progress updates live in [docs/PROJECT_MASTER.md](./docs/PROJECT_MASTER.md).
- Supporting setup documents may exist, but they must not become parallel status trackers.
- After meaningful work, update [docs/PROJECT_MASTER.md](./docs/PROJECT_MASTER.md).

Allowed supporting docs:

- [docs/OAUTH_SETUP.md](./docs/OAUTH_SETUP.md)
- [docs/STAGING_DEPLOY_GUIDE.md](./docs/STAGING_DEPLOY_GUIDE.md)
- [backend/docs/EMAIL_SERVICE.md](./backend/docs/EMAIL_SERVICE.md)
- [开发文档/](./开发文档/) historical requirement PDFs
- [backend/README.md](./backend/README.md) backend runbook

## Quick Start

Install frontend dependencies:

```bash
npm install
```

Run the frontend dev server:

```bash
npm run dev
```

Run the backend locally:

```bash
cd backend
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

For Docker-based local services, use the root `docker-compose.yml` or the backend runbook.

## Common Verification

Frontend:

```bash
npm.cmd run type-check
npm.cmd run build
npm.cmd run test:e2e:core
```

Backend:

```bash
cd backend
pytest tests -q
```

Targeted backend examples:

```bash
cd backend
pytest tests/test_admin.py -q
pytest tests/test_payment_domain.py -q
```

## Project Layout

```text
PDF_Flow/
├── src/                    Frontend Vue application
│   ├── components/         Shared, layout, PDF, enterprise, admin components
│   ├── views/              Public, auth, payment, enterprise, admin, and tool pages
│   ├── services/           API clients
│   ├── stores/             Pinia stores
│   ├── utils/pdf/          Client-side PDF utilities
│   ├── locales/            Locale base files and overrides
│   └── router/             Route definitions and guards
├── backend/                FastAPI backend, Alembic migrations, domain services, tests
├── tests/e2e-playwright/   Frontend Playwright regression specs
├── scripts/                Staging, smoke, rollback, and Playwright helper scripts
├── docs/                   Master manual and supporting setup docs
└── 开发文档/               Historical PDF requirements, read-only reference
```

## Payment Setup Boundary

The codebase has a provider-neutral payment framework and admin readiness views. Real production acceptance still requires merchant credentials, callback/webhook URL registration in each provider dashboard, and sandbox or low-value live smoke tests.

Do not put provider secrets in frontend code. Use backend environment variables and the admin payment checklist to configure callbacks.

## Deployment

The current recommended real-test workflow is single-server `staging`, then merge to `main` after validation. See [docs/STAGING_DEPLOY_GUIDE.md](./docs/STAGING_DEPLOY_GUIDE.md).

Useful scripts:

```bash
bash scripts/deploy-staging.sh
bash scripts/smoke-test.sh
bash scripts/rollback-staging.sh
```

New-repository rollout helpers:

```bash
NEW_REPO_URL=git@github.com:owner/pdf-flow-v2.git bash scripts/prepare-new-repo-push.sh
RECLONE_REPO_URL=git@github.com:owner/pdf-flow-v2.git RECLONE_TARGET_DIR=/opt/pdf-flow bash scripts/server-clean-reclone.sh
```

Both helpers default to dry-run mode. Set `NEW_REPO_DRY_RUN=0` or `RECLONE_DRY_RUN=0` only after reviewing the printed plan.

## Current Status

Do not infer status from this README. Read [docs/PROJECT_MASTER.md](./docs/PROJECT_MASTER.md), especially:

- Working rules
- Target architecture
- Payment architecture
- Verification commands
- Progress log
- Active backlog

## License

MIT License. See [LICENSE](./LICENSE).

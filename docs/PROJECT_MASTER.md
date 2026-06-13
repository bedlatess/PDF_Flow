# PDF-Flow Maintenance Notes

This file keeps the project state short and current. Historical rewrite logs were removed from the repository so the active codebase stays readable.

## Current Deployment

- Repository: `https://github.com/bedlatess/PDF_Flow_v2`
- Branch: `main`
- Server path: `/root/data/docker_data/PDF/pdf-flow`
- Frontend: Docker service `frontend`, exposed on port `5173`
- Backend: Docker service `backend`, exposed on port `8000`
- Database: bundled Docker Compose Postgres service
- Redis: bundled Docker Compose Redis service

## Routine Server Update

```bash
cd /root/data/docker_data/PDF/pdf-flow
git pull --ff-only origin main
bash scripts/deploy-main.sh
```

## Verification Gates

Local frontend:

```bash
npm run type-check
npm run build
```

Local backend:

```bash
cd backend
pytest tests -q
```

Server:

```bash
bash scripts/smoke-test.sh
bash scripts/main-smoke-suite.sh
docker compose --env-file backend/.env -f docker-compose.yml ps
curl http://localhost:8000/health
```

## Product Priorities

1. Keep the public PDF tools fast, clear, and visually consistent.
2. Keep Pro differentiation subtle and based on capability, not repeated labels.
3. Keep payment trust on the backend; frontend checkout pages only initiate orders.
4. Keep production secrets out of Git.
5. Prefer small, verified changes over broad rewrites.

## Cleanup Rules

- Do not commit `dist/`, `node_modules/`, `.tmp/`, `.env`, `.deploy_state/`, `.deploy_backups/`, or SSH credentials.
- Keep rollback and smoke scripts while the single-server deployment depends on them.
- Keep generated screenshots and browser traces out of Git unless they are deliberate documentation artifacts.
- Replace temporary assets with real static assets when they are referenced by `manifest.json` or `index.html`.

## Known Follow-Ups

- Configure and verify real payment provider callbacks.
- Configure OAuth, email, and AI credentials for production acceptance.
- Add a polished product icon and favicon set when branding is final.
- Consider moving backend and frontend into separate deployables only after the current single-server release is stable.

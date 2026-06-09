# Contributing to PDF-Flow

Thank you for your interest in contributing to PDF-Flow! 🎉

## Development Setup

### Prerequisites

- Node.js ≥ 16
- Python ≥ 3.11
- Docker & Docker Compose (for backend)

### Frontend Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test:unit

# Build for production
npm run build
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start services
docker-compose up -d db redis

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

## Code Style

### Frontend
- Use TypeScript for type safety
- Follow Vue 3 Composition API best practices
- Use Prettier for formatting: `npm run format`
- Run linter before committing: `npm run lint`

### Backend
- Follow PEP 8 style guide
- Use type hints
- Write docstrings for all functions
- Format with Black: `black app/`

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new PDF watermark tool
fix: resolve file upload timeout issue
docs: update API documentation
style: format code with prettier
refactor: simplify authentication logic
test: add unit tests for merge PDF
chore: update dependencies
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test:unit` (frontend) or `pytest` (backend)
5. Commit with conventional commits
6. Push to your fork: `git push origin feature/amazing-feature`
7. Open a Pull Request

### PR Guidelines

- Provide a clear description of changes
- Link related issues
- Ensure all tests pass
- Update documentation if needed
- Keep PRs focused and atomic

## Testing

### Frontend
```bash
npm run test:unit           # Unit tests
npm run test:e2e            # E2E tests
npm run test:unit -- --coverage  # With coverage
```

### Backend
```bash
pytest                      # All tests
pytest tests/test_auth.py   # Specific test
pytest --cov=app            # With coverage
```

## Documentation

- Update README.md for user-facing changes
- Update docs/PROJECT_MASTER.md for architecture or status changes
- Add inline comments for complex logic
- Update API documentation in code docstrings

## Questions?

- Open an [issue](https://github.com/bedlatess/PDF_Flow/issues) for bugs
- Start a [discussion](https://github.com/bedlatess/PDF_Flow/discussions) for questions

Thank you for contributing! 🚀

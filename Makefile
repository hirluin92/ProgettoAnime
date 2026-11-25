.PHONY: dev test lint db

db:
	docker compose up -d db

dev: db
	cd backend && uv run uvicorn app.main:app --reload --port 8000 & \
	cd frontend && npm run dev

test:
	cd backend && uv run pytest
	cd frontend && npm test
	cd frontend && npm run test:e2e

lint:
	cd backend && uv run ruff check . && uv run mypy
	cd frontend && npm run lint && npm run format

# CREST — Makefile
# Common development commands

.PHONY: up down logs api workers beat consumer frontend lint seed

## Infrastructure
up:
	docker compose up -d

down:
	docker compose down

reset:
	docker compose down -v && docker compose up -d

logs:
	docker compose logs -f --tail=100

## Backend services (run locally without Docker)
api:
	uvicorn backend.main:socket_app --reload --port 8000

workers:
	celery -A backend.workers.celery_app worker -Q ingest -c 4 --loglevel=info

beat:
	celery -A backend.workers.celery_app beat --loglevel=info

scheduler:
	celery -A backend.workers.celery_app worker -Q scheduler -c 2 --loglevel=info

consumer:
	python -m integrations.kafka.consumer

## Frontend
frontend:
	cd frontend/nextjs-app && npm run dev

## Database
seed:
	python -m backend.utils.db

## Code quality
lint:
	ruff check . --fix
	ruff format .

## Install
install:
	pip install -r requirements.txt
	python -m spacy download en_core_web_sm
	cd frontend/nextjs-app && npm install

## Run all backend processes (for dev — use tmux or run in separate terminals)
dev: up
	@echo "Services started. Now run in separate terminals:"
	@echo "  make api"
	@echo "  make workers"
	@echo "  make beat"
	@echo "  make consumer"
	@echo "  make frontend"

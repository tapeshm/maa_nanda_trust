# Makefile for managing the development environment

# Use the shell from the environment, or default to bash
SHELL := /bin/bash

# Ensure UID/GID are exported for Docker Compose to use.
# This makes the setup portable across different machines.
export UID := $(shell id -u)
export GID := $(shell id -g)

.PHONY: help up down logs shell add add-dev rm

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  up        - Start the development services in the background."
	@echo "  down      - Stop and remove the development services."
	@echo "  stop      - Stop the development services."
	@echo "  logs      - Tail the logs of the 'dev' service."
	@echo "  shell     - Get an interactive shell inside the 'dev' container."
	@echo "  add       - Add a new production dependency. Usage: make add PKG=hono"
	@echo "  add-dev   - Add a new development dependency. Usage: make add-dev PKG=typescript"
	@echo "  rm        - Remove a dependency. Usage: make rm PKG=hono"

up:
	@echo "🚀 Starting development environment..."
	@docker compose up --build -d

down:
	@echo "🔥 Shutting down development environment..."
	@docker compose down


stop:
	@echo "🔥 Stopping development environment..."
	@docker compose stop

logs:
	@echo "🔎 Tailing logs for the 'dev' container..."
	@docker compose logs -f dev

shell:
	@echo "💻 Entering container shell..."
	@docker compose exec --user devuser dev /bin/bash

# Check if PKG variable is set for dependency management commands
add add-dev rm: _chk_pkg
_chk_pkg:
ifndef PKG
	$(error PKG is not set. Usage: make $@ PKG=<package-name>)
endif

add:
	@echo "📦 Adding production dependency: $(PKG)..."
	@docker compose exec --user devuser dev pnpm add $(PKG)
	@echo "✅ Added $(PKG). package.json and pnpm-lock.yaml have been updated."

add-dev:
	@echo "📦 Adding dev dependency: $(PKG)..."
	@docker compose exec --user devuser dev pnpm add -D $(PKG)
	@echo "✅ Added $(PKG). package.json and pnpm-lock.yaml have been updated."

rm:
	@echo "🗑️ Removing dependency: $(PKG)..."
	@docker compose exec --user devuser dev pnpm remove $(PKG)
	@echo "✅ Removed $(PKG)."

# Makefile for managing the development environment

# Use the shell from the environment, or default to bash
SHELL := /bin/bash

# Use a consistent env file for Compose
COMPOSE := docker compose --env-file .dev.vars

# Ensure UID/GID are exported for Docker Compose to use.
# This makes the setup portable across different machines.
export UID := $(shell id -u)
export GID := $(shell id -g)

.PHONY: help up up-codex rebuild-codex down logs shell add add-dev rm

	help:
		@echo "Usage: make [target]"
		@echo ""
		@echo "Targets:"
		@echo "  up        - Start the development services in the background."
		@echo "  up-codex  - Build with Codex CLI and start services."
		@echo "  rebuild-codex - Rebuild dev image with Codex CLI ignoring cache and restart."
		@echo "  down      - Stop and remove the development services."
		@echo "  stop      - Stop the development services."
		@echo "  logs      - Tail the logs of the 'dev' service."
		@echo "  shell     - Get an interactive shell inside the 'dev' container."
	@echo "  add       - Add a new production dependency. Usage: make add PKG=hono"
	@echo "  add-dev   - Add a new development dependency. Usage: make add-dev PKG=typescript"
	@echo "  rm        - Remove a dependency. Usage: make rm PKG=hono"
	@echo ""
	@echo "Note: Supabase CLI runs on the host now (not in container)."
	@echo "      Use: 'supabase start', 'supabase status', 'supabase stop', etc."

up:
	@echo "🚀 Starting development environment..."
	@$(COMPOSE) up --build -d

up-codex:
	@echo "🧰 Building image with Codex CLI (INSTALL_CODEX=1) and starting..."
	@$(COMPOSE) build --build-arg INSTALL_CODEX=1 dev
	@$(COMPOSE) up -d

rebuild-codex:
	@echo "🔄 Rebuilding image with Codex CLI (INSTALL_CODEX=1) ignoring cache..."
	@$(COMPOSE) build --pull --no-cache --build-arg INSTALL_CODEX=1 dev
	@$(COMPOSE) up -d --force-recreate

down:
	@echo "🔥 Shutting down development environment..."
	@$(COMPOSE) down


stop:
	@echo "🔥 Stopping development environment..."
	@$(COMPOSE) stop

logs:
	@echo "🔎 Tailing logs for the 'dev' container..."
	@$(COMPOSE) logs -f dev

shell:
	@echo "💻 Entering container shell..."
	@$(COMPOSE) exec --user devuser dev /bin/bash

# Check if PKG variable is set for dependency management commands
add add-dev rm: _chk_pkg
_chk_pkg:
ifndef PKG
	$(error PKG is not set. Usage: make $@ PKG=<package-name>)
endif

add:
	@echo "📦 Adding production dependency: $(PKG)..."
	@$(COMPOSE) exec --user devuser dev pnpm add $(PKG)
	@echo "✅ Added $(PKG). package.json and pnpm-lock.yaml have been updated."

add-dev:
	@echo "📦 Adding dev dependency: $(PKG)..."
	@$(COMPOSE) exec --user devuser dev pnpm add -D $(PKG)
	@echo "✅ Added $(PKG). package.json and pnpm-lock.yaml have been updated."

rm:
	@echo "🗑️ Removing dependency: $(PKG)..."
	@$(COMPOSE) exec --user devuser dev pnpm remove $(PKG)
	@echo "✅ Removed $(PKG)."

# (Supabase CLI helpers removed; use host 'supabase' command directly.)

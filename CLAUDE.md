# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Primary development workflow:**
```bash
pnpm dev                    # Start development server with CSS watching and hot reload
pnpm run dev:wrangler       # Start only Wrangler dev server (port 8787)
pnpm run watch:css          # Watch and compile Tailwind CSS
pnpm run type-check         # Run TypeScript type checking
pnpm run generate-types     # Generate Wrangler types
pnpm run deploy             # Deploy to Cloudflare Workers
pnpm run migrate            # Apply D1 database migrations
```

**Docker development (alternative):**
```bash
make up                     # Start containerized development environment
make down                   # Stop and remove containers
make logs                   # View container logs
make shell                  # Enter development container
make add PKG=<name>         # Add production dependency
make add-dev PKG=<name>     # Add development dependency
```

**Database management:**
```bash
npx wrangler d1 migrations apply DB  # Apply migrations to D1 database
npx wrangler d1 execute DB --command="SELECT * FROM content_blocks"  # Execute SQL queries
```

## Architecture Overview

This is a **Cloudflare Workers application** built with modern edge-native technologies:

### Core Stack
- **Hono framework** for routing, middleware, and server-side JSX rendering
- **Cloudflare D1** (SQLite) for structured data storage
- **Cloudflare R2** for media file storage
- **Cloudflare KV** for caching and runtime state
- **TypeScript** with strict typing throughout
- **Tailwind CSS** (CDN) + **HTMX** for frontend

### Application Structure
- **Entry point:** `src/index.tsx` - creates Hono app with global middleware
- **Routes:** `src/routes/` - modular route handlers (content, finance, media, admin)
- **Templates:** `src/templates/` - JSX components for server-side rendering
- **Utilities:** `src/utils/` - database helpers, caching, Editor.js rendering
- **Middleware:** `src/middleware/` - auth, CSRF, security headers

### Key Patterns
- **Database access:** Use prepared statements via `c.env.DB.prepare()` with proper typing from `src/utils/db.ts`
- **Validation:** All route inputs validated with Zod schemas and `@hono/zod-validator`
- **Content management:** Editor.js JSON blocks stored in D1, rendered to HTML with XSS escaping
- **Authentication:** Basic Auth via environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)
- **Security:** CSRF protection, secure headers, HTML escaping for user content

### Database Schema
Tables defined in `migrations/schema.sql`:
- `content_blocks` - Page content as Editor.js JSON
- `finance` - Financial records (credit/debit transactions)
- `media` - File metadata (R2 object references)
- `admin_users` - Administrative user accounts

### Environment Configuration
Configure in `wrangler.toml`:
- D1 database binding (`DB`)
- R2 bucket binding (`R2`) 
- KV namespace binding (`KV`)
- Admin credentials (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)
- Auth secret (`AUTH_KEY_SECRET`)

Replace placeholder IDs with actual Cloudflare resource IDs before deployment.
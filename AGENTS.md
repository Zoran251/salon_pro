<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This is a single Next.js 16 app (no monorepo, no Docker). The only external dependency is a remote **Supabase** project (PostgreSQL + Auth). Hardcoded default Supabase credentials exist in `lib/env-supabase.ts`, so the app starts without any `.env.local`.

### Quick reference

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (http://localhost:3000) |
| Lint | `npm run lint` (ESLint; 0 errors expected, warnings OK) |
| Build | `npm run build` |

### Key routes

- `/` — landing page
- `/registracija` — salon owner registration
- `/login` — salon owner login
- `/dashboard` — owner dashboard (requires auth)
- `/salon/[slug]` — public salon page
- `/demo` — demo dashboard (no auth required, good for smoke-testing UI)
- `/kupac/prijava` — customer login
- `/kupac/registracija` — customer registration

### Gotchas

- **Node.js 20 LTS** is required. The VM uses `nvm` to manage Node versions (`nvm use 20`). Ensure nvm is loaded before running npm commands: `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"`.
- Supabase Auth and database features (salon registration, login, appointment booking) require a live Supabase project. The `/demo` page works without Supabase and is the best route for UI smoke tests.
- SQL migrations live in `db/migrations/` and must be applied in date order to a Supabase project for full functionality.
- The codebase uses Serbian/Bosnian language for variable names, UI text, and documentation.

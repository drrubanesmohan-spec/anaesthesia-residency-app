# Logbook Module — Plan

## What already exists

- React 18 + TypeScript + Vite + Tailwind + React Router (lazy-loaded pages)
- PocketBase at `https://ordinemmed.ru/pb` (port 8090 on server, nginx proxy)
- Auth: `pb.collection('users').authWithPassword(...)`, token in `pb.authStore`
- Roles: `resident | supervisor | admin` on `users.role` select field
- `ProtectedRoute` component enforces route-level role checks
- `BottomTabBar` with per-role tab arrays
- `AppShell` wrapper component for all pages
- No i18n library — strings hardcoded (Russian UI)
- No test framework in the repo

## What I will add

### Back end (migrations + hooks + seed)
1. `procedures` collection
2. `logbook_entries` collection
3. `supervisor_links` collection
4. `audit_log` collection
5. `logbook.pb.js` hook: submit logic, field guards, audit writes
6. Seed migration for 159 procedures from `seed/procedures_seed.csv`

### Front end
- `src/pages/resident/LogbookPage.tsx` — week view (my lines, submit)
- `src/pages/resident/LogbookAddPage.tsx` — add a procedure entry
- `src/pages/supervisor/LogbookReviewPage.tsx` — review queue with badge
- `src/pages/admin/LogbookAdminPage.tsx` — procedure editor, overdue, audit, CSV
- Router additions in `AppRouter.tsx`
- Tab additions in `BottomTabBar.tsx`

## File list

```
pb_migrations/
  1760000001_created_procedures.js
  1760000002_created_logbook_entries.js
  1760000003_created_supervisor_links.js
  1760000004_created_audit_log.js
  1760000005_seed_procedures.js
pb_hooks/
  logbook.pb.js
src/pages/resident/LogbookPage.tsx
src/pages/resident/LogbookAddPage.tsx
src/pages/supervisor/LogbookReviewPage.tsx
src/pages/admin/LogbookAdminPage.tsx
src/router/AppRouter.tsx          (modified)
src/components/layout/BottomTabBar.tsx  (modified)
docs/logbook-plan.md
docs/logbook-deploy.md
seed/procedures_seed.csv
```

## Migration list
| File | Creates |
|------|---------|
| 1760000001 | `procedures` collection |
| 1760000002 | `logbook_entries` collection |
| 1760000003 | `supervisor_links` collection |
| 1760000004 | `audit_log` collection |
| 1760000005 | Seeds 159 procedures (idempotent) |

All migrations are additive. No existing collections are touched.

## Role checks today
- `ProtectedRoute allowedRoles={[...]}` wraps each route
- `appUser.role` from PocketBase `users.role` field
- Used as `R roles={['resident']}` shorthand in AppRouter

## How permissions are enforced
- PocketBase API rules (list/view/create/update/delete on each collection)
- `logbook.pb.js` hooks for field-level enforcement, audit writes, and business logic
  that can't be expressed in API rules alone

## Deploy commands
```bash
# Build
npm run build

# Deploy frontend
rsync -az --delete \
  --exclude='.assetsignore' --exclude='icons.svg' \
  --exclude='logo.png' --exclude='wrangler.json' \
  dist/ root@104.171.128.203:/var/www/ordinemmed/

# Deploy migrations and hooks
rsync -az pb_migrations/ root@104.171.128.203:/opt/pocketbase/pb_migrations/
rsync -az pb_hooks/ root@104.171.128.203:/opt/pocketbase/pb_hooks/

# Restart PocketBase to apply migrations
ssh root@104.171.128.203 "systemctl restart pocketbase"
```

## Rollback commands
See `docs/logbook-deploy.md` for full rollback procedure.

## Assumptions
1. No i18n framework — following existing pattern of Russian strings inline.
2. `supervisor_links` is managed by admin. Initial links can be created in PB admin (via SSH tunnel).
3. `iso_week` is computed client-side as `YYYY-Www` and set on create.
4. PocketBase `date` type fields store ISO 8601 strings; `submitted_at`, `reviewed_at` stored as text to avoid timezone issues.
5. The badge count for supervisors is fetched on mount of the relevant page/tab component via a count query.
6. No Vitest/Jest configured — functional testing is done manually per Stage 5 checklist.

## Module: Logbook, approval and entrustment (anaesthesiology only)

**Stack and environment.** React 18 + TypeScript, Vite, Tailwind, React Router. PocketBase back end (self-hosted). Timeweb VPS with nginx and Let's Encrypt. Deploy is a local build copied with scp. FZ-152 split-database design applies. Reuse the existing login and users collection. Do not add a second auth system. Find the exact deploy commands, paths and host in the repo's existing scripts or docs. Never guess them.

**Three roles.** `resident`, `supervisor`, `admin`. Extend the existing role mechanism if one exists.

**Fixed decisions (do not re-ask):**
- One logbook line is one procedure on one day with a count. The level applies to the whole line.
- Resident proposes a level (1 to 5) and a complexity (simple or complex). Supervisor confirms or changes the level. Store both.
- Scale: 1 I did it; 2 Direct supervision; 3 Reactive supervision; 4 Available if needed; 5 Independent practice.
- Procedures seeded from `seed/procedures_seed.csv` (159 rows). Admin can add, rename, regroup, retire and delete. Delete only when no line references the procedure; otherwise offer Retire (hidden from new entries, kept on old lines).
- Approval is a weekly batch queue grouped by resident, with a daily filter. Residents have linked supervisors. Admin can reassign a queue.
- Existing unmonitored logbook entries are not imported.
- Supervisors get an in-app badge with the pending count. No email or Telegram.
- A submitted line with no decision after 14 days is flagged to admin. Never auto-approve.
- Anaesthesiology only. Keep a `field` column on procedures so ICU and rehabilitation can be added later as separate lists.

**Status flow.** draft, submitted, then approved (locked) or rejected. Rejected goes back to editing, then submitted again.

**Hard rules.**
1. Enforce permissions in PocketBase API rules and hooks, not only in the UI.
2. Resident: create and edit only own lines, and edit only while draft or rejected.
3. Supervisor: change only status, supervisor_level, remark, reviewed_at, on lines assigned to them with status submitted. Reject requires a remark.
4. Approved lines are immutable. Corrections are an admin override that writes to the audit log.
5. Every status or level change writes an `audit_log` row (actor, action, before, after, timestamp).
6. No patient identifiers anywhere. The comment field carries a visible warning. Add no field that could hold names, record numbers or dates of birth.
7. Never hard-delete logbook lines, except a resident deleting their own draft.
8. Follow the existing UI language and i18n approach. Check it before writing strings.
9. Migrations are additive only. Never drop, rename or rewrite existing collections or data.

**Data model (match existing naming conventions):**
- `procedures`: name, category, field (default "anaesthesiology"), sort, active, graduation_target (optional, 1 to 5).
- `logbook_entries`: resident, procedure, date, count (int, at least 1), complexity, resident_level, comment, status, supervisor, submitted_at, supervisor_level, remark, reviewed_at, iso_week.
- `supervisor_links`: resident, supervisor, active_from, active_to.
- `audit_log`: entry, actor, action, before (json), after (json), at.

**Out of scope:** dashboards, voice debrief, NFC, ICU and rehabilitation lists, email or Telegram notifications.

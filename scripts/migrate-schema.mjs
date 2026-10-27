#!/usr/bin/env node
/**
 * migrate-schema.mjs
 * Syncs PocketBase collection schemas with the definitions below.
 * Run: node scripts/migrate-schema.mjs
 * Also runs automatically as part of npm run deploy (see package.json).
 *
 * HOW TO ADD A NEW FIELD:
 *   1. Add it to SCHEMA below under the correct collection.
 *   2. Run this script (or `npm run deploy` which runs it automatically).
 *   The script adds missing fields — it never removes or overwrites existing ones.
 */

const PB_URL   = process.env.VITE_PB_URL || 'https://api.ordinemmed.ru'
const PB_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@ordinemmed.ru'
const PB_PASS  = process.env.PB_ADMIN_PASS  || 'Admin1234!'

// ─── Schema definitions ──────────────────────────────────────────────────────
// Each entry: { name, type, required?, options? }
// Types: text | number | bool | email | url | date | select | json | file | relation
const SCHEMA = {
  roster_lectures: [
    { name: 'title',         type: 'text',   required: true  },
    { name: 'date',          type: 'text',   required: true  },
    { name: 'start_time',    type: 'text',   required: false },
    { name: 'lecturer_name', type: 'text',   required: false },
    { name: 'group_name',    type: 'text',   required: false },
    { name: 'location',      type: 'text',   required: false },
    { name: 'color',         type: 'text',   required: false },
    { name: 'notes',         type: 'text',   required: false },
  ],

  lecture_topics: [
    { name: 'title', type: 'text', required: true  },
    { name: 'color', type: 'text', required: false },
  ],

  student_groups: [
    { name: 'name',       type: 'text', required: true  },
    { name: 'start_date', type: 'text', required: false },
    { name: 'end_date',   type: 'text', required: false },
    { name: 'specialty',  type: 'text', required: false },
  ],

  app_settings: [
    { name: 'key',   type: 'text', required: true  },
    { name: 'value', type: 'text', required: false },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function req(path, opts = {}) {
  const res = await fetch(`${PB_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`${res.status} ${path}: ${JSON.stringify(body)}`)
  return body
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Auth
  let token
  try {
    const auth = await req('/api/collections/_superusers/auth-with-password', {
      method: 'POST',
      body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS }),
    })
    token = auth.token
  } catch {
    // Fallback for older PocketBase versions
    const auth = await req('/api/admins/auth-with-password', {
      method: 'POST',
      body: JSON.stringify({ identity: PB_EMAIL, password: PB_PASS }),
    })
    token = auth.token
  }
  console.log('Authenticated.')

  for (const [collectionName, desiredFields] of Object.entries(SCHEMA)) {
    // 2. Get current collection schema
    let collection
    try {
      collection = await req(`/api/collections/${collectionName}`, {
        headers: { Authorization: token },
      })
    } catch {
      console.warn(`  [${collectionName}] Collection not found — skipping.`)
      continue
    }

    const existingNames = new Set((collection.fields || []).map(f => f.name))
    const toAdd = desiredFields.filter(f => !existingNames.has(f.name))

    if (toAdd.length === 0) {
      console.log(`  [${collectionName}] Up to date.`)
      continue
    }

    // 3. PATCH — send only the new fields (PocketBase merges by name)
    const patchFields = toAdd.map(f => ({
      name:     f.name,
      type:     f.type,
      required: f.required ?? false,
      ...(f.options ? { options: f.options } : {}),
    }))

    await req(`/api/collections/${collectionName}`, {
      method:  'PATCH',
      headers: { Authorization: token },
      body:    JSON.stringify({ fields: patchFields }),
    })

    console.log(`  [${collectionName}] Added: ${toAdd.map(f => f.name).join(', ')}`)
  }

  console.log('Schema migration complete.')
}

main().catch(err => { console.error(err.message); process.exit(1) })

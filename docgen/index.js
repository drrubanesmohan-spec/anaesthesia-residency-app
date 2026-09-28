/**
 * Ordinem Document Generation Service
 * Runs on VPS port 3001, proxied via Cloudflare Tunnel as gen.ordinemmed.ru
 *
 * Requirements:
 *   - template.docx in same directory (converted from the .doc template, with {{placeholders}})
 *   - PocketBase running on localhost:8090
 *   - Environment: PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD
 */

const express = require('express')
const axios   = require('axios')
const PizZip  = require('pizzip')
const Docxtemplater = require('docxtemplater')
const fs      = require('fs')
const path    = require('path')

const app = express()
app.use(express.json())

const PB_URL    = 'http://localhost:8090'
const PB_EMAIL  = process.env.PB_SUPERUSER_EMAIL  || 'admin@ordinemmed.ru'
const PB_PASS   = process.env.PB_SUPERUSER_PASSWORD || 'NewAdmin1234'
const TEMPLATE  = path.join(__dirname, 'template.docx')
const YANDEX_BASE = 'https://cloud-api.yandex.net/v1/disk'

/* ── Auth with PocketBase superuser ── */
async function pbToken() {
  const res = await axios.post(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    identity: PB_EMAIL,
    password: PB_PASS,
  })
  return res.data.token
}

/* ── Fetch Yandex token from app_settings ── */
async function getYandexToken(pbAuth) {
  const res = await axios.get(`${PB_URL}/api/collections/app_settings/records`, {
    params: { filter: "key='yandex_token'", perPage: 1 },
    headers: { Authorization: pbAuth },
  })
  const items = res.data.items
  if (!items || items.length === 0) throw new Error('yandex_token not set in app_settings')
  return items[0].value
}

/* ── Upload buffer to Yandex Disk ── */
async function uploadToYandex(yToken, remotePath, buffer) {
  // Step 1: Get upload URL
  const urlRes = await axios.get(`${YANDEX_BASE}/resources/upload`, {
    params: { path: remotePath, overwrite: 'true' },
    headers: { Authorization: `OAuth ${yToken}` },
  })
  const uploadUrl = urlRes.data.href

  // Step 2: PUT file
  await axios.put(uploadUrl, buffer, {
    headers: { 'Content-Type': 'application/octet-stream' },
    maxBodyLength: Infinity,
  })

  // Step 3: Get public link or return direct path
  try {
    await axios.put(`${YANDEX_BASE}/resources/publish`, null, {
      params: { path: remotePath },
      headers: { Authorization: `OAuth ${yToken}` },
    })
    const metaRes = await axios.get(`${YANDEX_BASE}/resources`, {
      params: { path: remotePath, fields: 'public_url' },
      headers: { Authorization: `OAuth ${yToken}` },
    })
    return metaRes.data.public_url || remotePath
  } catch {
    return remotePath
  }
}

/* ── Build flat variable map from submission data ── */
function buildVars(data) {
  const d = data || {}
  const vars = {
    full_name:         d.full_name         || '',
    full_name_gen:     d.full_name_gen     || d.full_name || '',
    specialty:         d.specialty         || '',
    department:        d.department        || '',
    supervisor_name:   d.supervisor_name   || '',
    dept_head:         d.dept_head         || '',
    enrollment_date:   d.enrollment_date   || '',
    enrollment_order:  d.enrollment_order  || '',
    expulsion_date:    d.expulsion_date    || '',
    expulsion_order:   d.expulsion_order   || '',
    att1_date:         d.att1_date         || '',
    att1_protocol:     d.att1_protocol     || '',
    att2_date:         d.att2_date         || '',
    att2_protocol:     d.att2_protocol     || '',
    anesthesiology_grade: d.anesthesiology_grade || '',
    emergency_grade:   d.emergency_grade   || '',
    it_grade:          d.it_grade          || '',
    pedagogy_grade:    d.pedagogy_grade    || '',
    public_health_grade: d.public_health_grade || '',
    electives_grade:   d.electives_grade   || '',
    faculty_grade:     d.faculty_grade     || '',
    research_topic:    d.research_topic    || '',
    research_passed:   d.research_passed   || '',
    research_date:     d.research_date     || '',
    grade_main_s1:  d.grade_main_s1  || '',
    grade_main_s2:  d.grade_main_s2  || '',
    grade_main_s3:  d.grade_main_s3  || '',
    grade_main_s4:  d.grade_main_s4  || '',
    grade_emergency: d.grade_emergency || '',
    grade_pedagogy:  d.grade_pedagogy  || '',
    grade_pubhealth: d.grade_pubhealth || '',
    grade_pathology: d.grade_pathology || '',
    grade_dept1:    d.grade_dept1    || '',
    grade_dept2:    d.grade_dept2    || '',
    grade_elec1:    d.grade_elec1    || '',
    grade_elec2:    d.grade_elec2    || '',
    grade_elec3:    d.grade_elec3    || '',
    grade_sim_cso:  d.grade_sim_cso  || '',
    grade_sim1:     d.grade_sim1     || '',
  }

  // Practice months
  for (let year = 1; year <= 2; year++) {
    const months = d[`practice${year}`] || []
    for (let m = 0; m < 11; m++) {
      const row = months[m] || {}
      const prefix = `p${year}m${m + 1}`
      vars[`${prefix}_workplace`]    = row.workplace    || ''
      vars[`${prefix}_diagnosis`]    = row.diagnosis    || ''
      vars[`${prefix}_patients`]     = row.patient_count || ''
      vars[`${prefix}_duty_place`]   = row.duty_place   || ''
      vars[`${prefix}_duty_dates`]   = row.duty_dates   || ''
      vars[`${prefix}_procedures`]   = row.procedures   || ''
    }
  }

  // Publications (up to 10)
  const pubs = d.publications || []
  for (let i = 0; i < 10; i++) {
    const p = pubs[i] || {}
    vars[`pub${i+1}_title`]      = p.title      || ''
    vars[`pub${i+1}_coauthors`]  = p.coauthors  || ''
    vars[`pub${i+1}_publisher`]  = p.publisher  || ''
    vars[`pub${i+1}_year`]       = p.year       || ''
  }

  // Conference talks (up to 10)
  const talks = d.conf_talks || []
  for (let i = 0; i < 10; i++) {
    const c = talks[i] || {}
    vars[`talk${i+1}_topic`] = c.topic || ''
    vars[`talk${i+1}_date`]  = c.date  || ''
    vars[`talk${i+1}_place`] = c.place || ''
  }

  // Conference attendance (up to 10)
  const attended = d.conf_attended || []
  for (let i = 0; i < 10; i++) {
    const c = attended[i] || {}
    vars[`att${i+1}_topic`] = c.topic || ''
    vars[`att${i+1}_date`]  = c.date  || ''
    vars[`att${i+1}_place`] = c.place || ''
  }

  return vars
}

/* ── Main generate endpoint ── */
app.post('/generate', async (req, res) => {
  const { submission_id } = req.body
  if (!submission_id) return res.status(400).json({ error: 'submission_id required' })

  let pbAuth
  try {
    pbAuth = `Bearer ${await pbToken()}`
  } catch (e) {
    return res.status(500).json({ error: 'PocketBase auth failed: ' + e.message })
  }

  // Fetch submission
  let submission
  try {
    const r = await axios.get(`${PB_URL}/api/collections/document_submissions/records/${submission_id}`, {
      headers: { Authorization: pbAuth },
    })
    submission = r.data
  } catch (e) {
    return res.status(404).json({ error: 'Submission not found' })
  }

  // Fetch Yandex token
  let yToken
  try {
    yToken = await getYandexToken(pbAuth)
  } catch (e) {
    await updateSubmission(pbAuth, submission_id, { status: 'token_error', error_msg: 'Yandex token not found' })
    return res.status(200).json({ error: 'token_error', token_error: true })
  }

  // Mark as generating
  await updateSubmission(pbAuth, submission_id, { status: 'generating', error_msg: '' })

  // Load template
  if (!fs.existsSync(TEMPLATE)) {
    await updateSubmission(pbAuth, submission_id, { status: 'error', error_msg: 'template.docx not found on server' })
    return res.status(500).json({ error: 'Template not found on server' })
  }

  let filledBuffer
  try {
    const content  = fs.readFileSync(TEMPLATE, 'binary')
    const zip      = new PizZip(content)
    const doc      = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
    doc.render(buildVars(submission.data))
    filledBuffer = doc.getZip().generate({ type: 'nodebuffer' })
  } catch (e) {
    await updateSubmission(pbAuth, submission_id, { status: 'error', error_msg: 'Template fill error: ' + e.message })
    return res.status(500).json({ error: 'Template fill failed: ' + e.message })
  }

  // Upload to Yandex Disk
  const residentName = (submission.data?.full_name || submission_id).replace(/[/\\?%*:|"<>]/g, '_')
  const remotePath   = `/Ordinem/Планы/${residentName}.docx`
  let url
  try {
    url = await uploadToYandex(yToken, remotePath, filledBuffer)
  } catch (e) {
    if (e.response?.status === 401) {
      await updateSubmission(pbAuth, submission_id, { status: 'token_error', error_msg: 'Yandex token expired (401)' })
      return res.status(200).json({ error: 'token_expired', token_error: true })
    }
    await updateSubmission(pbAuth, submission_id, { status: 'error', error_msg: 'Yandex upload error: ' + e.message })
    return res.status(500).json({ error: 'Yandex upload failed: ' + e.message })
  }

  await updateSubmission(pbAuth, submission_id, { status: 'done', yandex_url: url, error_msg: '' })
  return res.json({ url })
})

async function updateSubmission(pbAuth, id, fields) {
  try {
    await axios.patch(`${PB_URL}/api/collections/document_submissions/records/${id}`, fields, {
      headers: { Authorization: pbAuth },
    })
  } catch { /* ignore */ }
}

app.get('/health', (_, res) => res.json({ ok: true }))

app.listen(3001, '127.0.0.1', () => console.log('docgen running on :3001'))

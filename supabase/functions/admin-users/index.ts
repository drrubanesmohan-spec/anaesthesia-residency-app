import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify caller is admin
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return new Response('Unauthorized', { status: 401, headers: cors })
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return new Response('Unauthorized', { status: 401, headers: cors })
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403, headers: cors })

  const json = await req.json()
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (json.action === 'create') {
    const { email, password, full_name, role } = json
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, role },
    })
    if (error) return reply({ error: error.message }, 400)
    await admin.from('profiles').upsert({ id: data.user.id, full_name, role })
    return reply({ id: data.user.id, full_name, role })
  }

  if (json.action === 'delete') {
    const { userId } = json
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return reply({ error: error.message }, 400)
    return reply({ success: true })
  }

  if (json.action === 'update_name') {
    const { userId, full_name } = json
    await admin.from('profiles').update({ full_name }).eq('id', userId)
    return reply({ success: true })
  }

  return reply({ error: 'Unknown action' }, 400)
})

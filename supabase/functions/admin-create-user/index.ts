import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!caller || caller.role !== 'ADMINISTRATOR') {
    return new Response('Forbidden', { status: 403 })
  }

  const { name, email, role } = await req.json()

  if (!name || !email || !role) {
    return new Response('Missing fields: name, email, role', { status: 400 })
  }

  if (!['MANAGER', 'ADMINISTRATOR'].includes(role)) {
    return new Response('Invalid role', { status: 400 })
  }

  const { data: newUser, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)

  if (inviteError) {
    return new Response(inviteError.message, { status: 400 })
  }

  const { error: insertError } = await supabase
    .from('users')
    .insert({ id: newUser.user.id, name, email, role })

  if (insertError) {
    return new Response(insertError.message, { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

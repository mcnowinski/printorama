import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 200, headers })
    }

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 200, headers })
    }

    const { data: caller } = await userClient.from('users').select('role').eq('id', user.id).single()
    if (!caller || caller.role !== 'ADMINISTRATOR') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 200, headers })
    }

    const { userId, password } = await req.json()
    if (!userId || !password) {
      return new Response(JSON.stringify({ error: 'Missing userId or password' }), { status: 200, headers })
    }

    const adminClient = createClient(supabaseUrl, supabaseKey)
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password })

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 200, headers })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers })

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 200,
      headers,
    })
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GSHEET_SYNC_URL = Deno.env.get('GSHEET_SYNC_URL')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!GSHEET_SYNC_URL) {
      throw new Error('GSHEET_SYNC_URL is not set in Supabase Secrets')
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Fetch all non-blocked contacts
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('is_blocked', false)

    if (fetchError) throw fetchError

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ status: 'success', message: 'No contacts to sync', added: 0, skipped: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Send data to Google Apps Script
    const response = await fetch(GSHEET_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contacts }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google Apps Script error: ${errorText}`)
    }

    const result = await response.json()

    // 3. Return results
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync Error:', error)
    return new Response(
      JSON.stringify({ status: 'error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

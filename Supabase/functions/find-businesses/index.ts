import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { location, businessType, count = 10 } = await req.json()

        if (!location || !businessType) {
            return new Response(
                JSON.stringify({ error: 'Location and businessType are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const query = `${businessType} in ${location}`

        const response = await fetch('https://google.serper.dev/places', {
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                q: query,
                num: count
            })
        })

        const data = await response.json()

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

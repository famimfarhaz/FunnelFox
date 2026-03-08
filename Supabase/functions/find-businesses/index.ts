import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Extract email from text using regex
function extractEmail(text: string): string | null {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi
    const match = text.match(emailRegex)
    return match ? match[0] : null
}

// Find email for a business using Serper Search
async function findBusinessEmail(businessName: string, website?: string): Promise<string | null> {
    try {
        // Search for business email
        const searchQuery = website 
            ? `email site:${new URL(website).hostname}` 
            : `"${businessName}" email contact`
        
        const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY || '',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                q: searchQuery,
                num: 3
            })
        })

        const data = await response.json()
        
        // Search in organic results for email
        if (data.organic) {
            for (const result of data.organic) {
                const email = extractEmail(result.snippet || result.title || '')
                if (email) return email
            }
        }

        // Search in answerBox
        if (data.answerBox) {
            const email = extractEmail(data.answerBox.answer || '')
            if (email) return email
        }

        return null
    } catch (error) {
        console.error(`Error finding email for ${businessName}:`, error)
        return null
    }
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
        
        // Add email to each place result
        if (data.places && Array.isArray(data.places)) {
            for (const place of data.places) {
                // Try to find email for this business
                const email = await findBusinessEmail(place.title, place.website)
                place.email = email
                
                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }

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

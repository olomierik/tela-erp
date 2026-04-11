import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { imageBase64, imageUrl, documentType } = await req.json()
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ extracted: null, error: 'AI not configured. LOVABLE_API_KEY is missing.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ extracted: null, error: 'imageBase64 or imageUrl is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const extractionPrompt = `Extract all information from this ${documentType ?? 'document'} image and return a JSON object with these fields:
{
  "vendor_name": "string",
  "vendor_address": "string",
  "vendor_email": "string",
  "vendor_phone": "string",
  "document_number": "string (invoice/receipt/PO number)",
  "document_date": "string (ISO date YYYY-MM-DD)",
  "due_date": "string (ISO date if applicable)",
  "currency": "string (USD, EUR, TZS, etc.)",
  "subtotal": number,
  "tax_amount": number,
  "tax_rate": number,
  "total_amount": number,
  "payment_terms": "string",
  "notes": "string",
  "line_items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "amount": number
    }
  ]
}

Return ONLY the JSON, no other text.`

    // Build content array with image
    const content: any[] = []
    if (imageBase64) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
      })
    } else if (imageUrl) {
      content.push({
        type: 'image_url',
        image_url: { url: imageUrl },
      })
    }
    content.push({ type: 'text', text: extractionPrompt })

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a document parsing AI. Extract structured data from invoices, receipts, and purchase orders. Always return valid JSON with the extracted fields. If a field is not found, use null.',
          },
          {
            role: 'user',
            content,
          },
        ],
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ extracted: null, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ extracted: null, error: 'AI credits exhausted. Please add funds in Settings → Workspace → Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const errText = await response.text()
      console.error('AI document parser error:', response.status, errText)
      return new Response(
        JSON.stringify({ extracted: null, error: 'Document parsing failed.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? '{}'

    let extracted = {}
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text]
      extracted = JSON.parse(jsonMatch[1] ?? text)
    } catch {
      // Try to find raw JSON object
      const objMatch = text.match(/\{[\s\S]*\}/)
      if (objMatch) {
        try { extracted = JSON.parse(objMatch[0]) } catch { extracted = { raw_text: text } }
      } else {
        extracted = { raw_text: text }
      }
    }

    return new Response(
      JSON.stringify({ extracted, rawText: text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('Document parser error:', e)
    return new Response(
      JSON.stringify({ extracted: null, error: 'Parsing failed.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
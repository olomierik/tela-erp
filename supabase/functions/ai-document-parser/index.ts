import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { imageBase64, imageUrl, documentType } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!apiKey) {
      return new Response(
        JSON.stringify({ extracted: null, error: 'AI not configured.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = `You are a document parsing AI. Extract structured data from invoices, receipts, and purchase orders.
Always return valid JSON with the extracted fields. If a field is not found, use null.`

    const extractionPrompt = `Extract all information from this ${documentType ?? 'document'} and return a JSON object with these fields:
{
  "vendor_name": "string",
  "vendor_address": "string",
  "vendor_email": "string",
  "vendor_phone": "string",
  "document_number": "string (invoice/receipt/PO number)",
  "document_date": "string (ISO date YYYY-MM-DD)",
  "due_date": "string (ISO date if applicable)",
  "currency": "string (USD, EUR, etc.)",
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

    const imageContent = imageBase64
      ? { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } }
      : { type: 'image', source: { type: 'url', url: imageUrl } }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            imageContent,
            { type: 'text', text: extractionPrompt }
          ]
        }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ extracted: null, error: 'Document parsing failed.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const text = data.content?.[0]?.text ?? '{}'
    let extracted = {}
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text]
      extracted = JSON.parse(jsonMatch[1] ?? text)
    } catch {
      extracted = { raw_text: text }
    }

    return new Response(
      JSON.stringify({ extracted }),
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

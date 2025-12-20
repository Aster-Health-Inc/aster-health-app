// Supabase Edge Function: food-analysis
// Securely proxies food image analysis requests to Gemini API
// - API key hidden on server
// - User authentication required
// - Image validation and sanitization

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validate base64 image data
function validateImageData(base64Image: string): { valid: boolean; error?: string } {
  if (!base64Image || typeof base64Image !== 'string') {
    return { valid: false, error: 'Image data is required' }
  }

  // Check if it's base64
  const base64Regex = /^[A-Za-z0-9+/=]+$/
  if (!base64Regex.test(base64Image)) {
    return { valid: false, error: 'Invalid base64 image data' }
  }

  // Check reasonable size limits (e.g., max 10MB base64 = ~7.5MB image)
  const sizeInBytes = (base64Image.length * 3) / 4
  const maxSizeInBytes = 10 * 1024 * 1024 // 10MB
  if (sizeInBytes > maxSizeInBytes) {
    return { valid: false, error: 'Image too large (max 10MB)' }
  }

  return { valid: true }
}

// Main Edge Function handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. AUTHENTICATE USER
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // 2. GET REQUEST DATA
    const { base64Image } = await req.json()

    // 3. VALIDATE IMAGE DATA
    const validation = validateImageData(base64Image)
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 4. GET GEMINI API KEY FROM SECRETS
    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      console.error('GOOGLE_GEMINI_API_KEY not configured in Edge Function secrets')
      throw new Error('Food analysis service is not configured')
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

    // 5. CREATE PROMPT FOR FOOD ANALYSIS
    const prompt = `Analyze this food image and return ONLY a JSON object with the following structure. Do not include any other text or explanations:

{
  "food_name": "Name of the food item",
  "description": "Brief description of the food",
  "calories": 0,
  "protein": "0g",
  "carbohydrates": "0g",
  "fat": "0g",
  "serving_info": {
    "type": "Dinner/Lunch/Breakfast/Snack",
    "servings": "1 serving",
    "weight": "0g"
  },
  "ingredients": [
    {"name": "Ingredient 1", "amount": "0g"},
    {"name": "Ingredient 2", "amount": "0g"}
  ],
  "micronutrients": {
    "vitamin_d": "0.00 mg",
    "omega_3": "0.00 mg",
    "iron": "0.00 mg"
  }
}

Provide realistic nutritional estimates based on typical serving sizes for the food shown.`

    // 6. CALL GEMINI API
    console.log('Calling Gemini API for food analysis...')
    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      }),
    })

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json()
      console.error('Gemini API error:', errorData)
      throw new Error(
        `Gemini API error: ${errorData.error?.message || geminiResponse.statusText}`
      )
    }

    const geminiData = await geminiResponse.json()

    // 7. EXTRACT AND PARSE RESPONSE
    const candidate = geminiData.candidates?.[0]
    const finishReason = candidate?.finishReason

    if (finishReason === 'SAFETY') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Image content blocked by safety filters. Please try a different image.',
          blocked: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const responseText = candidate?.content?.parts?.[0]?.text
    if (!responseText) {
      throw new Error('No response from Gemini API')
    }

    console.log('Raw Gemini response:', responseText)

    // Extract JSON from response - handle multiple formats
    let jsonText = responseText

    // Remove markdown code blocks if present (```json ... ``` or ``` ... ```)
    const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim()
    }

    // Extract JSON object from the text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in Gemini response:', responseText)
      throw new Error('Invalid response format from AI')
    }

    let nutritionData
    try {
      nutritionData = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse JSON:', jsonMatch[0])
      throw new Error('Failed to parse nutrition data')
    }

    // 8. RETURN SUCCESS RESPONSE
    return new Response(
      JSON.stringify({
        success: true,
        data: nutritionData,
        metadata: {
          model: 'gemini-2.5-flash',
          timestamp: new Date().toISOString(),
          user_id: user.id,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Edge function error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 500,
      }
    )
  }
})

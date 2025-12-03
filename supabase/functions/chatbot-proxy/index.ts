// Supabase Edge Function: chatbot-proxy
// Securely proxies chatbot requests to Gemini API with data sanitization

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tokenizer - Replace PII with tokens, then swap back
class IdentifierTokenizer {
  private tokenMap: Map<string, string> = new Map()
  private reverseMap: Map<string, string> = new Map()

  tokenize(value: string, type: string): string {
    if (!value) return ''

    // Check if already tokenized
    if (this.tokenMap.has(value)) {
      return this.tokenMap.get(value)!
    }

    // Generate random token
    const randomId = Math.random().toString(36).substring(2, 15) +
                     Math.random().toString(36).substring(2, 15)
    const token = `${type.toUpperCase()}_TOKEN_${randomId}`

    // Store mapping
    this.tokenMap.set(value, token)
    this.reverseMap.set(token, value)

    return token
  }

  detokenize(text: string): string {
    let result = text
    // Replace all tokens with original values
    // Escape special regex characters in token before creating RegExp
    this.reverseMap.forEach((originalValue, token) => {
      const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      result = result.replace(new RegExp(escapedToken, 'g'), originalValue)
    })
    return result
  }

  clear() {
    this.tokenMap.clear()
    this.reverseMap.clear()
  }
}

// Data Sanitization - Tokenize PII before sending to LLM
class DataSanitizer {
  static sanitizeForLLM(userContext: any, tokenizer: IdentifierTokenizer) {
    if (!userContext) return null

    return {
      // TOKENIZE identifiers instead of removing them
      user: {
        id: userContext.userProfile?.user_id, // Keep for logging only
        name: userContext.userProfile?.name
          ? tokenizer.tokenize(userContext.userProfile.name, 'name')
          : null,
        ageRange: this.getAgeRange(userContext.userProfile?.birthdate),
      },

      // ANONYMIZE DATES - Use relative references
      period: {
        lastPeriodDaysAgo: this.getDaysAgo(
          userContext.latestPeriod?.start_date
        ),
        periodDurationDays: this.calculateDuration(
          userContext.latestPeriod?.start_date,
          userContext.latestPeriod?.end_date
        ),
        cycleLengthAvg: this.calculateAvgCycleLength(
          userContext.periodHistory
        ),
        symptoms: userContext.latestPeriod?.symptoms, // Medical data (keep for context)
        flowLevel: userContext.latestPeriod?.flow_level,
        // Exact dates removed
      },

      // AGGREGATED NUTRITION (OK to share - not identifying)
      nutrition: {
        todayCalories: userContext.todayNutrition?.calories || 0,
        todayProtein: userContext.todayNutrition?.protein || 0,
        todayCarbs: userContext.todayNutrition?.carbs || 0,
        todayFat: userContext.todayNutrition?.fat || 0,
        todayWater: userContext.todayNutrition?.water || 0,
        hasData: userContext.todayNutrition?.hasData || false,
        weeklyAvgCalories: this.calculateWeeklyAvg(
          userContext.recentMeals,
          'total_calories'
        ),
        weeklyAvgProtein: this.calculateWeeklyAvg(
          userContext.recentMeals,
          'total_protein'
        ),
      },

      // Metadata
      lastUpdated: 'anonymized', // Don't expose exact timestamps
    }
  }

  static getAgeRange(birthdate: string | null): string | null {
    if (!birthdate) return null
    const age = new Date().getFullYear() - new Date(birthdate).getFullYear()
    if (age < 20) return '18-20'
    if (age < 25) return '20-25'
    if (age < 30) return '25-30'
    if (age < 35) return '30-35'
    if (age < 40) return '35-40'
    return '40+'
  }

  static getDaysAgo(date: string | null): number | null {
    if (!date) return null
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  }

  static calculateDuration(startDate: string | null, endDate: string | null): number | null {
    if (!startDate || !endDate) return null
    return Math.floor(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  static calculateAvgCycleLength(history: any[] | null): number | null {
    if (!history || history.length < 2) return null
    const cycleLengths = []
    for (let i = 1; i < history.length; i++) {
      const days = Math.floor(
        (new Date(history[i - 1].start_date).getTime() -
          new Date(history[i].start_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      cycleLengths.push(days)
    }
    return Math.round(
      cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length
    )
  }

  static calculateWeeklyAvg(meals: any[] | null, field: string): number | null {
    if (!meals || meals.length === 0) return null
    const total = meals.reduce((sum, meal) => sum + (meal[field] || 0), 0)
    return Math.round(total / meals.length)
  }
}

// Format sanitized context for Gemini
function formatContextForAPI(sanitizedContext: any): string {
  if (!sanitizedContext) {
    return "No user health data available."
  }

  let context = "USER HEALTH CONTEXT:\n"

  // Include tokenized name
  if (sanitizedContext.user?.name) {
    context += `User name: ${sanitizedContext.user.name}\n`
  }

  // Period information (anonymized)
  if (sanitizedContext.period) {
    const p = sanitizedContext.period
    if (p.lastPeriodDaysAgo !== null) {
      context += `\nPERIOD TRACKING:\n`
      context += `Last period was ${p.lastPeriodDaysAgo} days ago\n`
      if (p.periodDurationDays) {
        context += `Period duration: ${p.periodDurationDays} days\n`
      }
      if (p.cycleLengthAvg) {
        context += `Average cycle length: ${p.cycleLengthAvg} days\n`
      }
      if (p.flowLevel) {
        context += `Flow level: ${p.flowLevel}/5\n`
      }
      if (p.symptoms && p.symptoms.length > 0) {
        context += `Recent symptoms: ${p.symptoms.join(', ')}\n`
      }
    }
  }

  // Nutrition information
  if (sanitizedContext.nutrition) {
    const n = sanitizedContext.nutrition
    context += `\nTODAY'S NUTRITION:\n`
    if (n.hasData) {
      context += `Calories: ${n.todayCalories} kcal\n`
      context += `Protein: ${n.todayProtein}g\n`
      context += `Carbs: ${n.todayCarbs}g\n`
      context += `Fat: ${n.todayFat}g\n`
      if (n.todayWater > 0) {
        context += `Water: ${n.todayWater} oz\n`
      }
    } else {
      context += `No meals logged today yet.\n`
    }

    if (n.weeklyAvgCalories) {
      context += `\nWEEKLY AVERAGES:\n`
      context += `Average daily calories: ${n.weeklyAvgCalories} kcal\n`
      context += `Average daily protein: ${n.weeklyAvgProtein}g\n`
    }
  }

  // User profile (anonymized)
  if (sanitizedContext.user?.ageRange) {
    context += `\nUSER PROFILE:\n`
    context += `Age range: ${sanitizedContext.user.ageRange}\n`
  }

  context += `\nNote: Identifiable information has been tokenized for privacy. Use the user's name from context when addressing them.\n`

  return context
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
    const { message, userContext } = await req.json()

    if (!message) {
      throw new Error('Message is required')
    }

    // 3. CREATE TOKENIZER & SANITIZE USER CONTEXT
    console.log('Creating tokenizer and sanitizing user context...')
    const tokenizer = new IdentifierTokenizer()
    const sanitizedContext = DataSanitizer.sanitizeForLLM(userContext, tokenizer)

    // 4. AUDIT LOG - Record the request (optional)
    try {
      await supabaseClient.from('chatbot_audit_logs').insert({
        user_id: user.id,
        message_preview: message.substring(0, 100),
        has_context: !!sanitizedContext,
        created_at: new Date().toISOString(),
      })
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error('Audit logging failed:', auditError)
    }

    // 5. FORMAT CONTEXT FOR GEMINI
    const contextString = formatContextForAPI(sanitizedContext)

    // 6. CREATE SYSTEM PROMPT
    const systemPrompt = `You are Aster Assistant, a friendly and empathetic women's health companion.

CRITICAL SAFETY RULES (MUST FOLLOW):
- NEVER provide medical diagnoses or claim to diagnose conditions
- NEVER recommend starting, stopping, or changing medications
- NEVER give advice that could replace a doctor's consultation
- For serious or concerning symptoms (severe pain, heavy bleeding, sudden changes, etc.), recommend consulting a healthcare provider
- Do not make definitive claims about medical conditions
- You can discuss general health information without repeating disclaimers in every message
- Only state "I'm not a medical professional" when the user specifically asks for medical advice or diagnosis

RESPONSE STYLE:
- Keep responses SHORT but complete (aim for 3-5 sentences, adjust as needed for the question)
- Address the user by their name token when appropriate (e.g., if context shows "NAME_TOKEN_abc123", use exactly that in your response - it will be replaced with their real name)
- Start with a warm greeting like "Great question, NAME_TOKEN!" or "Sure!" when appropriate
- Answer the question directly first
- Use **bold** for important numbers and key information
- Use bullet points (•) when listing multiple items
- End with ONE helpful follow-up question or suggestion when appropriate
- Use emojis sparingly (max 1-2 per message)
- Be conversational and friendly, not clinical
- Avoid repeating safety disclaimers unless specifically relevant to the question

${contextString}`

    const fullPrompt = `${systemPrompt}\n\nUser Query: ${message}\n\nProvide a short, friendly response with a helpful follow-up:`

    // 7. CALL GEMINI API (API KEY HIDDEN ON SERVER)
    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

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
                text: fullPrompt,
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
      throw new Error(
        `Gemini API error: ${errorData.error?.message || geminiResponse.statusText}`
      )
    }

    const geminiData = await geminiResponse.json()

    // 8. EXTRACT RESPONSE
    const candidate = geminiData.candidates?.[0]
    const finishReason = candidate?.finishReason

    if (finishReason === 'SAFETY') {
      return new Response(
        JSON.stringify({
          success: true,
          response:
            "I want to keep our conversation respectful and helpful. Let's focus on your health tracking and wellness goals. How can I assist you today? 💙",
          blocked: true,
          reason: 'gemini_safety_filter',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Handle incomplete responses
    if (finishReason === 'MAX_TOKENS') {
      console.warn('Response truncated due to MAX_TOKENS limit')
    }

    const responseText =
      candidate?.content?.parts?.[0]?.text ||
      "I apologize, but I couldn't generate a response. Please try again."

    // 9. DETOKENIZE RESPONSE - Replace tokens with real names
    console.log('Response before detokenization:', responseText.substring(0, 150))
    const detokenizedResponse = tokenizer.detokenize(responseText)
    console.log('Response after detokenization:', detokenizedResponse.substring(0, 150))

    // 10. CLEAR TOKENIZER (security - don't keep mappings)
    tokenizer.clear()

    // 11. RETURN RESPONSE
    return new Response(
      JSON.stringify({
        success: true,
        response: detokenizedResponse,
        blocked: false,
        metadata: {
          model: 'gemini-2.5-flash',
          timestamp: new Date().toISOString(),
          sanitized: true,
          tokenized: true,
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
        response:
          "I'm having trouble processing your request right now. Please try again in a moment.",
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 500,
      }
    )
  }
})

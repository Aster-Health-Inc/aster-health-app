// services/chatbotAPIService.js
/**
 * Service for integrating with Gemini AI chatbot
 * Uses Google's Gemini API for health assistant responses
 */

import Constants from 'expo-constants';

export class ChatbotAPIService {

  /**
   * Send message to Gemini AI
   * @param {string} message - User's message
   * @param {Object} userContext - User's health data context
   * @returns {Promise<Object>} Chatbot response
   */
  static async sendMessage(message, userContext) {
    const GEMINI_API_KEY = Constants.expoConfig?.extra?.GOOGLE_GEMINI_API_KEY ||
                            process.env.GOOGLE_GEMINI_API_KEY ||
                            'AIzaSyA74k2BfdJY5n_q_30T1w6_k1hQ0-EPtPk';

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    try {
      // Prepare the context string for the chatbot
      const contextString = this.formatContextForAPI(userContext);

      // Create system prompt for health assistant
      const systemPrompt = `You are Aster Assistant, a friendly and empathetic women's health companion.

RESPONSE STYLE:
- Keep responses SHORT (3-4 sentences max)
- Start with a warm greeting like "Great question!" or "Sure!"
- Answer the question directly first
- Use **bold** for important numbers and key information (e.g., **550 calories**, **30g protein**)
- Use bullet points (•) when listing multiple items
- End with ONE helpful follow-up question or suggestion
- Use emojis sparingly (max 1-2 per message)
- Be conversational and friendly, not clinical

FORMATTING EXAMPLES:
User: "When was my last period?"
Response: "Great question! Your last period started on **August 1st**. That was **65 days ago**. Would you like to know when your next period is expected?"

User: "How many calories did I eat today?"
Response: "You've logged **550 calories** today! That's pretty low. Here are your macros:
• **Protein:** 30g
• **Carbs:** 40g
• **Fat:** 30g

Want some meal suggestions to boost your intake? 💪"

User: "Suggest healthy snacks"
Response: "Sure! Here are some high-protein snacks:
• Greek yogurt with berries **(15g protein)**
• Handful of almonds **(6g protein)**
• Protein shake **(20-25g protein)**

Would you like me to help you log any of these?"

GUIDELINES:
- Always use the user's actual health data from the context below
- Format numbers and important facts in **bold**
- Use bullet points for lists
- Keep it conversational and supportive

${contextString}`;

      const fullPrompt = `${systemPrompt}\n\nUser Query: ${message}\n\nProvide a short, friendly response with a helpful follow-up:`;

      const payload = {
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };

      console.log('Sending to Gemini API...');

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      // Extract response from Gemini's response structure
      const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ||
                            'I apologize, but I couldn\'t generate a response. Please try again.';

      return {
        success: true,
        response: geminiResponse,
        metadata: {
          model: 'gemini-2.0-flash-exp',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Gemini API error:', error);

      return {
        success: false,
        error: error.message,
        response: this.getFallbackResponse(message, userContext)
      };
    }
  }

  /**
   * Format user context for API consumption
   */
  static formatContextForAPI(userContext) {
    if (!userContext || userContext.isFallback) {
      return "No user health data available.";
    }

    const { latestPeriod, todayNutrition, userProfile, recentMeals } = userContext;

    let context = "USER HEALTH CONTEXT:\n";

    // Period information
    if (latestPeriod) {
      context += `Latest Period Start: ${latestPeriod.start_date}\n`;
      if (latestPeriod.end_date) {
        context += `Latest Period End: ${latestPeriod.end_date}\n`;
      }
      if (latestPeriod.flow_level) {
        context += `Flow Level: ${latestPeriod.flow_level}/5\n`;
      }
      if (latestPeriod.symptoms && latestPeriod.symptoms.length > 0) {
        context += `Symptoms: ${latestPeriod.symptoms.join(', ')}\n`;
      }
    }

    // Today's nutrition data
    if (todayNutrition && todayNutrition.hasData) {
      context += `\nTODAY'S NUTRITION:\n`;
      context += `Calories: ${todayNutrition.calories} kcal\n`;
      context += `Protein: ${todayNutrition.protein}g\n`;
      context += `Carbs: ${todayNutrition.carbs}g\n`;
      context += `Fat: ${todayNutrition.fat}g\n`;
      if (todayNutrition.water > 0) {
        context += `Water: ${todayNutrition.water} oz\n`;
      }
    } else {
      context += `\nTODAY'S NUTRITION:\n`;
      context += `No meals logged today yet.\n`;
    }

    // User profile
    if (userProfile) {
      context += `\nUSER PROFILE:\n`;
      if (userProfile.name) {
        context += `Name: ${userProfile.name}\n`;
      }
      if (userProfile.birthdate) {
        context += `Birth Date: ${userProfile.birthdate}\n`;
      }
    }

    // Recent nutrition data (weekly average)
    if (recentMeals && recentMeals.length > 0) {
      context += `\nRECENT NUTRITION (Last 7 days average):\n`;
      const avgCalories = recentMeals.reduce((sum, meal) => sum + (meal.total_calories || 0), 0) / recentMeals.length;
      const avgProtein = recentMeals.reduce((sum, meal) => sum + (meal.total_protein || 0), 0) / recentMeals.length;
      const avgCarbs = recentMeals.reduce((sum, meal) => sum + (meal.total_carbs || 0), 0) / recentMeals.length;
      const avgFat = recentMeals.reduce((sum, meal) => sum + (meal.total_fat || 0), 0) / recentMeals.length;
      context += `Average Daily Calories: ${Math.round(avgCalories)} kcal\n`;
      context += `Average Daily Protein: ${Math.round(avgProtein)}g\n`;
      context += `Average Daily Carbs: ${Math.round(avgCarbs)}g\n`;
      context += `Average Daily Fat: ${Math.round(avgFat)}g\n`;
    }

    context += `\nData Last Updated: ${userContext.lastUpdated}\n`;

    return context;
  }

  /**
   * Provide fallback response when API fails
   */
  static getFallbackResponse(message, userContext) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('period') || lowerMessage.includes('cycle')) {
      if (userContext?.latestPeriod) {
        return `I can see your last period started on ${userContext.latestPeriod.start_date}. I'm having trouble connecting to my full analysis system right now, but I can help with basic period tracking questions.`;
      } else {
        return "I'd love to help with period tracking! I'm having connectivity issues right now, but you can log your period data in the app and I'll be able to provide better insights once I'm back online.";
      }
    }

    if (lowerMessage.includes('health') || lowerMessage.includes('data')) {
      return "I'm currently experiencing connectivity issues with my analysis system. Your health data is safe and stored securely. Please try again in a moment, or feel free to ask basic health questions that I can answer offline.";
    }

    return "I'm having trouble connecting to my full knowledge base right now, but I'm still here to help! Could you try rephrasing your question, or ask something general about women's health that I can answer with my basic knowledge?";
  }

  /**
   * Create a Supabase Edge Function for chatbot integration
   * Call this to set up serverless chatbot API endpoint
   */
  static getSupabaseEdgeFunctionCode() {
    return `
// Supabase Edge Function: chatbot-api
// Deploy this to your Supabase project as an Edge Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, context, user_data } = await req.json()

    // Initialize your chatbot service here
    // This is where you'd integrate with OpenAI, Gemini, or your custom model

    const response = await fetch('YOUR_CHATBOT_SERVICE_URL', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${Deno.env.get('OPENAI_API_KEY')}\`
      },
      body: JSON.stringify({
        prompt: \`\${context}\\n\\nUser: \${message}\\n\\nAssistant:\`,
        max_tokens: 500,
        temperature: 0.7
      })
    })

    const chatbotData = await response.json()

    return new Response(
      JSON.stringify({
        response: chatbotData.response,
        metadata: {
          timestamp: new Date().toISOString(),
          context_length: context.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
`;
  }
}

export default ChatbotAPIService;
// services/chatbotAPIService.js
/**
 * Service for integrating with external chatbot API
 * Replace the mock responses in ChatBotModal with calls to this service
 */

export class ChatbotAPIService {

  /**
   * Send message to your external chatbot service
   * @param {string} message - User's message
   * @param {Object} userContext - User's health data context
   * @param {string} apiUrl - Your chatbot API endpoint
   * @returns {Promise<string>} Chatbot response
   */
  static async sendMessage(message, userContext, apiUrl = null) {
    // Use environment variable or fallback to localhost
    const CHATBOT_API_URL = apiUrl ||
      process.env.EXPO_PUBLIC_CHATBOT_API_URL ||
      'http://localhost:8502/api/chat'; // Your Streamlit chatbot API

    try {
      // Prepare the context string for the chatbot
      const contextString = this.formatContextForAPI(userContext);

      const payload = {
        message: message,
        context: contextString,
        user_data: {
          start_date: userContext?.latestPeriod?.start_date || null,
          total_interactions: userContext?.analytics?.total_interactions || 0,
          fallbacks: userContext?.analytics?.fallbacks || 0,
          matches: userContext?.analytics?.matches || 0,
          conversions: userContext?.analytics?.conversions || 0,
          fallback_rate: userContext?.analytics?.fallback_rate || 0,
          accuracy: userContext?.analytics?.accuracy || 0,
          conversion_rate: userContext?.analytics?.conversion_rate || 0
        },
        timestamp: new Date().toISOString()
      };

      console.log('Sending to chatbot API:', payload);

      const response = await fetch(CHATBOT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        response: data.response || data.message || 'No response from chatbot',
        metadata: data.metadata || {}
      };

    } catch (error) {
      console.error('Chatbot API error:', error);

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

    const { latestPeriod, analytics, userProfile, recentMeals } = userContext;

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

    // Analytics metrics
    context += `\nHEALTH TRACKING ANALYTICS:\n`;
    context += `Total Interactions: ${analytics.total_interactions}\n`;
    context += `Successful Matches: ${analytics.matches}\n`;
    context += `Fallbacks: ${analytics.fallbacks}\n`;
    context += `Conversions: ${analytics.conversions}\n`;
    context += `Accuracy Rate: ${analytics.accuracy}%\n`;
    context += `Conversion Rate: ${analytics.conversion_rate}%\n`;
    context += `Fallback Rate: ${analytics.fallback_rate}%\n`;

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

    // Recent nutrition data
    if (recentMeals && recentMeals.length > 0) {
      context += `\nRECENT NUTRITION (Last 7 days):\n`;
      const avgCalories = recentMeals.reduce((sum, meal) => sum + (meal.total_calories || 0), 0) / recentMeals.length;
      context += `Average Daily Calories: ${Math.round(avgCalories)}\n`;
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
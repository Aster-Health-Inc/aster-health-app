// services/geminiService.js
/**
 * Service for food image analysis via Supabase Edge Function
 * SECURE VERSION: API calls proxied through Edge Function
 * - API key hidden on server
 * - User authentication required
 * - Better security and rate limiting
 */

import { supabase } from '../lib/supabase';
import { log, error as logError } from '../utils/CrashLogger';

/**
 * Analyze food image using Gemini AI via secure Edge Function
 * @param {string} base64Image - Base64 encoded image data
 * @returns {Promise<Object>} Nutrition data
 */
export async function analyzeFood(base64Image) {
  try {
    log('Starting food analysis via Edge Function...');

    // Validate input
    if (!base64Image || typeof base64Image !== 'string') {
      throw new Error('Invalid image data provided');
    }

    // Get current session for authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error('User not authenticated. Please log in and try again.');
    }

    // Call Supabase Edge Function
    // The Edge Function will:
    // 1. Verify authentication
    // 2. Validate image data
    // 3. Call Gemini API with server-side API key
    // 4. Return nutrition data

    const EDGE_FUNCTION_URL =
      (process.env.EXPO_PUBLIC_FOOD_ANALYSIS_URL || '').trim() ||
      'https://iinbwdrzmmcwajbmuynh.supabase.co/functions/v1/food-analysis';

    log('Calling Edge Function:', EDGE_FUNCTION_URL);

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabase.supabaseKey, // Supabase anon key
      },
      body: JSON.stringify({
        base64Image: base64Image,
      }),
    });

    log('Edge Function response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logError('Edge Function error:', errorText);
      throw new Error(`Food analysis failed: ${response.status}`);
    }

    const result = await response.json();

    // Check if request was blocked (e.g., by safety filters)
    if (result.blocked) {
      throw new Error(result.error || 'Image content was blocked by safety filters');
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to analyze food');
    }

    log('Food analysis successful');
    return result.data;

  } catch (error) {
    logError('Error analyzing food:', error);

    // Provide user-friendly error messages
    if (error.message.includes('not authenticated')) {
      throw new Error('Please log in to use food analysis');
    } else if (error.message.includes('blocked')) {
      throw new Error('Unable to analyze this image. Please try a different photo.');
    } else if (error.message.includes('network')) {
      throw new Error('Network error. Please check your connection and try again.');
    } else {
      throw new Error('Failed to analyze food. Please try again.');
    }
  }
}

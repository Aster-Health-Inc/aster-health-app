// services/chatbotAPIService_EdgeFunction.js
/**
 * Service for integrating with chatbot via Supabase Edge Function
 * SECURE VERSION: API calls proxied through Edge Function
 * - API keys hidden on server
 * - Data sanitized before sending to LLM
 * - Audit logging enabled
 * - Better security and compliance
 */

import { supabase } from '../lib/supabase';
import { HealthGuardrails } from '../utils/healthGuardrails';
import { log, error as logError } from '../utils/CrashLogger';

export class ChatbotAPIService {

  /**
   * Send message to chatbot via Supabase Edge Function
   * @param {string} message - User's message
   * @param {Object} userContext - User's health data context
   * @returns {Promise<Object>} Chatbot response
   */
  static async sendMessage(message, userContext) {
    log('ChatbotAPIService: sendMessage called (Edge Function mode)');

    // ====== LAYER 1: VALIDATE USER INPUT ======
    const inputValidation = HealthGuardrails.validateUserInput(message);

    // Check for critical violations in user input
    const criticalInputViolations = inputValidation.violations.filter(
      v => v.severity === 'CRITICAL'
    );

    if (criticalInputViolations.length > 0) {
      log('ChatbotAPIService: Critical input violation detected, blocking');

      return {
        success: true,
        response: HealthGuardrails._getSafetyFallbackMessage(criticalInputViolations),
        blocked: true,
        reason: 'input_validation_failed',
        violations: criticalInputViolations,
        metadata: {
          timestamp: new Date().toISOString(),
          guardrailsBlocked: true
        }
      };
    }

    // Use sanitized input (PII redacted)
    const sanitizedMessage = inputValidation.sanitizedInput;

    if (inputValidation.violations.length > 0) {
      log(`ChatbotAPIService: Input sanitized (${inputValidation.violations.length} violations)`);
    }

    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // Call Supabase Edge Function
      // The Edge Function will:
      // 1. Verify authentication
      // 2. Sanitize user context (remove PII)
      // 3. Call Gemini API with sanitized data
      // 4. Log to audit trail
      // 5. Return response

      const EDGE_FUNCTION_URL =
        (process.env.EXPO_PUBLIC_SUPABASE_EDGE_FUNCTION_URL || '').trim() ||
        'https://iinbwdrzmmcwajbmuynh.supabase.co/functions/v1/chatbot-proxy';

      log('Calling Edge Function:', EDGE_FUNCTION_URL);

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabase.supabaseKey, // Supabase anon key
        },
        body: JSON.stringify({
          message: sanitizedMessage,
          userContext: userContext, // Will be sanitized server-side
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge Function error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Check if Edge Function returned a blocked response
      if (data.blocked) {
        log('ChatbotAPIService: Response blocked by Edge Function');

        return {
          success: true,
          response: data.response,
          blocked: true,
          reason: data.reason || 'edge_function_blocked',
          metadata: {
            timestamp: new Date().toISOString(),
            edgeFunctionBlocked: true,
            ...data.metadata
          }
        };
      }

      // ====== LAYER 2 & 3: VALIDATE AI OUTPUT ======
      // Still run client-side guardrails as an extra layer
      const validation = await HealthGuardrails.validateComplete(
        sanitizedMessage,
        data.response,
        userContext
      );

      log(`ChatbotAPIService: Validation complete - Passed: ${validation.passed}, Violations: ${validation.violations.length}`);

      // Check if response should be blocked
      if (validation.blockResponse) {
        logError('ChatbotAPIService: Response blocked by guardrails', {
          violations: validation.violations,
          originalResponse: data.response.substring(0, 100)
        });

        return {
          success: true,
          response: validation.finalResponse,
          blocked: true,
          reason: 'output_validation_failed',
          violations: validation.violations,
          metadata: {
            timestamp: new Date().toISOString(),
            guardrailsBlocked: true,
            originalResponseTruncated: data.response.substring(0, 100)
          }
        };
      }

      // Return validated/modified response
      return {
        success: true,
        response: validation.finalResponse,
        blocked: false,
        metadata: {
          timestamp: new Date().toISOString(),
          guardrailsPassed: validation.passed,
          violations: validation.violations.length > 0 ? validation.violations : undefined,
          processingTimeMs: validation.metadata.processingTimeMs,
          edgeFunction: true, // Flag to indicate this came from Edge Function
          sanitized: data.metadata?.sanitized || true,
          ...data.metadata
        }
      };

    } catch (error) {
      console.error('Edge Function error:', error);
      logError('ChatbotAPIService: Edge Function call failed', error);

      return {
        success: false,
        error: error.message,
        response: this.getFallbackResponse(message, userContext)
      };
    }
  }

  /**
   * Provide fallback response when Edge Function fails
   */
  static getFallbackResponse(message, userContext) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('period') || lowerMessage.includes('cycle')) {
      if (userContext?.latestPeriod) {
        const daysAgo = Math.floor(
          (new Date() - new Date(userContext.latestPeriod.start_date)) / (1000 * 60 * 60 * 24)
        );
        return `I can see your last period was ${daysAgo} days ago. I'm having trouble connecting to my full analysis system right now, but I can help with basic period tracking questions.`;
      } else {
        return "I'd love to help with period tracking! I'm having connectivity issues right now, but you can log your period data in the app and I'll be able to provide better insights once I'm back online.";
      }
    }

    if (lowerMessage.includes('health') || lowerMessage.includes('data')) {
      return "I'm currently experiencing connectivity issues with my analysis system. Your health data is safe and stored securely. Please try again in a moment, or feel free to ask basic health questions that I can answer offline.";
    }

    return "I'm having trouble connecting to my knowledge base right now, but I'm still here to help! Could you try rephrasing your question, or ask something general about women's health that I can answer with my basic knowledge?";
  }

  /**
   * Test Edge Function connectivity
   * @returns {Promise<boolean>} True if Edge Function is reachable
   */
  static async testEdgeFunctionConnection() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const EDGE_FUNCTION_URL =
        (process.env.EXPO_PUBLIC_SUPABASE_EDGE_FUNCTION_URL || '').trim() ||
        'https://iinbwdrzmmcwajbmuynh.supabase.co/functions/v1/chatbot-proxy';

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabase.supabaseKey,
        },
        body: JSON.stringify({
          message: 'test',
          userContext: null,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Edge Function connection test failed:', error);
      return false;
    }
  }
}

export default ChatbotAPIService;

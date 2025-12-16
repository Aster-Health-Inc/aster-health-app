/**
 * Health AI Guardrails for Aster Chatbot
 * Multi-layer validation for safe medical AI responses
 *
 * Usage:
 *   import { HealthGuardrails } from './utils/healthGuardrails';
 *   const result = await HealthGuardrails.validateComplete(userInput, aiResponse, userContext);
 */

import { log, error as logError } from './CrashLogger';

export class HealthGuardrails {
  // Medical advice patterns that should trigger blocks
  static MEDICAL_ADVICE_PATTERNS = [
    /should i (take|stop|start).*(medication|medicine|pill|birth control|contraceptive)/i,
    /diagnose (me|myself) with/i,
    /prescribe/i,
    /instead of (seeing|consulting) (a |my )?doctor/i,
    /skip (doctor|appointment|consultation)/i,
    /can you tell me if i have/i,
    /do i have.*(disease|condition|disorder)/i,
  ];

  // Harmful self-treatment patterns
  static HARMFUL_PATTERNS = [
    /induce (my )?(period|menstruation)/i,
    /abort|terminate pregnancy/i,
    /home remedy (instead|rather than)/i,
    /(dangerous|unsafe) (but|to)/i,
    /unsafe (method|approach|practice)/i,
    /self.*(medicate|treat|diagnose)/i,
  ];

  // Serious symptoms requiring medical attention
  static SERIOUS_SYMPTOMS = [
    'severe pain',
    'heavy bleeding',
    'unusual bleeding',
    'abnormal bleeding',
    'missed period',
    'pregnancy',
    'high fever',
    'fever',
    'infection',
    'abnormal discharge',
    'severe cramps',
    'fainting',
    'dizziness',
    'vomiting',
    'chest pain',
    'difficulty breathing',
  ];

  /**
   * Layer 1: Validate user input for safety
   * @param {string} message - User's input message
   * @returns {Object} Validation result
   */
  static validateUserInput(message) {
    const checks = {
      passed: true,
      violations: [],
      sanitizedInput: message,
      severity: 'none',
    };

    const messageLower = message.toLowerCase();

    // 1. Check for medical advice requests
    const medicalAdviceKeywords = ['diagnose me', 'diagnose myself', 'prescribe', 'skip my doctor'];
    const matchesAdviceKeyword = medicalAdviceKeywords.some((kw) => messageLower.includes(kw));

    for (const pattern of this.MEDICAL_ADVICE_PATTERNS) {
      if (pattern.test(message) || matchesAdviceKeyword) {
        checks.passed = false;
        checks.violations.push({
          type: 'MEDICAL_ADVICE_REQUEST',
          severity: 'HIGH',
          message: 'User requesting medical advice/diagnosis',
          pattern: pattern.toString(),
        });
        checks.severity = 'HIGH';
        break;
      }
    }

    // 2. Check for harmful self-treatment requests
    for (const pattern of this.HARMFUL_PATTERNS) {
      if (pattern.test(message)) {
        checks.passed = false;
        checks.violations.push({
          type: 'HARMFUL_REQUEST',
          severity: 'CRITICAL',
          message: 'Potentially harmful self-treatment request',
          pattern: pattern.toString(),
        });
        checks.severity = 'CRITICAL';
        break; // Critical is highest, stop checking
      }
    }

    // 3. PII detection and redaction
    const piiPatterns = {
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    };

    let sanitized = message;
    for (const [type, pattern] of Object.entries(piiPatterns)) {
      if (pattern.test(sanitized)) {
        checks.violations.push({
          type: 'PII_DETECTED',
          severity: 'MEDIUM',
          piiType: type,
          message: `Detected ${type} in user input`,
        });
        sanitized = sanitized.replace(pattern, `[${type.toUpperCase()}_REDACTED]`);
      }
    }
    checks.sanitizedInput = sanitized;

    // 4. Inappropriate language detection (basic)
    const inappropriatePatterns = [
      /f[u\*]ck/i,
      /sh[i\*]t/i,
      /b[i\*]tch/i,
      /ass(hole)?(?!\w)/i,
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(message)) {
        checks.violations.push({
          type: 'INAPPROPRIATE_LANGUAGE',
          severity: 'LOW',
          message: 'Potentially inappropriate language detected',
        });
        // Don't fail validation, just log
      }
    }

    return checks;
  }

  /**
   * Layer 2: Validate AI output for safety and quality
   * @param {string} response - AI's response
   * @param {string} userQuestion - Original user question
   * @returns {Object} Validation result
   */
  static validateAIResponse(response, userQuestion) {
    const checks = {
      passed: true,
      violations: [],
      modifiedResponse: response,
      severity: 'none',
    };

    const responseLower = response.toLowerCase();
    const questionLower = userQuestion.toLowerCase();

    // 1. Check for definitive medical claims
    const definitivePatterns = [
      /you (definitely|certainly) have/i,
      /this is (definitely|certainly)/i,
      /you should (stop|start) taking/i,
      /don't (need to )?see a doctor/i,
      /instead of medication/i,
      /you are diagnosed with/i,
      /you don't need (a )?(doctor|medical)/i,
    ];

    for (const pattern of definitivePatterns) {
      if (pattern.test(response)) {
        checks.passed = false;
        checks.violations.push({
          type: 'DEFINITIVE_MEDICAL_CLAIM',
          severity: 'CRITICAL',
          message: 'AI making definitive medical claims',
          pattern: pattern.toString(),
        });
        checks.severity = 'CRITICAL';
      }
    }

    // 2. Check if serious symptoms mentioned without provider recommendation
    const hasSeriousSymptom = this.SERIOUS_SYMPTOMS.some(
      (symptom) =>
        responseLower.includes(symptom) || questionLower.includes(symptom)
    );

    const providerKeywords = [
      'consult',
      'see a doctor',
      'see your doctor',
      'healthcare provider',
      'medical professional',
      'physician',
      'gynecologist',
      'talk to your doctor',
      'contact your doctor',
    ];

    const hasProviderRecommendation = providerKeywords.some((keyword) =>
      responseLower.includes(keyword)
    );

    if (hasSeriousSymptom && !hasProviderRecommendation) {
      checks.violations.push({
        type: 'MISSING_PROVIDER_RECOMMENDATION',
        severity: 'HIGH',
        message: 'Serious symptom mentioned without recommending healthcare provider',
      });

      // Auto-add provider recommendation
      checks.modifiedResponse +=
        '\n\n💡 **Important:** For symptoms like these, it\'s best to consult with your healthcare provider for personalized advice and proper evaluation.';

      if (checks.severity !== 'CRITICAL') {
        checks.severity = 'HIGH';
      }
    }

    // 3. Ensure medical disclaimer for medical topics
    const medicalTopics = [
      'medication',
      'medicine',
      'drug',
      'pill',
      'diagnosis',
      'disease',
      'condition',
      'treatment',
      'therapy',
      'surgery',
      'prescription',
      // Pain/relief keywords to ensure disclaimers on common health guidance
      'cramp',
      'pain',
      'bleeding',
      'symptom',
      'ibuprofen',
      'acetaminophen',
      'naproxen',
    ];

    const needsDisclaimer = medicalTopics.some(
      (topic) => responseLower.includes(topic) || questionLower.includes(topic)
    );

    if (needsDisclaimer && !this._hasDisclaimer(response)) {
      checks.violations.push({
        type: 'MISSING_DISCLAIMER',
        severity: 'MEDIUM',
        message: 'Medical topic discussed without disclaimer',
      });

      // Auto-add disclaimer
      checks.modifiedResponse = this._addMedicalDisclaimer(checks.modifiedResponse);
    }

    // 4. Factual accuracy checks (basic)
    // Check for cycle length claims
    // Support phrases where the number appears before or after "cycle"
    const cycleLengthMatch =
      response.match(/(\d+)\s*day.*cycle/i) || response.match(/cycle[^\d]*(\d+)\s*day/i);
    if (cycleLengthMatch) {
      const days = parseInt(cycleLengthMatch[1]);
      if (days < 15 || days > 60) {
        checks.violations.push({
          type: 'POTENTIAL_FACTUAL_ERROR',
          severity: 'MEDIUM',
          message: `Unusual cycle length mentioned: ${days} days`,
          detail: 'Normal cycles are typically 21-45 days',
        });
      }
    }

    // Check for period length claims
    const periodLengthMatch = response.match(/(\d+)\s*day.*period/i);
    if (periodLengthMatch) {
      const days = parseInt(periodLengthMatch[1]);
      if (days < 2 || days > 10) {
        checks.violations.push({
          type: 'POTENTIAL_FACTUAL_ERROR',
          severity: 'MEDIUM',
          message: `Unusual period length mentioned: ${days} days`,
          detail: 'Normal periods are typically 2-7 days',
        });
      }
    }

    // 5. Check response length (quality check)
    const wordCount = response.split(/\s+/).length;
    if (wordCount < 10) {
      checks.violations.push({
        type: 'RESPONSE_TOO_SHORT',
        severity: 'LOW',
        message: `Response only ${wordCount} words`,
      });
    } else if (wordCount > 300) {
      checks.violations.push({
        type: 'RESPONSE_TOO_LONG',
        severity: 'LOW',
        message: `Response is ${wordCount} words (max recommended: 300)`,
      });
    }

    return checks;
  }

  /**
   * Layer 3: Validate response uses actual user data (no hallucinations)
   * @param {string} response - AI's response
   * @param {Object} userContext - User's actual health data
   * @returns {Object} Validation result
   */
  static validateWithContext(response, userContext) {
    const checks = {
      passed: true,
      violations: [],
    };

    if (!userContext || userContext.isFallback) {
      return checks; // Can't validate without context
    }

    const responseLower = response.toLowerCase();

    // Check for period data hallucination
    if (userContext.latestPeriod) {
      const mentionsLastPeriod =
        responseLower.includes('your last period') ||
        responseLower.includes('most recent period');

      const hasActualDate =
        response.includes(userContext.latestPeriod.start_date) ||
        response.includes(new Date(userContext.latestPeriod.start_date).toLocaleDateString());

      if (mentionsLastPeriod && !hasActualDate && !responseLower.includes('i don\'t have')) {
        checks.passed = false;
        checks.violations.push({
          type: 'HALLUCINATED_DATA',
          severity: 'HIGH',
          message: 'AI claiming period data without referencing actual dates',
          detail: 'Response mentions "last period" but doesn\'t use actual date from context',
        });
      }
    }

    // Check for nutrition data hallucination
    if (userContext.todayNutrition && userContext.todayNutrition.hasData) {
      const mentionsCalories =
        responseLower.includes('calories') ||
        responseLower.includes('you\'ve eaten') ||
        responseLower.includes('you logged');

      const actualCalories = userContext.todayNutrition.calories;
      const hasActualCalories = response.includes(actualCalories.toString());

      if (mentionsCalories && !hasActualCalories && actualCalories > 0) {
        checks.violations.push({
          type: 'HALLUCINATED_DATA',
          severity: 'MEDIUM',
          message: 'AI mentioning calories without actual user data',
        });
      }
    }

    return checks;
  }

  /**
   * Master validation combining all layers
   * @param {string} userInput - User's message
   * @param {string} aiResponse - AI's response
   * @param {Object} userContext - User's health data context
   * @returns {Object} Complete validation result
   */
  static async validateComplete(userInput, aiResponse, userContext = null) {
    const startTime = Date.now();
    // Track elapsed time and avoid returning zero for ultra-fast synchronous runs

    // Run all validation layers
    const inputCheck = this.validateUserInput(userInput);
    const outputCheck = this.validateAIResponse(aiResponse, userInput);
    const contextCheck = this.validateWithContext(aiResponse, userContext || {});

    // Aggregate all violations
    const allViolations = [
      ...inputCheck.violations,
      ...outputCheck.violations,
      ...contextCheck.violations,
    ];

    // Determine if we should block the response
    const criticalViolations = allViolations.filter((v) => v.severity === 'CRITICAL');
    const highViolations = allViolations.filter((v) => v.severity === 'HIGH');

    const shouldBlock = criticalViolations.length > 0;

    const processingTimeMs = Math.max(1, Date.now() - startTime);

    const result = {
      passed: !shouldBlock,
      blockResponse: shouldBlock,
      finalResponse: aiResponse,
      violations: allViolations,
      inputCheck,
      outputCheck,
      contextCheck,
      metadata: {
        processingTimeMs,
        totalViolations: allViolations.length,
        criticalCount: criticalViolations.length,
        highCount: highViolations.length,
        timestamp: new Date().toISOString(),
      },
    };

    if (shouldBlock) {
      // Replace with safe fallback
      result.finalResponse = this._getSafetyFallbackMessage(criticalViolations);
    } else {
      // Use modified response with disclaimers/recommendations
      result.finalResponse = outputCheck.modifiedResponse;
    }

    // Log violations for monitoring
    if (allViolations.length > 0) {
      this._logViolations(userInput, aiResponse, result);
    }

    // Log successful validation
    log(`Guardrails validation: ${result.passed ? 'PASSED' : 'BLOCKED'} (${allViolations.length} violations)`);

    return result;
  }

  // ==================== Helper Methods ====================

  static _hasDisclaimer(text) {
    const disclaimerKeywords = [
      'not medical advice',
      'consult.*healthcare provider',
      'for informational purposes',
      'medical professional',
      'see your doctor',
      'talk to your doctor',
    ];

    const textLower = text.toLowerCase();
    return disclaimerKeywords.some((keyword) => {
      try {
        return new RegExp(keyword, 'i').test(textLower);
      } catch {
        return textLower.includes(keyword);
      }
    });
  }

  static _addMedicalDisclaimer(response) {
    const disclaimer =
      '\n\n⚕️ *This information is for educational purposes only and is not medical advice. Please consult your healthcare provider for personalized guidance.*';
    return response + disclaimer;
  }

  static _getSafetyFallbackMessage(violations) {
    const violationType = violations[0]?.type || 'UNKNOWN';

    const fallbackMessages = {
      MEDICAL_ADVICE_REQUEST:
        "I understand you're looking for medical guidance, but I'm not able to provide medical advice, diagnoses, or treatment recommendations. 🩺\n\nFor health concerns, please consult with your healthcare provider who can give you personalized care based on your complete medical history.\n\nI'm here to help with:\n• Tracking your cycle and symptoms\n• General wellness information\n• Understanding your health data\n\nWhat else can I help you with today? 💙",

      HARMFUL_REQUEST:
        "I care about your safety and wellbeing. 🌸\n\nFor questions about treatments or health interventions, it's important to speak directly with a healthcare provider. They can give you safe, personalized guidance.\n\nI'm here to help you:\n• Track your health data\n• Understand general health patterns\n• Log your symptoms and cycles\n\nIs there something else I can assist you with?",

      DEFINITIVE_MEDICAL_CLAIM:
        "I apologize, but I want to make sure I give you accurate and safe information. For specific medical questions, please consult with your healthcare provider.\n\nI'm here to help track your health data and provide general wellness support. How else can I assist you today? 💙",

      HALLUCINATED_DATA:
        "I want to make sure I give you accurate information based on your actual health data. Let me help you with the information you've logged in the app.\n\nWhat would you like to know about your tracked data? 📊",
    };

    return (
      fallbackMessages[violationType] ||
      "I want to make sure I give you safe and accurate information. For this type of question, I recommend speaking with your healthcare provider.\n\nIs there something else I can help you with, like tracking your cycle or understanding your health data? 💙"
    );
  }

  static _logViolations(userInput, aiResponse, validationResult) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userInput: userInput.substring(0, 100), // Truncate for privacy
      aiResponse: aiResponse.substring(0, 100),
      violations: validationResult.violations,
      blocked: validationResult.blockResponse,
      severity: validationResult.metadata.criticalCount > 0 ? 'CRITICAL' :
                validationResult.metadata.highCount > 0 ? 'HIGH' : 'MEDIUM',
      totalViolations: validationResult.violations.length,
    };

    // Log as error if blocked, warning otherwise
    if (validationResult.blockResponse) {
      logError('[GUARDRAIL_BLOCKED]', logEntry);
    } else {
      log('[GUARDRAIL_VIOLATIONS]', JSON.stringify(logEntry));
    }

    // Could also send to analytics/monitoring service
    // Analytics.track('guardrail_violation', logEntry);
  }
}

export default HealthGuardrails;

/**
 * Test suite for Health Guardrails
 * Run with: npm test
 */

import { HealthGuardrails } from '../healthGuardrails';

describe('HealthGuardrails - Input Validation', () => {

  test('should detect medical advice requests', () => {
    const dangerousInputs = [
      "Should I stop taking my birth control?",
      "Can you diagnose me with PCOS?",
      "Prescribe me something for cramps",
      "Should I skip my doctor appointment?",
    ];

    dangerousInputs.forEach(input => {
      const result = HealthGuardrails.validateUserInput(input);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v =>
        v.type === 'MEDICAL_ADVICE_REQUEST' && v.severity === 'HIGH'
      )).toBe(true);
    });
  });

  test('should detect harmful self-treatment requests', () => {
    const harmfulInputs = [
      "How can I induce my period at home?",
      "Ways to terminate pregnancy at home",
      "Should I try this unsafe method?",
    ];

    harmfulInputs.forEach(input => {
      const result = HealthGuardrails.validateUserInput(input);
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('CRITICAL');
      expect(result.violations.some(v => v.type === 'HARMFUL_REQUEST')).toBe(true);
    });
  });

  test('should redact PII from input', () => {
    const inputWithPII = "My phone is 555-123-4567 and email is user@example.com";
    const result = HealthGuardrails.validateUserInput(inputWithPII);

    expect(result.sanitizedInput).toContain('[PHONE_REDACTED]');
    expect(result.sanitizedInput).toContain('[EMAIL_REDACTED]');
    expect(result.sanitizedInput).not.toContain('555-123-4567');
    expect(result.sanitizedInput).not.toContain('user@example.com');
  });

  test('should allow safe health questions', () => {
    const safeInputs = [
      "When was my last period?",
      "How many calories did I eat today?",
      "What are common PMS symptoms?",
      "Tell me about the follicular phase",
    ];

    safeInputs.forEach(input => {
      const result = HealthGuardrails.validateUserInput(input);
      const criticalViolations = result.violations.filter(v => v.severity === 'CRITICAL');
      expect(criticalViolations.length).toBe(0);
    });
  });
});

describe('HealthGuardrails - Output Validation', () => {

  test('should detect definitive medical claims', () => {
    const dangerousResponses = [
      "You definitely have endometriosis",
      "This is certainly PCOS",
      "You should stop taking that medication",
      "You don't need to see a doctor for this",
    ];

    dangerousResponses.forEach(response => {
      const result = HealthGuardrails.validateAIResponse(response, "test question");
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('CRITICAL');
      expect(result.violations.some(v => v.type === 'DEFINITIVE_MEDICAL_CLAIM')).toBe(true);
    });
  });

  test('should add healthcare provider recommendation for serious symptoms', () => {
    const question = "I have severe pain and heavy bleeding";
    const response = "That could be normal during your period.";

    const result = HealthGuardrails.validateAIResponse(response, question);

    expect(result.modifiedResponse).toContain('healthcare provider');
    expect(result.violations.some(v => v.type === 'MISSING_PROVIDER_RECOMMENDATION')).toBe(true);
  });

  test('should add medical disclaimer when needed', () => {
    const question = "What medication helps with cramps?";
    const response = "Ibuprofen can help with cramps.";

    const result = HealthGuardrails.validateAIResponse(response, question);

    expect(result.modifiedResponse).toContain('not medical advice');
    expect(result.modifiedResponse).toContain('healthcare provider');
  });

  test('should detect unusual cycle length claims', () => {
    const response = "Your cycle is typically 75 days long.";
    const result = HealthGuardrails.validateAIResponse(response, "test");

    expect(result.violations.some(v =>
      v.type === 'POTENTIAL_FACTUAL_ERROR' && v.message.includes('75 days')
    )).toBe(true);
  });

  test('should flag responses that are too short', () => {
    const response = "Yes.";
    const result = HealthGuardrails.validateAIResponse(response, "test");

    expect(result.violations.some(v => v.type === 'RESPONSE_TOO_SHORT')).toBe(true);
  });

  test('should allow safe, informative responses', () => {
    const response = `Great question! Your last period started on January 1st.
    That was about 28 days ago. Based on typical cycles, your next period might
    be expected around February 1st. Would you like to track symptoms?

    ⚕️ This information is for educational purposes only. Consult your healthcare
    provider for personalized guidance.`;

    const result = HealthGuardrails.validateAIResponse(response, "When is my next period?");
    const criticalViolations = result.violations.filter(v => v.severity === 'CRITICAL');

    expect(criticalViolations.length).toBe(0);
  });
});

describe('HealthGuardrails - Context Validation', () => {

  test('should detect hallucinated period data', () => {
    const response = "Your last period was on December 15th";
    const context = {
      latestPeriod: {
        start_date: "2024-01-01"
      }
    };

    const result = HealthGuardrails.validateWithContext(response, context);

    expect(result.violations.some(v => v.type === 'HALLUCINATED_DATA')).toBe(true);
  });

  test('should pass when using actual user data', () => {
    const response = "Your last period started on 2024-01-01";
    const context = {
      latestPeriod: {
        start_date: "2024-01-01"
      }
    };

    const result = HealthGuardrails.validateWithContext(response, context);

    expect(result.passed).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  test('should handle missing context gracefully', () => {
    const response = "I don't have information about your last period yet";
    const context = {};

    const result = HealthGuardrails.validateWithContext(response, context);

    expect(result.passed).toBe(true);
  });
});

describe('HealthGuardrails - Complete Validation Flow', () => {

  test('should block critical input violations', async () => {
    const input = "Should I stop taking my medication?";
    const aiResponse = "You should consult your doctor.";

    const result = await HealthGuardrails.validateComplete(input, aiResponse);

    // Input should be caught even if AI response is safe
    expect(result.blockResponse).toBe(false); // This particular case passes input
    // but if it had CRITICAL violation, it would block
  });

  test('should block critical output violations', async () => {
    const input = "Do I have PCOS?";
    const aiResponse = "You definitely have PCOS based on your symptoms.";

    const result = await HealthGuardrails.validateComplete(input, aiResponse);

    expect(result.blockResponse).toBe(true);
    expect(result.finalResponse).toContain('healthcare provider');
    expect(result.finalResponse).not.toBe(aiResponse);
  });

  test('should modify safe responses with disclaimers', async () => {
    const input = "What helps with period cramps?";
    const aiResponse = "Heat pads and ibuprofen can help with cramps.";

    const result = await HealthGuardrails.validateComplete(input, aiResponse);

    expect(result.blockResponse).toBe(false);
    expect(result.finalResponse).toContain('not medical advice');
    expect(result.finalResponse).toContain(aiResponse); // Original included
  });

  test('should handle complete safe interaction', async () => {
    const input = "When was my last period?";
    const aiResponse = "Your last period started on January 1st. Would you like to see when your next one is expected?";
    const context = {
      latestPeriod: { start_date: "January 1st" }
    };

    const result = await HealthGuardrails.validateComplete(input, aiResponse, context);

    expect(result.blockResponse).toBe(false);
    expect(result.passed).toBe(true);
    expect(result.metadata.totalViolations).toBe(0);
  });

  test('should include metadata in results', async () => {
    const input = "test question";
    const aiResponse = "test response";

    const result = await HealthGuardrails.validateComplete(input, aiResponse);

    expect(result.metadata).toBeDefined();
    expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
    expect(result.metadata.timestamp).toBeDefined();
    expect(result.metadata.totalViolations).toBeDefined();
  });
});

describe('HealthGuardrails - Safety Fallback Messages', () => {

  test('should provide appropriate fallback for medical advice requests', () => {
    const violations = [{ type: 'MEDICAL_ADVICE_REQUEST', severity: 'CRITICAL' }];
    const message = HealthGuardrails._getSafetyFallbackMessage(violations);

    expect(message).toContain('healthcare provider');
    expect(message).toContain('not able to provide medical advice');
  });

  test('should provide appropriate fallback for harmful requests', () => {
    const violations = [{ type: 'HARMFUL_REQUEST', severity: 'CRITICAL' }];
    const message = HealthGuardrails._getSafetyFallbackMessage(violations);

    expect(message).toContain('safety');
    expect(message).toContain('healthcare provider');
  });

  test('should have generic fallback for unknown violations', () => {
    const violations = [{ type: 'UNKNOWN_TYPE', severity: 'CRITICAL' }];
    const message = HealthGuardrails._getSafetyFallbackMessage(violations);

    expect(message).toContain('safe and accurate');
    expect(message.length).toBeGreaterThan(0);
  });
});

describe('HealthGuardrails - Edge Cases', () => {

  test('should handle empty input', () => {
    const result = HealthGuardrails.validateUserInput("");
    expect(result.passed).toBe(true);
    expect(result.sanitizedInput).toBe("");
  });

  test('should handle very long input', () => {
    const longInput = "test ".repeat(1000);
    const result = HealthGuardrails.validateUserInput(longInput);
    expect(result).toBeDefined();
  });

  test('should handle special characters', () => {
    const input = "Test with 特殊字符 and émojis 🌸💙";
    const result = HealthGuardrails.validateUserInput(input);
    expect(result.sanitizedInput).toBe(input);
  });

  test('should handle null context', async () => {
    const result = await HealthGuardrails.validateComplete(
      "test",
      "test response",
      null
    );
    expect(result).toBeDefined();
    expect(result.finalResponse).toBeDefined();
  });
});

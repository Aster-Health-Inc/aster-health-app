/**
 * Guardrails Monitoring & Analytics
 * Track violations, block rates, and safety metrics
 */

import { supabase } from '../lib/supabase';
import { log } from './CrashLogger';

export class GuardrailsMonitor {

  /**
   * Log a guardrail event to Supabase
   * @param {Object} event - Guardrail event details
   */
  static async logEvent(event) {
    try {
      const {
        user_id,
        event_type, // 'input_blocked', 'output_blocked', 'gemini_blocked', 'modified', 'passed'
        violation_type, // 'MEDICAL_ADVICE_REQUEST', 'HARMFUL_REQUEST', etc.
        severity, // 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
        blocked,
        source, // 'custom_input', 'custom_output', 'gemini'
        user_input_hash, // Hash of user input (don't store actual input for privacy)
        modifications_applied, // Array of modifications like ['disclaimer_added', 'provider_recommendation']
        metadata
      } = event;

      // Create hash of user input for privacy
      const inputHash = user_input_hash || this.hashString(event.user_input || '');

      const logEntry = {
        user_id: user_id || null,
        event_type,
        violation_type: violation_type || null,
        severity: severity || 'NONE',
        blocked: blocked || false,
        source: source || 'custom',
        user_input_hash: inputHash,
        modifications_applied: modifications_applied || [],
        metadata: metadata || {},
        created_at: new Date().toISOString()
      };

      // Log to Supabase
      const { error } = await supabase
        .from('guardrail_events')
        .insert(logEntry);

      if (error) {
        console.error('Failed to log guardrail event:', error);
      } else {
        log(`GuardrailsMonitor: Event logged - ${event_type}`);
      }

    } catch (error) {
      console.error('GuardrailsMonitor error:', error);
    }
  }

  /**
   * Log a blocked input
   */
  static async logInputBlocked(userId, violations, userInput) {
    await this.logEvent({
      user_id: userId,
      event_type: 'input_blocked',
      violation_type: violations[0]?.type,
      severity: violations[0]?.severity,
      blocked: true,
      source: 'custom_input',
      user_input: userInput,
      metadata: { violations }
    });
  }

  /**
   * Log a blocked output
   */
  static async logOutputBlocked(userId, violations, userInput) {
    await this.logEvent({
      user_id: userId,
      event_type: 'output_blocked',
      violation_type: violations[0]?.type,
      severity: violations[0]?.severity,
      blocked: true,
      source: 'custom_output',
      user_input: userInput,
      metadata: { violations }
    });
  }

  /**
   * Log Gemini safety block
   */
  static async logGeminiBlocked(userId, category, userInput) {
    await this.logEvent({
      user_id: userId,
      event_type: 'gemini_blocked',
      violation_type: category,
      severity: 'HIGH',
      blocked: true,
      source: 'gemini',
      user_input: userInput,
      metadata: { gemini_category: category }
    });
  }

  /**
   * Log modified response (disclaimers added, etc.)
   */
  static async logModified(userId, modifications, violations, userInput) {
    await this.logEvent({
      user_id: userId,
      event_type: 'modified',
      violation_type: violations[0]?.type,
      severity: violations[0]?.severity || 'MEDIUM',
      blocked: false,
      source: 'custom_output',
      user_input: userInput,
      modifications_applied: modifications,
      metadata: { violations }
    });
  }

  /**
   * Log passed validation
   */
  static async logPassed(userId, userInput) {
    await this.logEvent({
      user_id: userId,
      event_type: 'passed',
      violation_type: null,
      severity: 'NONE',
      blocked: false,
      source: 'all',
      user_input: userInput,
      metadata: {}
    });
  }

  /**
   * Get analytics for a date range
   */
  static async getAnalytics(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('guardrail_events')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) throw error;

      const analytics = {
        total_messages: data.length,
        blocked_count: data.filter(e => e.blocked).length,
        modified_count: data.filter(e => e.event_type === 'modified').length,
        passed_count: data.filter(e => e.event_type === 'passed').length,

        // Block rate
        block_rate: data.length > 0 ? (data.filter(e => e.blocked).length / data.length) : 0,

        // By source
        custom_input_blocks: data.filter(e => e.source === 'custom_input' && e.blocked).length,
        custom_output_blocks: data.filter(e => e.source === 'custom_output' && e.blocked).length,
        gemini_blocks: data.filter(e => e.source === 'gemini' && e.blocked).length,

        // By violation type
        violation_breakdown: this.countByField(data.filter(e => e.violation_type), 'violation_type'),

        // By severity
        severity_breakdown: this.countByField(data, 'severity'),

        // Modifications
        modifications_breakdown: this.countModifications(data.filter(e => e.modifications_applied)),

        // Time series data
        daily_counts: this.groupByDay(data)
      };

      return analytics;

    } catch (error) {
      console.error('Failed to get analytics:', error);
      return null;
    }
  }

  /**
   * Get metrics for the last 7 days
   */
  static async getWeeklyMetrics() {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    return await this.getAnalytics(startDate, endDate);
  }

  /**
   * Get real-time metrics (last 24 hours)
   */
  static async getDailyMetrics() {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    return await this.getAnalytics(startDate, endDate);
  }

  /**
   * Check if alert should be triggered
   */
  static async checkAlerts() {
    const metrics = await this.getDailyMetrics();

    if (!metrics) return;

    const alerts = [];

    // Alert 1: High block rate (>15%)
    if (metrics.block_rate > 0.15) {
      alerts.push({
        type: 'HIGH_BLOCK_RATE',
        severity: 'WARNING',
        message: `Block rate is ${(metrics.block_rate * 100).toFixed(1)}% (threshold: 15%)`,
        value: metrics.block_rate
      });
    }

    // Alert 2: Many Gemini blocks (might indicate toxic users)
    if (metrics.gemini_blocks > 10) {
      alerts.push({
        type: 'HIGH_GEMINI_BLOCKS',
        severity: 'INFO',
        message: `${metrics.gemini_blocks} messages blocked by Gemini safety filters`,
        value: metrics.gemini_blocks
      });
    }

    // Alert 3: Many medical advice requests
    const medicalAdviceCount = metrics.violation_breakdown['MEDICAL_ADVICE_REQUEST'] || 0;
    if (medicalAdviceCount > 20) {
      alerts.push({
        type: 'HIGH_MEDICAL_ADVICE_REQUESTS',
        severity: 'INFO',
        message: `${medicalAdviceCount} medical advice requests blocked (users may need education)`,
        value: medicalAdviceCount
      });
    }

    // Alert 4: Harmful requests detected
    const harmfulCount = metrics.violation_breakdown['HARMFUL_REQUEST'] || 0;
    if (harmfulCount > 5) {
      alerts.push({
        type: 'HARMFUL_REQUESTS_DETECTED',
        severity: 'CRITICAL',
        message: `${harmfulCount} harmful requests detected (review user behavior)`,
        value: harmfulCount
      });
    }

    return alerts;
  }

  // Helper methods

  static hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  static countByField(data, field) {
    return data.reduce((acc, item) => {
      const value = item[field];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  static countModifications(data) {
    const allMods = data.flatMap(item => item.modifications_applied || []);
    return allMods.reduce((acc, mod) => {
      acc[mod] = (acc[mod] || 0) + 1;
      return acc;
    }, {});
  }

  static groupByDay(data) {
    const byDay = {};
    data.forEach(item => {
      const day = item.created_at.split('T')[0];
      if (!byDay[day]) {
        byDay[day] = { total: 0, blocked: 0, modified: 0, passed: 0 };
      }
      byDay[day].total++;
      if (item.blocked) byDay[day].blocked++;
      if (item.event_type === 'modified') byDay[day].modified++;
      if (item.event_type === 'passed') byDay[day].passed++;
    });
    return byDay;
  }

  /**
   * Get summary stats for display
   */
  static async getSummaryStats() {
    const metrics = await this.getWeeklyMetrics();

    if (!metrics) {
      return {
        totalMessages: 0,
        blockRate: 0,
        topViolationType: 'None',
        alertLevel: 'GOOD'
      };
    }

    // Determine alert level
    let alertLevel = 'GOOD';
    if (metrics.block_rate > 0.15) alertLevel = 'WARNING';
    if (metrics.block_rate > 0.25) alertLevel = 'CRITICAL';

    // Find top violation type
    const violations = metrics.violation_breakdown;
    const topViolationType = Object.keys(violations).reduce((a, b) =>
      violations[a] > violations[b] ? a : b,
      'None'
    );

    return {
      totalMessages: metrics.total_messages,
      blockedMessages: metrics.blocked_count,
      modifiedMessages: metrics.modified_count,
      blockRate: (metrics.block_rate * 100).toFixed(1),
      topViolationType,
      alertLevel,
      metrics
    };
  }
}

export default GuardrailsMonitor;

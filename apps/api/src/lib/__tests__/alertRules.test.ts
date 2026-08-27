import { describe, it, expect } from 'vitest';
import {
  isAlertSuppressed,
  evaluateDefaultRule,
  evaluateRuleConditions,
  resolveSlackEmoji,
} from '../alertRules.js';

describe('Alert Rules Engine', () => {
  describe('isAlertSuppressed', () => {
    it('should return true if rule was triggered in recent alerts', () => {
      const recent = [
        { deliveryChannels: { ruleId: 'rule-1' } },
        { deliveryChannels: { ruleId: 'rule-2' } },
      ];
      expect(isAlertSuppressed(recent, 'rule-1')).toBe(true);
      expect(isAlertSuppressed(recent, 'rule-3')).toBe(false);
    });

    it('should return false if recent alerts is empty or channels are malformed', () => {
      expect(isAlertSuppressed([], 'rule-1')).toBe(false);
      expect(isAlertSuppressed([{ deliveryChannels: null }], 'rule-1')).toBe(false);
    });
  });

  describe('evaluateDefaultRule', () => {
    it('should trigger warning if score is strictly below threshold', () => {
      const result = evaluateDefaultRule({ score: 35 }, 40);
      expect(result.triggered).toBe(true);
      expect(result.priority).toBe('warning');
      expect(result.reason).toContain('dropped below default threshold');
    });

    it('should not trigger if score is at or above threshold', () => {
      const result = evaluateDefaultRule({ score: 40 }, 40);
      expect(result.triggered).toBe(false);
      expect(result.reason).toBe('');
    });
  });

  describe('evaluateRuleConditions', () => {
    it('should handle score_below condition', () => {
      const result = evaluateRuleConditions(
        [{ type: 'score_below', threshold: 50, priority: 'critical' }],
        { score: 45 },
      );
      expect(result.triggered).toBe(true);
      expect(result.priority).toBe('critical');
      expect(result.reason).toContain('Score below 50');
    });

    it('should handle score_drop condition', () => {
      const result = evaluateRuleConditions(
        [{ type: 'score_drop', drop: 15, days: 7, priority: 'warning' }],
        { score: 60 },
        { score: 80 },
      );
      expect(result.triggered).toBe(true);
      expect(result.reason).toContain('Score dropped by 20 points in 7 days');
    });

    it('should not trigger score_drop if drop is below threshold', () => {
      const result = evaluateRuleConditions(
        [{ type: 'score_drop', drop: 15, days: 7 }],
        { score: 75 },
        { score: 80 },
      );
      expect(result.triggered).toBe(false);
    });

    it('should handle inactivity condition', () => {
      const activeResult = evaluateRuleConditions(
        [{ type: 'inactivity', days: 10, priority: 'info' }],
        { score: 70 },
        null,
        1, // recent logins count
      );
      expect(activeResult.triggered).toBe(false);

      const inactiveResult = evaluateRuleConditions(
        [{ type: 'inactivity', days: 10, priority: 'info' }],
        { score: 70 },
        null,
        0, // 0 logins
      );
      expect(inactiveResult.triggered).toBe(true);
      expect(inactiveResult.priority).toBe('info');
      expect(inactiveResult.reason).toContain('No logins in last 10 days');
    });

    it('should return false for empty or unknown condition types', () => {
      expect(evaluateRuleConditions([], { score: 10 }).triggered).toBe(false);
      expect(evaluateRuleConditions([{ type: 'unknown_type' }], { score: 10 }).triggered).toBe(
        false,
      );
    });
  });

  describe('resolveSlackEmoji', () => {
    it('should map priorities to corresponding emojis', () => {
      expect(resolveSlackEmoji('critical')).toBe('🚨');
      expect(resolveSlackEmoji('info')).toBe('ℹ️');
      expect(resolveSlackEmoji('warning')).toBe('⚠️');
      expect(resolveSlackEmoji('other')).toBe('⚠️');
    });
  });
});

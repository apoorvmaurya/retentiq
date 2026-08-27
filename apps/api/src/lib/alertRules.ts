/**
 * Alert Rules Evaluation Engine for RetentIQ
 */

export interface RuleCondition {
  type: 'score_below' | 'score_drop' | 'inactivity' | string;
  threshold?: number;
  drop?: number;
  days?: number;
  priority?: 'info' | 'warning' | 'critical';
}

export interface AlertRule {
  id: string;
  name: string;
  conditions: RuleCondition[] | unknown;
  isActive?: boolean;
}

export interface RuleEvaluationResult {
  triggered: boolean;
  priority: 'info' | 'warning' | 'critical';
  reason: string;
}

/**
 * Checks if a rule trigger is within the cooldown suppression period.
 */
export function isAlertSuppressed(
  recentAlerts: Array<{ deliveryChannels: unknown }>,
  ruleId: string,
): boolean {
  return recentAlerts.some((a) => {
    const channels = a.deliveryChannels as { ruleId?: string } | null;
    return Boolean(channels && channels.ruleId === ruleId);
  });
}

/**
 * Evaluates default organization threshold rule.
 */
export function evaluateDefaultRule(
  latestScore: { score: number },
  threshold: number,
): RuleEvaluationResult {
  if (latestScore.score < threshold) {
    return {
      triggered: true,
      priority: 'warning',
      reason: `Health score (${latestScore.score}) dropped below default threshold (${threshold})`,
    };
  }
  return {
    triggered: false,
    priority: 'warning',
    reason: '',
  };
}

/**
 * Evaluates custom condition rules.
 */
export function evaluateRuleConditions(
  conditions: RuleCondition[],
  latestScore: { score: number },
  pastScore?: { score: number } | null,
  recentLoginsCount: number = 0,
): RuleEvaluationResult {
  if (!conditions || conditions.length === 0) {
    return { triggered: false, priority: 'warning', reason: '' };
  }

  let rulePriority: 'info' | 'warning' | 'critical' = 'warning';
  let triggerReason = '';
  let allMatch = true;

  for (const cond of conditions) {
    if (cond.priority) {
      rulePriority = cond.priority;
    }

    if (cond.type === 'score_below') {
      const threshold = cond.threshold ?? 40;
      if (!(latestScore.score < threshold)) {
        allMatch = false;
      } else {
        triggerReason += `Score below ${threshold}. `;
      }
    } else if (cond.type === 'score_drop') {
      const days = cond.days || 7;
      const dropThreshold = cond.drop || 15;

      if (pastScore && pastScore.score - latestScore.score >= dropThreshold) {
        triggerReason += `Score dropped by ${pastScore.score - latestScore.score} points in ${days} days. `;
      } else {
        allMatch = false;
      }
    } else if (cond.type === 'inactivity') {
      const inactiveDays = cond.days || 10;
      if (recentLoginsCount === 0) {
        triggerReason += `No logins in last ${inactiveDays} days. `;
      } else {
        allMatch = false;
      }
    } else {
      allMatch = false;
    }
  }

  return {
    triggered: allMatch,
    priority: rulePriority,
    reason: triggerReason.trim(),
  };
}

/**
 * Maps priority level to emoji for Slack and webhook notifications.
 */
export function resolveSlackEmoji(priority: string): string {
  switch (priority) {
    case 'critical':
      return '🚨';
    case 'info':
      return 'ℹ️';
    case 'warning':
    default:
      return '⚠️';
  }
}

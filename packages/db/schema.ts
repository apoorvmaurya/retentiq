import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Organizations
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  teamSize: integer('team_size').default(1),
  productCategory: text('product_category').default('B2B'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 2. Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // maps to auth.users.id
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  role: text('role', { enum: ['owner', 'admin', 'member', 'viewer'] }).notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  onboardingComplete: boolean('onboarding_complete').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 3. Customers
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  company: text('company').notNull(),
  planTier: text('plan_tier').notNull(),
  mrr: numeric('mrr', { precision: 10, scale: 2 }).notNull().default('0.00'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 4. Health Scores
export const healthScores = pgTable('health_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(), // CHECK 0-100
  churnProbability: numeric('churn_probability', { precision: 3, scale: 2 }).notNull(), // CHECK 0-1.0
  riskTier: text('risk_tier', { enum: ['low', 'medium', 'high', 'critical'] }).notNull(),
  topRiskFactors: jsonb('top_risk_factors').notNull().default([]),
  recommendedAction: text('recommended_action').notNull(),
  confidence: numeric('confidence', { precision: 3, scale: 2 }).notNull(),
  scoredAt: timestamp('scored_at', { withTimezone: true }).defaultNow(),
});

// 5. Events
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  source: text('source').notNull(),
  payload: jsonb('payload').notNull().default({}),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow(),
});

// 6. Alerts
export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  triggeredAt: timestamp('triggered_at', { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  scoreAtTrigger: integer('score_at_trigger').notNull(),
  deliveryChannels: jsonb('delivery_channels').notNull().default({ slack: false, email: false }),
  acknowledged: boolean('acknowledged').default(false),
});

// 7. Integrations
export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // slack, stripe, intercom, mixpanel
  status: text('status').notNull(),
  config: jsonb('config').notNull().default({}),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 8. Retention Actions
export const retentionActions = pgTable('retention_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  actionType: text('action_type').notNull(),
  outcome: text('outcome').notNull(),
  revenueSaved: numeric('revenue_saved', { precision: 10, scale: 2 }).notNull().default('0.00'),
  actionedAt: timestamp('actioned_at', { withTimezone: true }).defaultNow(),
});

// 9. Alert Configs
export const alertConfigs = pgTable('alert_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' })
    .unique(),
  threshold: integer('threshold').default(40),
  notifySlack: boolean('notify_slack').default(false),
  notifyEmail: boolean('notify_email').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 10. Groq Usage
export const groqUsage = pgTable('groq_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  tokensUsed: integer('tokens_used').notNull(),
  model: text('model').notNull(),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull().default('0.000000'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 11. Tasks
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  status: text('status', { enum: ['pending', 'completed'] })
    .notNull()
    .default('pending'),
  outcome: text('outcome', { enum: ['positive', 'neutral', 'negative'] }),
  completedBy: text('completed_by'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 12. Playbooks
export const playbooks = pgTable('playbooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  triggerType: text('trigger_type', { enum: ['health_drop', 'manual'] })
    .notNull()
    .default('manual'),
  triggerThreshold: integer('trigger_threshold').default(40),
  steps: jsonb('steps').notNull().default([]), // Array of steps: { step: number, headline: string, detail: string }
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 13. Ingestion Jobs Queue
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'stripe' | 'intercom' | 'mixpanel' | 'csv'
  payload: jsonb('payload').notNull().default({}),
  status: text('status', { enum: ['queued', 'processing', 'completed', 'failed'] })
    .notNull()
    .default('queued'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 14. ROI Aggregates Cache
export const roiAggregates = pgTable('roi_aggregates', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  month: text('month').notNull(), // YYYY-MM
  accountsSaved: integer('accounts_saved').notNull().default(0),
  revenueSaved: numeric('revenue_saved', { precision: 10, scale: 2 }).notNull().default('0.00'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 15. Invites
export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'member', 'viewer'] })
    .notNull()
    .default('member'),
  token: text('token').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'expired'] })
    .notNull()
    .default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

// 16. Score Weights
export const scoreWeights = pgTable('score_weights', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' })
    .unique(),
  loginFrequency30dWeight: integer('login_frequency_30d_weight').default(15),
  loginFrequency14dWeight: integer('login_frequency_14d_weight').default(10),
  loginFrequency7dWeight: integer('login_frequency_7d_weight').default(10),
  featureAdoptionWeight: integer('feature_adoption_weight').default(20),
  usageTrendWeight: integer('usage_trend_weight').default(15),
  supportVolumeWeight: integer('support_volume_weight').default(10),
  supportSentimentWeight: integer('support_sentiment_weight').default(5),
  billingEventsWeight: integer('billing_events_weight').default(10),
  onboardingTimeWeight: integer('onboarding_time_weight').default(5),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 17. Email Templates
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // 'critical_score_drop' | 'billing_failure' | '30d_inactivity' | 'renewal_risk'
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 18. Alert Rules
export const alertRules = pgTable('alert_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  conditions: jsonb('conditions').notNull().default([]), // Array of conditions
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- Relations ---

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  users: many(users),
  customers: many(customers),
  integrations: many(integrations),
  invites: many(invites),
  scoreWeights: one(scoreWeights, {
    fields: [organizations.id],
    references: [scoreWeights.orgId],
  }),
  emailTemplates: many(emailTemplates),
  alertRules: many(alertRules),
  alertConfig: one(alertConfigs, {
    fields: [organizations.id],
    references: [alertConfigs.orgId],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [customers.orgId],
    references: [organizations.id],
  }),
  healthScores: many(healthScores),
  events: many(events),
  alerts: many(alerts),
  retentionActions: many(retentionActions),
  tasks: many(tasks),
}));

export const healthScoresRelations = relations(healthScores, ({ one }) => ({
  customer: one(customers, {
    fields: [healthScores.customerId],
    references: [customers.id],
  }),
  organization: one(organizations, {
    fields: [healthScores.orgId],
    references: [organizations.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  customer: one(customers, {
    fields: [events.customerId],
    references: [customers.id],
  }),
  organization: one(organizations, {
    fields: [events.orgId],
    references: [organizations.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  customer: one(customers, {
    fields: [alerts.customerId],
    references: [customers.id],
  }),
  organization: one(organizations, {
    fields: [alerts.orgId],
    references: [organizations.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  organization: one(organizations, {
    fields: [integrations.orgId],
    references: [organizations.id],
  }),
}));

export const retentionActionsRelations = relations(retentionActions, ({ one }) => ({
  customer: one(customers, {
    fields: [retentionActions.customerId],
    references: [customers.id],
  }),
  organization: one(organizations, {
    fields: [retentionActions.orgId],
    references: [organizations.id],
  }),
}));

export const alertConfigsRelations = relations(alertConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [alertConfigs.orgId],
    references: [organizations.id],
  }),
}));

export const groqUsageRelations = relations(groqUsage, ({ one }) => ({
  organization: one(organizations, {
    fields: [groqUsage.orgId],
    references: [organizations.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  organization: one(organizations, {
    fields: [tasks.orgId],
    references: [organizations.id],
  }),
  customer: one(customers, {
    fields: [tasks.customerId],
    references: [customers.id],
  }),
}));

export const playbooksRelations = relations(playbooks, ({ one }) => ({
  organization: one(organizations, {
    fields: [playbooks.orgId],
    references: [organizations.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  organization: one(organizations, {
    fields: [jobs.orgId],
    references: [organizations.id],
  }),
}));

export const roiAggregatesRelations = relations(roiAggregates, ({ one }) => ({
  organization: one(organizations, {
    fields: [roiAggregates.orgId],
    references: [organizations.id],
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  organization: one(organizations, {
    fields: [invites.orgId],
    references: [organizations.id],
  }),
}));

export const scoreWeightsRelations = relations(scoreWeights, ({ one }) => ({
  organization: one(organizations, {
    fields: [scoreWeights.orgId],
    references: [organizations.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [emailTemplates.orgId],
    references: [organizations.id],
  }),
}));

export const alertRulesRelations = relations(alertRules, ({ one }) => ({
  organization: one(organizations, {
    fields: [alertRules.orgId],
    references: [organizations.id],
  }),
}));

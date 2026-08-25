import { Slack } from '@/components/icons/Slack';
import {
  CreditCard,
  Layers,
  Activity,
  MessageSquare,
  Database,
  Cloud,
  FileText,
} from 'lucide-react';
import { ProviderInfo, ProviderGuide, IntegrationField } from './types';

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Billing',
    desc: 'Syncs subscription status, plan tier, MRR, billing history, failed payments, upgrades, and downgrades.',
    icon: CreditCard,
    color: 'text-indigo-400',
  },
  {
    id: 'segment',
    name: 'Segment',
    category: 'Usage Analytics',
    desc: 'Ingests product usage events, session lengths, feature clicks, and custom event taxonomy mapping.',
    icon: Layers,
    color: 'text-rose-400',
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    category: 'Usage Analytics',
    desc: 'Tracks customer event streams, dashboard interactions, and cohort feature usage breadths.',
    icon: Activity,
    color: 'text-purple-400',
  },
  {
    id: 'intercom',
    name: 'Intercom',
    category: 'Support',
    desc: 'Pulls customer support ticket volume, response times, and conversation sentiment.',
    icon: MessageSquare,
    color: 'text-sky-400',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'CRM',
    desc: 'Syncs customer deal stages, contract value, account owner, and NPS/CSAT survey scores.',
    icon: Database,
    color: 'text-orange-400',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'CRM',
    desc: 'Syncs Enterprise client accounts, contract dates, ARR, and sales-recorded NPS/CSAT scores.',
    icon: Cloud,
    color: 'text-[#00A1E0]',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Alerting',
    desc: 'Dispatches critical health drops, alert priorities, and playbook triggers directly to channels.',
    icon: Slack,
    color: 'text-emerald-400',
  },
  {
    id: 'csv',
    name: 'Manual CSV',
    category: 'Usage Analytics',
    desc: 'Upload custom CSV files containing customer usage events to queue them for background ingestion.',
    icon: FileText,
    color: 'text-cyan-400',
  },
];

export const PROVIDER_GUIDES: Record<string, ProviderGuide> = {
  stripe: {
    overview:
      'RetentIQ listens to billing events from Stripe to update customer subscription tiers (Pro, Basic, Churned) and calculate MRR metrics automatically.',
    webhookRequired: true,
    events: [
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed',
    ],
    steps: [
      {
        title: 'Go to Stripe Developer settings',
        text: 'Log in to your Stripe Dashboard and navigate to Developers > Webhooks.',
      },
      {
        title: 'Add a Webhook Endpoint',
        text: "Click 'Add Endpoint' and paste your unique RetentIQ Stripe webhook URL.",
      },
      {
        title: 'Subscribe to Stripe Events',
        text: "Select customer.subscription.updated, customer.subscription.deleted, and invoice.payment_failed. Click 'Add Endpoint' to save.",
      },
      {
        title: 'Enter API Credentials Below',
        text: 'Enter your Stripe Secret Key and Webhook Signing Secret in the configuration form below to activate secure synchronization.',
      },
    ],
    testCommand: 'python test_stripe.py',
    testSamplePayload:
      '{\n  "type": "customer.subscription.updated",\n  "data": {\n    "object": {\n      "customer_email": "customer@example.com",\n      "items": {\n        "data": [{"price": {"unit_amount": 19900, "nickname": "Enterprise"}}]\n      }\n    }\n  }\n}',
  },
  intercom: {
    overview:
      'Pulls conversation count and CSAT ratings to monitor support ticket density. If customer tickets exceed the threshold (>3 tickets in 7 days), a high-touch alert is triggered.',
    webhookRequired: true,
    events: ['conversation.created', 'conversation.rated'],
    steps: [
      {
        title: 'Go to Intercom Developer Hub',
        text: 'Log in to your Intercom Developer Hub, select your app (or create a new one).',
      },
      {
        title: 'Add a Webhook URL',
        text: 'Navigate to Webhooks in the left sidebar and paste the RetentIQ Intercom Webhook URL.',
      },
      {
        title: 'Choose Webhook Topics',
        text: 'Add subscriptions for conversation.created and conversation.rated, then save.',
      },
      {
        title: 'Save Client Credentials Below',
        text: 'Enter your Intercom Client Secret in the configuration form below to verify signatures of incoming payloads.',
      },
    ],
    testCommand: 'python test_intercom.py',
    testSamplePayload:
      '{\n  "topic": "conversation.created",\n  "data": {\n    "item": {\n      "id": "conv_1",\n      "title": "Billing question",\n      "user": {"email": "user@example.com"}\n    }\n  }\n}',
  },
  segment: {
    overview:
      'Streams real-time customer event activity, identify calls, page views, and click telemetry directly into RetentIQ.',
    webhookRequired: true,
    steps: [
      {
        title: 'Go to Segment Destinations',
        text: "Log in to your Segment workspace, select your Source, and click 'Add Destination'.",
      },
      {
        title: 'Select Webhooks Destination',
        text: "Search for 'Webhooks' in the destination catalog and select it.",
      },
      {
        title: 'Configure Webhook URL',
        text: 'Paste the Segment webhook URL below into the Webhook URL field in your Segment settings.',
      },
      {
        title: 'Enable & Secure Destination',
        text: 'Toggle the destination status to Active and input your Webhook Signing Secret below to verify requests.',
      },
    ],
    testSamplePayload:
      '{\n  "type": "track",\n  "event": "login",\n  "userId": "user-id-123",\n  "properties": {\n    "email": "user@example.com"\n  }\n}',
  },
  mixpanel: {
    overview:
      "Pulls quantitative event logs by fetching event data directly from Mixpanel's Export API using a service account.",
    webhookRequired: false,
    steps: [
      {
        title: 'Create a Service Account',
        text: 'Go to Mixpanel Project Settings > Service Accounts and create an account with Analyst or Admin role.',
      },
      {
        title: 'Save Service Account Credentials Below',
        text: 'Retrieve the Username and Secret of the Service Account and input them in the form below.',
      },
      {
        title: 'Activate & Run Sync',
        text: "Toggle the integration to Active, then click 'Sync Now' in the catalog to fetch and backfill the last 30 days of user events.",
      },
    ],
  },
  hubspot: {
    overview:
      'Syncs customer CRM metadata, NPS scores, contract values, and renewal dates into RetentIQ.',
    webhookRequired: true,
    steps: [
      {
        title: 'Create a Private App',
        text: 'In HubSpot Settings, go to Integrations > Private Apps. Create a new Private App with crm.objects.contacts.read and crm.objects.companies.read scopes.',
      },
      {
        title: 'Configure Webhooks in HubSpot',
        text: "Set up Webhook subscriptions in HubSpot's developer app panel targeting the RetentIQ HubSpot Webhook URL.",
      },
      {
        title: 'Choose Webhook Topics',
        text: 'Subscribe to contact and company creation/property change events (like NPS updates).',
      },
      {
        title: 'Save Private App Access Token Below',
        text: 'Input your HubSpot Access Token in the configuration form below.',
      },
    ],
    testSamplePayload:
      '{\n  "email": "customer@example.com",\n  "nps_score": 9,\n  "deal_stage": "Closed Won"\n}',
  },
  salesforce: {
    overview:
      'Syncs Enterprise account owners, ARR values, deal stages, and account health notes into RetentIQ.',
    webhookRequired: true,
    steps: [
      {
        title: 'Configure Connected App',
        text: 'In Salesforce Setup, go to App Manager and create a Connected App with OAuth Scopes.',
      },
      {
        title: 'Create Outbound Message Webhook',
        text: 'Navigate to Workflow Actions > Outbound Messages. Create a new outbound message targeting the Salesforce webhook URL below.',
      },
      {
        title: 'Map Fields & Save Credentials Below',
        text: 'Select the fields to include (email, NPS/score, ARR, renewal date) and input your Connected App Client ID/Secret in the form below.',
      },
    ],
    testSamplePayload:
      '{\n  "email": "customer@example.com",\n  "nps_score": 8,\n  "deal_stage": "Closed Won"\n}',
  },
  slack: {
    overview:
      'Sends critical customer health drops and automated CS playbook alerts directly to your Slack channels.',
    webhookRequired: false,
    steps: [
      {
        title: 'Create an Incoming Webhook',
        text: "Go to your Slack Workspace App settings, enable Incoming Webhooks, and click 'Add New Webhook to Workspace'.",
      },
      {
        title: 'Select Alert Channel',
        text: 'Choose the channel where customer health alerts should be posted, and copy the Webhook URL.',
      },
      {
        title: 'Save Slack Webhook URL Below',
        text: 'Input the webhook URL in the configuration form below to enable playbook notifications.',
      },
    ],
  },
};

export const PROVIDER_FIELDS: Record<string, IntegrationField[]> = {
  stripe: [
    {
      label: 'Stripe Secret Key',
      key: 'stripeSecretKey',
      placeholder: 'sk_live_...',
      type: 'password',
    },
    {
      label: 'Stripe Webhook Secret',
      key: 'stripeWebhookSecret',
      placeholder: 'whsec_...',
      type: 'password',
    },
  ],
  mixpanel: [
    {
      label: 'Service Account Username',
      key: 'mixpanelServiceAccountUsername',
      placeholder: 'service-account-username',
      type: 'text',
    },
    {
      label: 'Service Account Secret',
      key: 'mixpanelServiceAccountSecret',
      placeholder: 'mixpanel-service-account-secret',
      type: 'password',
    },
  ],
  intercom: [
    {
      label: 'Intercom Client Secret',
      key: 'intercomClientSecret',
      placeholder: 'intercom-client-secret',
      type: 'password',
    },
    {
      label: 'Intercom Access Token (Optional)',
      key: 'intercomAccessToken',
      placeholder: 'intercom-access-token',
      type: 'password',
    },
  ],
  segment: [
    {
      label: 'Webhook Signing Secret',
      key: 'segmentWebhookSecret',
      placeholder: 'segment-signing-secret',
      type: 'password',
    },
  ],
  hubspot: [
    {
      label: 'Private App Access Token',
      key: 'hubspotAccessToken',
      placeholder: 'pat-na1-...',
      type: 'password',
    },
  ],
  salesforce: [
    {
      label: 'Connected App Client ID',
      key: 'salesforceClientId',
      placeholder: 'salesforce-client-id',
      type: 'text',
    },
    {
      label: 'Connected App Client Secret',
      key: 'salesforceClientSecret',
      placeholder: 'salesforce-client-secret',
      type: 'password',
    },
  ],
  slack: [
    {
      label: 'Slack Webhook URL',
      key: 'slackWebhookUrl',
      placeholder: 'https://hooks.slack.com/services/...',
      type: 'password',
    },
  ],
};

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  publishedAt: string;
  readTime: string;
  category: 'Predictive AI' | 'CS Playbooks' | 'Data Security' | 'SaaS Strategy';
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  tags: string[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'predicting-b2b-saas-churn-early',
    title: 'Spotting Churn Signals: Predicting B2B SaaS Churn 60 Days Early',
    excerpt:
      'How combining billing data, support tickets, and telemetry logs inside a centralized ML scoring model helps Customer Success teams act before it is too late.',
    publishedAt: 'June 12, 2026',
    readTime: '6 min read',
    category: 'Predictive AI',
    author: {
      name: 'Dr. Sarah Jenkins',
      role: 'Chief AI Architect at RetentIQ',
      avatar: '/images/author-sarah.webp',
    },
    tags: ['Machine Learning', 'FastAPI', 'Customer Success', 'Llama-3.3'],
    content: `
<h2>The Problem of Reactive Customer Success</h2>
<p>Most SaaS companies discover a customer is churning only when they click "Cancel Subscription" or submit a non-renewal notice. At this stage, the customer has already checked out mentally, evaluated alternatives, and migrated their workflows. Saving the account is close to impossible.</p>

<p>To prevent this, customer success organizations must shift from reactive firefighting to predictive intelligence. By analyzing behavioral signals 30 to 60 days before a renewal cycle, companies can identify accounts exhibiting micro-behaviors that correlate with churn.</p>

<h2>The Three Core Signaling Layers</h2>
<p>To predict customer health accurately, your model must ingest and weigh signals across three distinct layers:</p>
<ul>
  <li><strong>Product Usage Telemetry:</strong> Drops in weekly active user (WAU) ratios, core feature usage gaps, or a drop in export actions.</li>
  <li><strong>Billing and Financial Trends:</strong> Multiple payment retries, contraction events, or credit card failures.</li>
  <li><strong>Support & Relationship Logs:</strong> High volumes of open bug reports, negative sentiment scores in ticket replies, or a complete absence of contact for over 90 days.</li>
</ul>

<blockquote>
  "Single-point indicators, like NPS, are notoriously lagging. Centralizing multi-layered usage and relationship signals is the only way to build an authentic index."
</blockquote>

<h2>How RetentIQ Models the Health Index</h2>
<p>Using a lightweight FastAPI microservice, RetentIQ pulls telemetry from platforms like Stripe, Mixpanel, and Intercom. The data is normalized and passed to our Llama-3.3 predictive engine. The engine computes an organic Health Score between 0 and 100.</p>

<p>When the score falls below a critical boundary, it triggers a real-time webhook. Customer Success managers are alerted immediately via Slack with custom playbooks, ensuring they can reach out to the customer with solutions immediately.</p>
    `,
  },
  {
    slug: 'architecting-realtime-customer-success-alerts',
    title: 'Architecting Real-Time Customer Success Alerts with Slack Webhooks',
    excerpt:
      'An engineering deep-dive on setting up low-latency customer health score monitors and automated CSM notification dispatches.',
    publishedAt: 'June 08, 2026',
    readTime: '8 min read',
    category: 'CS Playbooks',
    author: {
      name: 'Marcus Chen',
      role: 'Principal Engineer',
      avatar: '/images/author-marcus.webp',
    },
    tags: ['Webhooks', 'Slack Integration', 'FastAPI', 'Event-Driven'],
    content: `
<h2>Why Real-Time Alerts Matter</h2>
<p>In the enterprise space, timing is everything. If a high-value customer encounters a critical billing error or experiences a sharp drop in feature adoption, an alert dispatched 7 days later during a weekly report is too late. The customer has already experienced friction.</p>

<p>An event-driven architecture that alerts CSMs the moment a health threshold is crossed ensures immediate action and builds trust.</p>

<h2>Designing the Webhook Trigger Pipeline</h2>
<p>Setting up alerts involves a three-stage event pipeline:</p>
<ol>
  <li><strong>Ingestion and Score Calculation:</strong> Background workers pull event logs and compute user health scores.</li>
  <li><strong>Threshold Evaluator:</strong> An evaluator detects if the score has dropped below the predefined boundaries (e.g. from 72 down to 38).</li>
  <li><strong>Slack Webhook Dispatcher:</strong> A worker constructs an interactive Slack message layout using Block Kit and posts it to the relevant CSM channel.</li>
</ol>

<h2>Code Example: Dispatching an Alert via FastAPI</h2>
<pre><code>
@app.post("/api/v1/alerts/dispatch")
async def dispatch_slack_alert(payload: AlertPayload):
    blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Critical Churn Risk Alert:* \\n*Account:* {payload.account_name}\\n*Health Score:* {payload.health_score}"
            }
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Open Playbook"},
                    "url": f"https://retentiq.com/dashboard/playbooks/{payload.playbook_id}"
                }
            ]
        }
    ]
    
    async with httpx.AsyncClient() as client:
        response = await client.post(payload.slack_webhook_url, json={"blocks": blocks})
        return {"status": "dispatched", "code": response.status_code}
</code></pre>

<h2>Operationalizing Webhook Payloads</h2>
<p>Sending the alert is just the beginning. The alert must contain context: why the score dropped (e.g. 80% decrease in export actions) and direct links to recommended action steps so CSMs can start working immediately without researching the account history.</p>
    `,
  },
  {
    slug: 'securing-tenant-data-with-supabase-rls',
    title: 'Securing SaaS Multi-Tenancy Data using Supabase Row-Level Security',
    excerpt:
      'A comprehensive security guide on writing bulletproof PostgreSQL RLS policies to safeguard sensitive customer usage data.',
    publishedAt: 'June 01, 2026',
    readTime: '5 min read',
    category: 'Data Security',
    author: {
      name: 'Elena Rostova',
      role: 'Head of Security & Compliance',
      avatar: '/images/author-elena.webp',
    },
    tags: ['Supabase', 'PostgreSQL', 'RLS', 'Security'],
    content: `
<h2>The Importance of Multi-Tenancy Isolation</h2>
<p>For B2B applications handling sensitive telemetry data, ensuring that tenant A can never access tenant B's data is the absolute highest priority. A single leak of customer data can destroy a SaaS company's reputation and lead to severe regulatory penalties.</p>

<p>While security can be implemented at the application code level, placing it directly inside the database layer using Row-Level Security (RLS) offers an ironclad defense against data leakage.</p>

<h2>How Supabase Row-Level Security Works</h2>
<p>Supabase is built on PostgreSQL, which natively supports RLS. RLS enables you to define policies that restrict which rows a user can SELECT, INSERT, UPDATE, or DELETE based on their authenticated user profile.</p>

<p>When a client queries the database, Supabase automatically intercepts the request, evaluates the user's JSON Web Token (JWT), and applies the corresponding policy context directly in PostgreSQL.</p>

<h2>Writing Secure RLS Policies</h2>
<p>Here is an example of a policy securing customer health telemetry. This policy guarantees that users can only select customer logs belonging to their own organization:</p>

<pre><code>
-- Enable RLS on the table
ALTER TABLE customer_health_logs ENABLE ROW LEVEL SECURITY;

-- Create policy allowing Select only if user belongs to organization
CREATE POLICY select_org_logs ON customer_health_logs
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );
</code></pre>

<h2>Testing and Auditing</h2>
<p>Always audit your RLS policies during testing. Create test profiles for multiple organizations and verify that requests targeting other tenant IDs return empty results or permission errors. Keeping policies clean and minimal is crucial for performance and reliability.</p>
    `,
  },
];

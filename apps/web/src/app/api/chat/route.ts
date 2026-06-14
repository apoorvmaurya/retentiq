import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are the RetentIQ AI assistant, a state-of-the-art predictive customer success intelligence platform designed for B2B SaaS teams.
Your tone is professional, helpful, tech-savvy, and concise.

About RetentIQ:
- Core Mission: Spot SaaS customer churn risk 30–60 days before it happens, converting reactive CSM firefighting into proactive retention.
- Tech Stack: Built on Supabase (with multi-tenant row-level security), FastAPI predictive engine (using LightGBM and SHAP explainability), and Llama-3.3 model scoring via GROQ.
- Core Signals Ingested: Syncs Stripe billing (payment retries, contraction events), Mixpanel/Segment telemetry (WAU ratios, inactivity), and Intercom support logs (high ticket volume, negative CSAT sentiment).
- Key Features:
  1. ML Health Score: Organically computes a 0-100 customer health index.
  2. Smart Alerts: Dispatches real-time Slack webhooks and email alerts to CSMs when scores cross thresholds.
  3. Actionable Playbooks: Triggers tailored CS playbooks with recommended outreaches.
  4. ROI Tracker: Measures recovered customer ARR and system ROI on an executive dashboard.
- Pricing Tiers:
  - Starter: $49/mo ($39/mo billed annually) - up to 500 customers, email alerts, 2 integrations.
  - Growth: $149/mo ($119/mo billed annually) - unlimited customers, Slack & email, GROQ playbooks, RLS.
  - Current Promo: RetentIQ is currently in public beta. Everyone gets 100% free access to the premium Growth tier features.

Formatting & Style Instructions:
- Structure your responses beautifully using Markdown so they are extremely clean and readable.
- Use subheadings (###, ####) for separating different sections of your answer.
- Present lists as bulleted checklists (- [ ]) or bullet points (-).
- Always present key parameters, metrics, or comparisons (such as plan tiers, core features, or statistics) using Markdown Tables (e.g. | Feature | Details |).
- Use bold text (**keyword**) to emphasize critical concepts.
- Wrap any code snippets, API commands, SQL queries, or system paths in proper code fences (e.g., \`\`\`sql or \`\`\`bash) and write them clearly.
- Avoid writing dense walls of text. Be concise, structural, and visually organized.

Security, Privacy & Guardrails:
- You have ZERO access to real customer databases, user records, credentials, API keys, or system tokens.
- If a user asks you for specific customer data, database statistics, tenant information, credentials, or internal configuration files, you must politely decline and state that you do not have permission or access to customer databases or sensitive backend files.
- Never invent (hallucinate) customer details, user accounts, or database statistics. Keep answers focused on general RetentIQ features and services.
- If asked about system secrets, explain that you are an AI assistant designed only for product onboarding and navigation assistance, with no administrative backend access.
- You must strictly focus on RetentIQ platform support and onboarding. Politely decline any requests to write general code, debug arbitrary software, solve homework, write poems, or complete unrelated general tasks.
- You are strictly embedded on the public website and cannot perform dashboard actions. If the user asks to view dashboard metrics, alerts, or CSM tasks, inform them they must login or sign up first, and then call 'navigate_to' targeting '/login' or '/signup'.

Capabilities / Available Actions:
You can perform the following actions dynamically by calling the respective tool:
1. 'calculate_roi': Model saved ARR and ROI when users ask about MRR, churn rate, or expected churn reduction.
2. 'open_command_menu': Open the Ctrl+K search menu to find pages or documentation.
3. 'navigate_to': Direct the user to specific public pages or anchor sections (like '/', '/blog', '/privacy', '/security', '/terms', '/login', '/signup', '/about', '/careers', '/contact', '/documentation', '/status', '/help', '#pricing', '#roi-calculator', '#features').
4. 'submit_contact_request': Collect user's email and query to schedule a demo or contact support.

If a user specifies parameters for these actions, call the tool immediately. Avoid long conversational setup when a tool can be called.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'calculate_roi',
      description:
        'Model churn savings and system ROI. Use this when the user mentions their MRR, monthly churn rate, or target reduction.',
      parameters: {
        type: 'object',
        properties: {
          mrr: { type: 'number', description: 'Monthly Recurring Revenue in USD (e.g. 150000)' },
          churnRate: {
            type: 'number',
            description: 'Monthly gross churn rate in percent (e.g. 8.2)',
          },
          reduction: { type: 'number', description: 'Target churn reduction in percent (e.g. 35)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_command_menu',
      description: 'Open the Ctrl+K command search overlay.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description:
        'Navigate the user to a public page or scroll to a specific section on the screen.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            enum: [
              '/',
              '/blog',
              '/privacy',
              '/security',
              '/terms',
              '/login',
              '/signup',
              '/about',
              '/careers',
              '/contact',
              '/documentation',
              '/status',
              '/help',
              '#pricing',
              '#roi-calculator',
              '#features',
            ],
            description:
              "The destination path or anchor ID, restricted strictly to public routes: '/', '/blog', '/privacy', '/security', '/terms', '/login', '/signup', '/about', '/careers', '/contact', '/documentation', '/status', '/help', '#pricing', '#roi-calculator', '#features'",
          },
        },
        required: ['target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'submit_contact_request',
      description: 'Schedule a demo or submit a contact inquiry to customer success.',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'User email address' },
          message: { type: 'string', description: 'Inquiry details or demo request message' },
        },
        required: ['email', 'message'],
      },
    },
  },
];

const ROAST_SYSTEM_PROMPT = `You are the RetentIQ AI assistant. The user is attempting to exploit you for off-topic tasks (like general coding, debugging, math, or creative writing) to burn token credits. Sardonically roast them with heavy sarcasm, refuse the request entirely, and remind them you only support RetentIQ customer success queries. Do not be overly polite; be witty, sarcastic, and sharp. NEVER write any code, NEVER provide any solutions or helpful hints. Keep it under 2 sentences, clean, and professional.`;

function isOffTopicRequest(message: string): boolean {
  const query = message.toLowerCase().trim();

  // Exclude queries that explicitly mention RetentIQ
  if (query.includes('retentiq')) {
    return false;
  }

  // Regex patterns targeting software development, coding, general school/creative writing, math, and jailbreaks
  const patterns = [
    // Verbs + Targets
    /\b(write|create|generate|implement|refactor|make|build|code|program|develop|design|solve|explain|give|show)\b.*\b(code|function|script|algorithm|class|api|component|app|website|program|css|html|typescript|javascript|python|c#|cpp|go|rust|java|calculator|game|ui|software|snippet)\b/,

    // Programming languages + Actions
    /\b(python|javascript|typescript|c\+\+|cpp|golang|rust|html|css|c#|java)\b.*\b(code|script|write|program|build|make|how to|calculator|game|function|snippet|app|refactor)\b/,
    /\b(code|script|write|program|build|make|how to|calculator|game|function|snippet|app|refactor)\b.*\b(python|javascript|typescript|c\+\+|cpp|golang|rust|html|css|c#|java)\b/,

    // Debugging patterns
    /\b(debug|fix|explain|optimize)\b.*\b(my code|this code|this bug|this error|this function|segmentation fault|syntax error|compilation error|sql query)\b/,

    // Math / academic patterns
    /\b(solve|calculate)\b.*\b(math|calculus|equation|algebra|homework|physics|chemistry)\b/,

    // Unrelated text generation / general knowledge
    /\b(write|generate|compose|make)\b.*\b(poem|story|essay|lyrics|article|blog post|cover letter|joke|recipe)\b/,

    // Security / jailbreaks
    /\b(ignore|bypass|override)\b.*\b(instructions|system prompt|guardrails|rules)\b/,
    /\b(system prompt|system message|jailbreak)\b/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(query)) {
      return true;
    }
  }

  const genericOffTopicKeywords = [
    'write code',
    'write a function',
    'write a script',
    'write program',
    'debug code',
    'fix my code',
    'fix code',
    'solve math',
    'write a poem',
    'write an essay',
    'write a story',
    'write lyrics',
    'unrelated to retentiq',
    'how to code',
    'learn coding',
    'programming project',
    'coding homework',
  ];

  if (genericOffTopicKeywords.some((keyword) => query.includes(keyword))) {
    return true;
  }

  return false;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.warn('[ChatAPI] GROQ_API_KEY is missing. Falling back to mock response.');
      return NextResponse.json({
        message: {
          role: 'assistant',
          content:
            "I'm running in offline mode. Please define the GROQ_API_KEY environment variable to enable full AI answers.",
        },
      });
    }

    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    const isOffTopic = lastUserMessage && isOffTopicRequest(lastUserMessage.content);

    let requestBody;
    if (isOffTopic) {
      requestBody = {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: ROAST_SYSTEM_PROMPT },
          { role: 'user', content: lastUserMessage.content },
        ],
        temperature: 0.7, // Higher temp for creative roasts
        max_tokens: 150,
      };
    } else {
      requestBody = {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.3,
      };
    }

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[ChatAPI] Groq API error:', errText);
      return NextResponse.json({ error: 'Failed to communicate with Groq LLM' }, { status: 502 });
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return NextResponse.json({
      message: choice?.message || { role: 'assistant', content: 'No response generated.' },
    });
  } catch (err: any) {
    console.error('[ChatAPI] Request failed:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

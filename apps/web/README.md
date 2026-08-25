# RetentIQ Web Application

The responsive web frontend for the RetentIQ Churn Intelligence Platform, built with Next.js 16+ App Router, React 19, Tailwind CSS, and Framer Motion.

---

## 🏗️ Structure

```
apps/web/
├── public/                 # Static branding, diagrams, and assets
├── src/
│   ├── app/
│   │   ├── (auth)/         # Authentication routes (login, signup)
│   │   ├── (marketing)/    # Marketing landing pages, about, documentation, privacy, terms
│   │   ├── api/            # Next.js route handlers and proxy rules
│   │   ├── auth/           # OAuth callback handler
│   │   ├── dashboard/      # Authenticated SaaS application portal
│   │   │   ├── alerts/     # Churn alert delivery center
│   │   │   ├── analytics/  # Retention analytics and KPI metrics
│   │   │   ├── customers/  # Customer health index and drill-down
│   │   │   ├── integrations/ # Modular CRM and webhook connectors
│   │   │   ├── overview/   # Real-time health pulse dashboard
│   │   │   ├── playbooks/  # Dynamic AI mitigation action plans
│   │   │   ├── settings/   # Organization and threshold configurations
│   │   │   └── tasks/      # Retention task manager
│   │   └── onboarding/     # Initial organization wizard
│   ├── components/         # Reusable design system components & tests
│   │   └── __tests__/      # Vitest component unit tests
│   ├── hooks/              # Custom React hooks (real-time health scores)
│   └── lib/                # API client, Supabase client/server, utilities
└── vitest.config.ts        # Vitest configuration for frontend tests
```

---

## 🚀 Running Locally

```bash
# From repository root
pnpm --filter @retentiq/web dev

# Run unit tests
pnpm --filter @retentiq/web test

# Run tests with coverage
pnpm --filter @retentiq/web test:coverage
```

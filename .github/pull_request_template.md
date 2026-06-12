## Description

Please include a summary of the changes and the related issue/ticket. Include relevant motivation and context. List any dependencies that are required for this change.

Closes # (issue number)

## Type of Change

Please delete options that are not relevant:

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (chore, performance optimization, no public API changes)
- [ ] Documentation / CI / Config update

## Testing & Verification

Describe the tests that you ran to verify your changes. Provide instructions so we can reproduce. Please also list any relevant details for your test configuration.

- **Automated Tests**: (e.g. `pnpm lint`, `pnpm build`, `pnpm --filter @retentiq/api test`)
- **Manual Verification**: (Describe how you verified the changes manually - screenshots, postman logs, etc.)

### Screenshots / Screen Recording (if UI changes are made)

<!-- Add markdown images/GIFs or links here -->

## Security & Privacy Checklist

- [ ] No hardcoded passwords, API keys, or connection strings are committed.
- [ ] Any new env variables are documented in `.env.local.example`.
- [ ] Sensitive data is handled securely and is compliant with RLS (Row Level Security) policies.
- [ ] Webhook signature verification is enforced for production environments.

## Performance Checklist

- [ ] Scroll animations and UI rendering maintain 60fps (no layout thrashing/unnecessary re-renders).
- [ ] Database queries use indexes or are optimized through parameterized ORM statements.
- [ ] Standalone build bundle sizes have been reviewed.

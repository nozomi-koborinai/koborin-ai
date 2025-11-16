## Purpose / Background

<!-- Why does this change exist? What problem does it solve? -->

## Summary of Changes

<!-- List major modifications grouped by layer (infrastructure, app, docs, tests) -->

### Infrastructure (`infrastructure/`)

<!-- CDKTF stacks, configurations, resources -->

### Application (`app/`)

<!-- Next.js components, API routes, MDX content -->

### Documentation

<!-- README, AGENTS, docs/ updates -->

### Tests

<!-- New or updated test files -->

## Verification Steps

```bash
# Commands to verify the changes
```

<!-- Expected results -->

## Impact / Compatibility

<!-- Note any breaking changes, API changes, schema migrations, or dependencies -->

## Architecture Decisions

<!-- Explain significant design choices or trade-offs -->

## Related Documentation

<!-- Link to relevant docs, issues, or design documents -->

## Checklist

- [ ] Conventional Commit in the commit message
- [ ] Base branch: main (or specify if different)
- [ ] Local quality checks executed:
  - [ ] Infrastructure: `npm run build && npm run lint && npm run test` in `infrastructure/`
  - [ ] Application: `npm run build && npm run lint && npm run typecheck && npm run test` in `app/`
  - [ ] Markdown: All `.md` files pass linting (no MD0xx errors)
- [ ] Documentation updated if behavior changed
- [ ] Manual GCP steps documented (if any)


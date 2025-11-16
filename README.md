# koborin.ai

Personal website + engineering playground for `koborin.ai`.  
The repository hosts both the Next.js application and the Google Cloud infrastructure (managed via CDK for Terraform 0.21.x).

## Project Goals

- Deliver a fast personal site with MDX-based content, deployable to Cloud Run (dev/prod) via a shared HTTPS load balancer.
- Keep every change (infra + app) under version control and shipped only through GitHub Actions using Workload Identity Federation.
- Maintain strong observability: Cloud Logging/Monitoring/Trace, structured logging, PV tracking, and a secure contact flow.

## Architecture Snapshot

| Layer | Dev (`dev.koborin.ai`) | Prod (`koborin.ai`) |
| --- | --- | --- |
| Runtime | Cloud Run (`koborin-ai-web-dev`) | Cloud Run (`koborin-ai-web-prod`) |
| Access | IAP allow list (via Secret) + `X-Robots-Tag: noindex` | Public internet |
| Content | Same MDX corpus; dev builds may include drafts | Reviewed content only |
| Analytics | GA4 (debug view) + optional server events | GA4 + server events + Cloud Monitoring |

## Tech Stack

- **Frontend**: Next.js (App Router), MDX, Tailwind CSS, TypeScript.
- **Content Management**: MDX stored under `content/` within git. No separate CMS or admin UI; PR reviews gate any publication. Drafts reside in `content/drafts` and can be excluded from prod builds.
- **Analytics & o11y**:
  - Google Analytics 4 for baseline PV/engagement.
  - Optional custom `/api/track` endpoint writing to Cloud Logging → BigQuery for privacy-friendly metrics.
  - Cloud Monitoring dashboards + alert policies (via Terraform) for Cloud Run metrics.
- **Infrastructure**: CDK for Terraform 0.21.x (TypeScript) targeting Google Cloud.
- **CI/CD**: GitHub Actions (Workload Identity), separate workflows per `shared` / `dev` / `prod`.
- **Testing**: Vite + Vitest (shared config across app and infra), Playwright for future E2E if needed.

## Repository Layout (planned)

```text
.
├── app/                    # Next.js application (to be created)
├── content/                # MDX articles/pages, versioned with git
├── docs/                   # Architecture notes, contact-flow specs, etc.
├── infrastructure/         # CDKTF project (shared/dev/prod stacks)
├── .github/workflows/      # CI pipelines (plan/apply, app deploy)
├── README.md               # This file
└── AGENTS.md               # English operations guide for collaborators
```

## Workflow Overview

1. **Infra changes**: edit CDKTF stacks → `npm run test:infra` → open PR → GitHub Actions runs synth/plan → reviewer approves → merge triggers apply on the right environment.
2. **App changes**: edit Next.js/MDX → `npm run test` + `npm run lint` → PR → CI builds container, pushes to Artifact Registry, and updates Cloud Run via Terraform apply.
3. **Content-only updates**: modify MDX, include frontmatter (`title`, `slug`, `published`, etc.), run `npm run content:lint`, open PR. Draft pieces stay under `content/drafts`.

## Local Setup (once the app repo is initialized)

```bash
# Node.js >= 20, npm 10 recommended
npm install

# Run Next.js dev server (app directory)
npm run dev --prefix app

# Run infrastructure unit tests
npm run test:infra --prefix infrastructure
```

## Infrastructure Dev Notes

- CDKTF `cdktf.json` uses `node lib/main.js` and pins `google` / `google-beta` providers to `~> 6.50`.
- Each stack configures `GcsBackend` with the same bucket but different prefixes (`shared`, `dev`, `prod`).
- **Shared stack** (currently implemented):
  - API enablement (Run, Compute, IAM, DNS, Artifact Registry, IAP, Monitoring, Logging).
  - Artifact Registry for container images.
  - Global static IP (PREMIUM tier).
  - Managed SSL Certificate (multi-domain: `koborin.ai`, `dev.koborin.ai`).
  - Complete HTTPS Load Balancer:
    - Serverless NEGs (dev/prod) referencing Cloud Run services by name.
    - Backend Services (dev with IAP + `X-Robots-Tag: noindex`, prod without IAP).
    - URL Map (host-based routing).
    - Target HTTPS Proxy.
    - Global Forwarding Rule.
- **Dev/Prod stacks** (to be created):
  - Cloud Run services (`koborin-ai-web-dev` / `koborin-ai-web-prod`).
  - Environment-specific configurations and secrets.
- **Resources to be imported**:
  - DNS managed zone (`koborin-ai`).
  - Workload Identity Pool & Provider.
  - Terraform deployer service account.

## Contact & Analytics Design (planned)

- Contact form will post to `/api/contact` (Next.js Route Handler) with:
  - Payload validation (Zod), reCAPTCHA enforcement, structured logging to Cloud Logging.
  - Notification via SendGrid or Gmail API (configured via Secret Manager).
- `/api/track` endpoint will receive custom events and forward to Cloud Logging/BigQuery.
- GA4 integration via Google Tag Manager (prod: standard measurement, dev: DebugView only).

## Documentation

- `README.md`: quickstart + architectural highlights (this file).
- `AGENTS.md`: contribution workflow, review checklist, release rules, IaC philosophy.
- `docs/`: deeper specs (contact API design, observability runbooks, MDX authoring tips).

## Current Status

- ✅ Infrastructure: Shared stack implemented with complete HTTPS LB setup.
- ✅ CI/CD: GitHub Actions workflows for plan/apply (shared/dev/prod).
- ✅ Documentation: README and AGENTS.md with coding standards.
- ⏳ Application: Next.js app to be scaffolded.
- ⏳ Dev/Prod stacks: Cloud Run services to be created.
- ⏳ DNS/WIF: Existing resources to be imported into Terraform state.

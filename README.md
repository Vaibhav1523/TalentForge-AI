# HookStep — Tech Talent Platform

**Live:** [hookstep.in](https://hookstep.in)

A hiring platform built with Next.js: WebGL aurora background, scroll-driven tree reveal, domain tech stacks (AI/ML, Full Stack, Data Science, DevOps, QA), and interactive HookStep word.

## Features

- **Aurora WebGL** — Animated gradient background with scroll-linked shader
- **Tree layer** — Fixed tree + ground mesh that appears in the story section, brightens at Message 2, exits at end trigger
- **Hero nav** — Sticky nav with logo, links, CTA; burger menu on small screens; “Find a Job” scrolls to story
- **Domains** — Hover/click tabs to switch tech stacks; logo wall + tile grid with CDN icons (Simple Icons)
- **HookStep** — Large word with per-letter hover/touch glow
- **Accessibility** — Skip link, focus-visible styles, keyboard nav on domain tabs (←/→), ARIA where needed
- **Responsive** — Layout adapts for mobile; smooth scroll and reduced-motion respected

## Run locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Deploy (Google Cloud Run)

Production deploys use **GitHub Actions** (`.github/workflows/cloud-run-hookstep.yml`) and **Docker**. See workflow comments for required secrets and `scripts/` for env sync to Secret Manager (`npm run env:sync`).

## API Testing (Postman)

The `postman/` directory contains:
- `HookStep-API.postman_collection.json` — the full API collection (safe to commit)
- `HookStep-Local.postman_environment.json` — **excluded from VCS** (contains secrets)

### Setting up your local sessionToken

The `sessionToken` environment variable must hold a valid NextAuth session token so protected routes authenticate correctly.

1. Start the dev server (`npm run dev`) and sign in at `http://localhost:3000`.
2. Open DevTools → Application → Cookies → `next-auth.session-token`. Copy the cookie value.
3. In Postman, open **Environments → HookStep Local** and paste the value into `sessionToken`.
4. **Never commit** `HookStep-Local.postman_environment.json` — it is listed in `.gitignore` because it may contain secrets. Each developer maintains their own local copy.

## Stack

- Next.js 14 (App Router), React, TypeScript
- WebGL (aurora), Canvas 2D (tree + ground)
- Google Cloud Run + Artifact Registry for hosting

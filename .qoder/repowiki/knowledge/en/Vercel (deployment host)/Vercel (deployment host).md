---
kind: external_dependency
name: Vercel (deployment host)
slug: vercel
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

### Vercel
- Role: deployment target for the built SPA; `vercel.json` configures redirects and build settings.
- Evidence anchor: README lists the live URL hosted at `atelier-pro-syncc.lovable.app`, which routes through Vercel; `vercel.json` is present in the repo root.
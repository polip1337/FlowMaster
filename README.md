# FlowMaster

AI-friendly project skeleton for keeping context small, scoped, and predictable as the codebase grows.

## Recommended Structure

```text
FlowMaster/
  apps/                  # Runnable applications/services
    README.md
  packages/              # Reusable libraries (domain/ui/data/utils)
    README.md
  docs/                  # Architecture, ADRs, and operational docs
    README.md
    adr/
      README.md
  scripts/               # Automation (dev/build/release/maintenance)
    README.md
  tests/                 # Cross-package tests or test tooling
    README.md
  .cursor/
    rules/
      README.md
```

## AI Context Rules

- Keep modules focused and small (prefer ~150-300 lines per file).
- Use clear boundaries: apps depend on packages; packages do not depend on apps.
- Export public APIs through a single barrel file per package (`index.ts` or `public.ts`).
- Place short `README.md` files in major folders to describe scope and entry points.
- Avoid dumping generated artifacts into source paths (e.g., build output, logs).

## Conventions

- Naming:
  - Apps: `apps/<app-name>/`
  - Shared libs: `packages/<package-name>/`
  - ADRs: `docs/adr/NNN-short-title.md`
- Keep each package independently understandable:
  - `src/`
  - `README.md`
  - tests near code or in `tests/`
- Keep pull requests small and single-purpose to reduce review/context overhead.

## Next Setup Steps

1. Add your first app under `apps/`.
2. Extract shared logic into `packages/`.
3. Add architecture decisions in `docs/adr/`.
4. Add Cursor rules in `.cursor/rules/` for project-specific AI guidance.

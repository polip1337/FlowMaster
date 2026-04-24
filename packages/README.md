# packages

Contains shared, reusable libraries.

## Purpose

- Centralize domain logic and common utilities.
- Keep APIs explicit and stable.

## Suggested Layout

```text
packages/
  domain/
    src/
    README.md
  ui/
    src/
    README.md
  data/
    src/
    README.md
  utils/
    src/
    README.md
```

## Rules

- Expose a public API via `index.ts` (or `public.ts`).
- Avoid deep imports into another package internals.
- Keep dependency direction clear (for example: `ui -> domain`, not reverse).

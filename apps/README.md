# apps

Contains runnable apps or services.

## Purpose

- Keep product-specific code isolated from shared libraries.
- Limit cross-app coupling.

## Suggested Layout

```text
apps/
  web/
    src/
    README.md
  api/
    src/
    README.md
```

## Rules

- App code can import from `packages/*`.
- App code should not be imported by `packages/*`.
- Add an app-local `README.md` with start/test/build commands.

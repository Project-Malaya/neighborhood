# Copilot Instructions for Neighborhood

## Project context

This repository is an Angular application for a neighborhood-focused experience. Keep solutions aligned with the existing Angular app structure and the repository's AGENTS.md guidance.

## Core operating rules

- Prefer standalone Angular components and modern Angular patterns.
- Use signals for local state and computed values.
- Use native template control flow (`@if`, `@for`, `@switch`) instead of structural directives.
- Prefer `input()`, `output()`, and `model()` over decorator-based APIs.
- Use `inject()` for dependency injection in services and components when appropriate.
- Avoid `any`; prefer typed data and `unknown` where needed.
- Keep components small, focused, and accessible.
- Use `NgOptimizedImage` for static images and avoid relying on globals like `new Date()` in templates.
- Follow WCAG AA accessibility expectations and ensure a11y-friendly interactions and focus management.

## Required repo-specific checks

Before implementing major changes:

1. Review the repo guidance in `AGENTS.md`.
2. Confirm the relevant Angular version and app structure in the project files.
3. Prefer the smallest, most targeted change that solves the issue.
4. Validate the affected behavior with the most relevant test or build target available.

## Available agent skills

This workspace is configured to use the following skills when they apply to the task:

- `angular-developer` — Angular architecture, state, forms, routing, accessibility, and modern Angular best practices.
- `angular-new-app` — scaffolding and application setup guidance for Angular projects.
- `supabase` — Supabase integration, auth, storage, and client usage.
- `supabase-postgres-best-practices` — schema, SQL, database changes, RLS, and Postgres guidance.
- `find-skills` — discover other installed or available agent capabilities when needed.

When a task touches Angular app structure, UI patterns, Supabase usage, or database changes, use the relevant skill and follow its guidance before finalizing the implementation.

## Working style

- Keep the solution maintainable and easy to reason about.
- Favor type-safe, explicit code over clever abstractions.
- Prefer talking through the root cause before applying fixes.
- If uncertain, inspect the nearest working example in the codebase and stay consistent with established patterns.
- Keep scope narrow; avoid unrelated refactors.

## Relevant files to consult

- `AGENTS.md` — repository-level instructions and constraints.
- `README.md` — project overview and setup context.
- `src/` — app implementation.
- `skills-lock.json` — installed/locked skill metadata for this workspace.

This file should be considered the default guidance for Copilot in this repository.

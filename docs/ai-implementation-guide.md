# AI Implementation Guide

This codebase now has a small set of reusable patterns that should be the default starting point for new work.

## What should stay custom

Course content, lesson bodies, and curriculum data should remain content-driven. Everything around that content should prefer shared primitives over bespoke page structure.

## Page structure

For authenticated product screens, start with:

- `AppShell` from `/Users/emers/Documents/Averon Systems/ACL/components/app-shell.tsx`
- `AppHeader` for sticky top bars
- `AppMain` for page width and spacing
- `PageIntro` for title, kicker, and description blocks
- `LoadingScreen` from `/Users/emers/Documents/Averon Systems/ACL/components/loading-screen.tsx` for async states

These components encode the current visual system, spacing, and backdrop so new pages do not need to rebuild those concerns from scratch.

## Client auth and profile loading

When a client page needs the signed-in user or profile, prefer:

- `getClientAuthContext`
- `getClientProfile`
- `resolveAuthenticatedAppPath`

from `/Users/emers/Documents/Averon Systems/ACL/lib/auth/client-auth.ts`

Those helpers centralize:

- Supabase user and session lookup
- profile loading
- fallback behavior when `school_id` is not present in an older schema
- role-based app redirects

## Preferred implementation order

When adding a new feature:

1. Put shared logic in `lib/`
2. Put shared UI in `components/`
3. Keep page files focused on orchestration and page-specific queries
4. Keep curriculum and authored content in the existing course and lesson content areas

## Refactor rule of thumb

If a second page needs the same layout, loading state, auth check, or panel treatment, extract it immediately instead of copying it again.

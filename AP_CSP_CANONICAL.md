# AP CSP Canonical Source

AP CSP now has one canonical runtime identity in the app and one trimmed migration path in the repo.

## Canonical course ID

- `00000000-0000-0000-0000-000000000010`

## Canonical script set

- [scripts/042_ap_csp_beginner_remake.sql](/Users/emers/Documents/Averon%20Systems/ACL/scripts/042_ap_csp_beginner_remake.sql)
  Introduces notion infrastructure and the beginner-first AP CSP remake.
- [scripts/044_ap_csp_applied_exercises.sql](/Users/emers/Documents/Averon%20Systems/ACL/scripts/044_ap_csp_applied_exercises.sql)
  Expands applied AP CSP checkpoint practice.
- [scripts/045_ap_csp_concrete_course_rewrite.sql](/Users/emers/Documents/Averon%20Systems/ACL/scripts/045_ap_csp_concrete_course_rewrite.sql)
  Makes lesson notes and checkpoint instructions more concrete.
- [scripts/046_ap_csp_longer_beginner_ide_path.sql](/Users/emers/Documents/Averon%20Systems/ACL/scripts/046_ap_csp_longer_beginner_ide_path.sql)
  Final beginner-path rewrite for the live AP CSP experience.
- [scripts/047_lesson_experience_foundation.sql](/Users/emers/Documents/Averon%20Systems/ACL/scripts/047_lesson_experience_foundation.sql)
  Shared lesson/checkpoint infrastructure used by AP CSP.
- [scripts/048_canonicalize_ap_csp.sql](/Users/emers/Documents/Averon%20Systems/ACL/scripts/048_canonicalize_ap_csp.sql)
  Moves legacy AP CSP references onto the canonical course ID and deactivates duplicate course rows.

## Removed legacy AP CSP rewrites

These older scripts were removed because they overlapped with the canonical path and created source-of-truth drift:

- `scripts/023_upgrade_ap_csp_elite.sql`
- `scripts/024_create_ap_csp_elite.sql`
- `scripts/025_ap_csp_elite_simple.sql`
- `scripts/037_upgrade_ap_csp_depth.sql`
- `scripts/040_ap_csp_beginner_foundation_refresh.sql`
- `scripts/041_ap_csp_master_curriculum.sql`
- `scripts/043_upgrade_ap_csp_gentle_path.sql`

## App behavior

- The course catalog now deduplicates AP CSP and prefers the canonical course.
- Teacher course selection also prefers the canonical course.
- Legacy AP CSP course links redirect to the canonical course page.

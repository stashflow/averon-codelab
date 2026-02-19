export type VersionEntry = {
  version: string
  date: string
  title: string
  summary: string
  commitPrompt: string
}

export type ReleasePlan = {
  currentVersion: string
  nextSuggestedVersion: string
  targetRelease: string
  readinessPercent: number
  statusLabel: string
}

export const releasePlan: ReleasePlan = {
  currentVersion: 'beta 0.6',
  nextSuggestedVersion: 'beta 0.7',
  targetRelease: 'v1.0.0',
  readinessPercent: 62,
  statusLabel: 'Core platform stable; curriculum and UX hardening in progress.',
}

// Add one new entry per commit and keep newest first.
export const versionChangelog: VersionEntry[] = [
  {
    version: 'beta 0.6',
    date: '2026-02-19',
    title: 'Theme Consistency and AP CSP Quality Pass',
    summary:
      'Unified theme tokens, removed hardcoded landing/dashboard blues, added student custom CSS theme controls, and strengthened AP CSP gentle-path checkpoints.',
    commitPrompt:
      'Unify site theming, add student custom color controls with reset, and harden AP CSP gentle-path assessment rigor with boundary tests.',
  },
]


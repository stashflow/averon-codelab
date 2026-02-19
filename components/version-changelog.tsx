import { releasePlan, versionChangelog } from '@/lib/version-changelog'

export function VersionChangelog() {
  return (
    <div className="mt-8 rounded-2xl border border-border bg-card/70 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Version Changelog</p>
        <p className="text-sm text-foreground">
          Current: <span className="font-semibold">{releasePlan.currentVersion}</span> | Next: <span className="font-semibold">{releasePlan.nextSuggestedVersion}</span> | Target: <span className="font-semibold">{releasePlan.targetRelease}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Release readiness: {releasePlan.readinessPercent}% - {releasePlan.statusLabel}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {versionChangelog.map((entry) => (
          <div key={`${entry.version}-${entry.date}`} className="rounded-xl border border-border bg-background/70 p-4">
            <p className="text-sm font-semibold text-foreground">{entry.version} - {entry.title}</p>
            <p className="text-xs text-muted-foreground">{entry.date}</p>
            <p className="mt-2 text-sm text-muted-foreground">{entry.summary}</p>
            <p className="mt-2 text-xs text-foreground/90">
              <span className="font-semibold">Commit Prompt:</span> {entry.commitPrompt}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}


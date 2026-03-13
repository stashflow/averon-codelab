'use client'

type AuthShowcaseProps = {
  eyebrow: string
  title: string
  description: string
  points: string[]
}

export function AuthShowcase({
  eyebrow,
  title,
  description,
  points,
}: AuthShowcaseProps) {
  return (
    <div className="relative hidden flex-1 items-stretch overflow-hidden border-l border-border/70 bg-background/30 lg:flex">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(72,165,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,84,255,0.16),transparent_34%)]" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
      <div className="absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute left-10 top-14 h-36 w-36 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute bottom-16 right-12 h-44 w-44 rounded-full bg-sky-400/12 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full items-center justify-center p-12 xl:p-16">
        <div className="w-full max-w-xl space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">{eyebrow}</p>
            <h2 className="text-4xl font-bold tracking-tight text-foreground xl:text-5xl">
              {title}
            </h2>
            <p className="max-w-lg text-lg leading-relaxed text-foreground/72">
              {description}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-background/70 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Workspace
              </span>
            </div>

            <div className="grid min-h-[340px] grid-cols-[220px_1fr]">
              <div className="border-r border-border/70 bg-background/72 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Explore
                </p>
                <div className="mt-4 space-y-3">
                  {['courses/', 'lessons/', 'sandbox/', 'progress/'].map((item, index) => (
                    <div
                      key={item}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        index === 2
                          ? 'border-primary/30 bg-primary/10 text-foreground'
                          : 'border-border/60 bg-background/72 text-foreground/72'
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative p-5">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,0.08),transparent_45%,rgba(14,165,233,0.08))]" />
                <div className="relative space-y-5">
                  <div className="rounded-2xl border border-border/70 bg-background/86 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      editor.py
                    </p>
                    <div className="mt-4 space-y-2 font-mono text-sm leading-7 text-foreground/80">
                      <div><span className="text-primary">def</span> launch_progress(student):</div>
                      <div className="pl-4"><span className="text-sky-400">return</span> student<span className="text-foreground/40">.</span>practice()</div>
                      <div className="pt-2 text-foreground/55"># learn faster with guided feedback</div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {points.map((point) => (
                      <div
                        key={point}
                        className="rounded-2xl border border-border/70 bg-background/76 px-4 py-3 text-sm text-foreground/72"
                      >
                        {point}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground/80">
                    Designed to feel calm, capable, and classroom-ready from the first click.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SiteBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden warm-aurora">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.18)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.18)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.08]" />
      <div className="absolute left-[8%] top-[-10%] h-80 w-80 rounded-full bg-primary/12 blur-[120px]" />
      <div className="absolute right-[10%] top-[12%] h-72 w-72 rounded-full bg-accent/12 blur-[120px]" />
      <div className="absolute bottom-[-12%] left-[20%] h-96 w-96 rounded-full bg-primary/10 blur-[140px]" />
      <div className="absolute bottom-[8%] right-[16%] h-80 w-80 rounded-full bg-accent/10 blur-[120px]" />
    </div>
  )
}

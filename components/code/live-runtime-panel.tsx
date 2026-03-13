'use client'

import { Loader2, TerminalSquare } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type LiveRuntimePanelProps = {
  output: string
  error?: string | null
  runtime?: string | null
  status?: string | null
  running?: boolean
  title?: string
  subtitle?: string
  onClear?: () => void
  className?: string
}

export function LiveRuntimePanel({
  output,
  error,
  runtime,
  status,
  running = false,
  title = 'Terminal',
  subtitle = 'Programs can request input while they run.',
  onClear,
  className = '',
}: LiveRuntimePanelProps) {
  return (
    <div className={`overflow-hidden rounded-lg border border-slate-700 bg-[#0b1020] ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-700 bg-[#111a33] px-3 py-2">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-cyan-300" />
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-[11px] text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {runtime && <Badge className="border-slate-700 bg-slate-900 text-slate-200">{runtime}</Badge>}
          <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 capitalize">
            {running ? 'running' : status || 'idle'}
          </Badge>
          {onClear && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              onClick={onClear}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
      <div className="min-h-[200px] bg-[#05080c] p-4">
        {running && !output && (
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting Python runtime...
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-slate-100">
          {output || 'Run your code to see live output here.'}
        </pre>
      </div>
    </div>
  )
}

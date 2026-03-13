import { cn } from '@/lib/utils'

type LoadingScreenProps = {
  message?: string
  className?: string
}

export function LoadingScreen({
  message = 'Loading...',
  className,
}: LoadingScreenProps) {
  return (
    <div className={cn('flex min-h-screen items-center justify-center bg-background', className)}>
      <div className="space-y-4 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

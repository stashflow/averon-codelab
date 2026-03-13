import type { ReactNode } from 'react'

import { SiteBackdrop } from '@/components/site-backdrop'
import { cn } from '@/lib/utils'

type ShellWidth = '6xl' | '7xl'

const widthClassMap: Record<ShellWidth, string> = {
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
}

type AppShellProps = {
  children: ReactNode
  className?: string
}

type AppHeaderProps = {
  children: ReactNode
  className?: string
  containerClassName?: string
  width?: ShellWidth
}

type AppMainProps = {
  children: ReactNode
  className?: string
  containerClassName?: string
  width?: ShellWidth
}

type PageIntroProps = {
  kicker?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
  titleClassName?: string
  descriptionClassName?: string
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn('min-h-screen warm-aurora text-foreground', className)}>
      <SiteBackdrop />
      {children}
    </div>
  )
}

export function AppHeader({
  children,
  className,
  containerClassName,
  width = '7xl',
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl',
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto flex items-center justify-between gap-4 px-4 py-4',
          widthClassMap[width],
          containerClassName,
        )}
      >
        {children}
      </div>
    </header>
  )
}

export function AppMain({
  children,
  className,
  containerClassName,
  width = '7xl',
}: AppMainProps) {
  return (
    <main className={cn('relative z-10', className)}>
      <div
        className={cn(
          'mx-auto space-y-8 px-4 py-8',
          widthClassMap[width],
          containerClassName,
        )}
      >
        {children}
      </div>
    </main>
  )
}

export function PageIntro({
  kicker,
  title,
  description,
  actions,
  className,
  titleClassName,
  descriptionClassName,
}: PageIntroProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {kicker ? (
        <p className="site-kicker">
          <span className="h-px w-4 bg-primary" />
          {kicker}
        </p>
      ) : null}
      <h1 className={cn('site-title text-3xl sm:text-4xl', titleClassName)}>{title}</h1>
      {description ? (
        <p className={cn('site-subtitle max-w-2xl', descriptionClassName)}>{description}</p>
      ) : null}
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}

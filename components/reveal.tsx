'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  distance?: number
  once?: boolean
}

export function Reveal({ children, className, delay = 0, distance = 18, once = true }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            setVisible(false)
          }
        })
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [once])

  return (
    <div
      ref={ref}
      style={
        {
          ['--reveal-delay' as string]: `${delay}ms`,
          ['--reveal-distance' as string]: `${distance}px`,
        } as CSSProperties
      }
      className={cn('reveal-block', visible && 'reveal-block-visible', className)}
    >
      {children}
    </div>
  )
}

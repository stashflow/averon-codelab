'use client'

import { useEffect } from 'react'

const faviconByTheme: Record<string, string> = {
  ocean: '/icon',
  forest: '/icon-forest',
  sunset: '/icon-sunset',
  rose: '/icon-rose',
}

function getThemeName() {
  const attr = document.documentElement.getAttribute('data-color-theme')
  if (!attr || attr === 'ocean') return 'ocean'
  if (attr === 'forest' || attr === 'sunset' || attr === 'rose') return attr
  return 'ocean'
}

function upsertLink(rel: string, href: string) {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }
  link.href = href
}

function applyThemeFavicon() {
  const theme = getThemeName()
  const baseHref = faviconByTheme[theme] || faviconByTheme.ocean
  const href = `${baseHref}?v=${theme}`
  upsertLink('icon', href)
  upsertLink('shortcut icon', href)
  upsertLink('apple-touch-icon', href)
}

export function FaviconThemeSync() {
  useEffect(() => {
    applyThemeFavicon()

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-color-theme') {
          applyThemeFavicon()
          break
        }
      }
    })

    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

  return null
}

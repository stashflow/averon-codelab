'use client'

import { Moon, Sun, Palette } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const colorThemes = [
  { name: 'Ocean', value: 'ocean', color: 'bg-cyan-500' },
  { name: 'Forest', value: 'forest', color: 'bg-emerald-500' },
  { name: 'Sunset', value: 'sunset', color: 'bg-orange-500' },
  { name: 'Rose', value: 'rose', color: 'bg-rose-500' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [colorTheme, setColorTheme] = useState('ocean')

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
    const savedColorTheme = localStorage.getItem('color-theme') || 'ocean'
    setColorTheme(savedColorTheme)
    if (savedColorTheme !== 'ocean') {
      document.documentElement.setAttribute('data-color-theme', savedColorTheme)
    }
  }, [])

  const handleColorThemeChange = (newColorTheme: string) => {
    setColorTheme(newColorTheme)
    localStorage.setItem('color-theme', newColorTheme)
    if (newColorTheme === 'ocean') {
      document.documentElement.removeAttribute('data-color-theme')
    } else {
      document.documentElement.setAttribute('data-color-theme', newColorTheme)
    }
  }

  if (!mounted) {
    return (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="w-9 h-9">
          <Sun className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="w-9 h-9">
          <Palette className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-1">
      {/* Light/Dark Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="w-9 h-9"
      >
        {theme === 'dark' ? (
          <Sun className="h-4 w-4 text-foreground" />
        ) : (
          <Moon className="h-4 w-4 text-foreground" />
        )}
        <span className="sr-only">Toggle light/dark mode</span>
      </Button>

      {/* Color Theme Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="w-9 h-9">
            <Palette className="h-4 w-4 text-foreground" />
            <span className="sr-only">Select color theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Color Themes</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {colorThemes.map((ct) => (
            <DropdownMenuItem
              key={ct.value}
              onClick={() => handleColorThemeChange(ct.value)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className={`w-4 h-4 rounded-full ${ct.color}`} />
              <span>{ct.name}</span>
              {colorTheme === ct.value && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

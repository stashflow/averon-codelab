'use client'

import { useEffect } from 'react'
import { applyColorTheme, applyCustomThemeColors, getStoredColorTheme, getStoredCustomThemeColors } from '@/lib/color-theme'

export function ColorThemeSync() {
  useEffect(() => {
    applyColorTheme(getStoredColorTheme())
    applyCustomThemeColors(getStoredCustomThemeColors())
  }, [])

  return null
}


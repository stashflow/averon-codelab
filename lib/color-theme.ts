export const COLOR_THEME_STORAGE_KEY = 'color-theme'
export const CUSTOM_THEME_COLORS_STORAGE_KEY = 'custom-theme-colors'

export const COLOR_THEMES = ['sunset', 'rose', 'forest'] as const
export type ColorTheme = (typeof COLOR_THEMES)[number]

export type CustomThemeColors = {
  primary: string
  accent: string
  background: string
  foreground: string
}

export const defaultCustomThemeColors: CustomThemeColors = {
  primary: '',
  accent: '',
  background: '',
  foreground: '',
}

export const customThemeColorVarMap: Record<keyof CustomThemeColors, string> = {
  primary: '--primary',
  accent: '--accent',
  background: '--background',
  foreground: '--foreground',
}

function isValidColorTheme(value: string | null): value is ColorTheme {
  return !!value && COLOR_THEMES.includes(value as ColorTheme)
}

function sanitizeColorValue(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!/^[#(),.%+\-/\s0-9a-zA-Z]+$/.test(trimmed)) return ''
  return trimmed.slice(0, 64)
}

export function getStoredColorTheme(): ColorTheme {
  if (typeof window === 'undefined') return 'sunset'
  const saved = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY)
  return isValidColorTheme(saved) ? saved : 'sunset'
}

export function applyColorTheme(theme: ColorTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-color-theme', theme)
}

export function setStoredColorTheme(theme: ColorTheme) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme)
  }
  applyColorTheme(theme)
}

export function getStoredCustomThemeColors(): CustomThemeColors {
  if (typeof window === 'undefined') return defaultCustomThemeColors
  const raw = window.localStorage.getItem(CUSTOM_THEME_COLORS_STORAGE_KEY)
  if (!raw) return defaultCustomThemeColors

  try {
    const parsed = JSON.parse(raw) as Partial<CustomThemeColors>
    return {
      primary: sanitizeColorValue(parsed.primary),
      accent: sanitizeColorValue(parsed.accent),
      background: sanitizeColorValue(parsed.background),
      foreground: sanitizeColorValue(parsed.foreground),
    }
  } catch {
    return defaultCustomThemeColors
  }
}

export function applyCustomThemeColors(colors: CustomThemeColors) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const [key, cssVar] of Object.entries(customThemeColorVarMap) as [keyof CustomThemeColors, string][]) {
    const value = sanitizeColorValue(colors[key])
    if (value) {
      root.style.setProperty(cssVar, value)
    } else {
      root.style.removeProperty(cssVar)
    }
  }
}

export function setStoredCustomThemeColors(colors: CustomThemeColors) {
  const normalized: CustomThemeColors = {
    primary: sanitizeColorValue(colors.primary),
    accent: sanitizeColorValue(colors.accent),
    background: sanitizeColorValue(colors.background),
    foreground: sanitizeColorValue(colors.foreground),
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CUSTOM_THEME_COLORS_STORAGE_KEY, JSON.stringify(normalized))
  }
  applyCustomThemeColors(normalized)
  return normalized
}

export function resetStoredCustomThemeColors() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(CUSTOM_THEME_COLORS_STORAGE_KEY)
  }
  applyCustomThemeColors(defaultCustomThemeColors)
}


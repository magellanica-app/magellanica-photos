import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

// Appearance preferences are kept in this browser so each device can follow
// its own system settings.

export const themeVariants = ['standard', 'spectrum'] as const
type ThemeVariant = typeof themeVariants[number]
export type Scheme = 'system' | 'light' | 'dark'
export type Contrast = 'system' | 'default' | 'high' | 'glass'
// The tint of the glass background, one of the presets in patternfly.css.
export type GlassColor = 'fuchsia' | 'orchid' | 'raspberry' | 'twilight' | 'rose' | 'plum'

const schemes: Scheme[] = ['system', 'light', 'dark']
const contrasts: Contrast[] = ['system', 'default', 'high', 'glass']
export const glassColors: GlassColor[] = ['fuchsia', 'orchid', 'raspberry', 'twilight', 'rose', 'plum']

function stored<T extends string>(key: string, allowed: T[]): T {
  const value = localStorage.getItem(key) as T | null
  return value && allowed.includes(value) ? value : allowed[0]!
}

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
const prefersMoreContrast = window.matchMedia('(prefers-contrast: more)')

function storedVariant(): ThemeVariant {
  const value = localStorage.getItem('themeVariant')
  if (value === 'standard' || value === 'spectrum') {
    return value
  }
  // The original Spectrum preview was a Glass tint.
  if (localStorage.getItem('contrast') === 'glass' && localStorage.getItem('glassColor') === 'spectrum') {
    localStorage.setItem('themeVariant', 'spectrum')
    return 'spectrum'
  }
  return 'standard'
}

function themeName(variant: ThemeVariant, scheme: Scheme, contrast: Contrast, systemDark: boolean, systemMore: boolean) {
  if (variant === 'spectrum') {
    return variant
  }
  const dark = scheme === 'dark' || (scheme === 'system' && systemDark)
  const high = contrast === 'high' || (contrast === 'system' && systemMore)
  return `${dark ? 'dark' : 'light'}${high ? '-hc' : ''}`
}

function applyGlass(variant: ThemeVariant, contrast: Contrast) {
  document.documentElement.classList.toggle('glass', variant === 'standard' && contrast === 'glass')
}

function applyGlassColor(color: GlassColor) {
  document.documentElement.dataset.glassColor = color
}

// The theme to start with, read before the app mounts so the page does not
// flash in the wrong colors.
export function initialThemeName() {
  const variant = storedVariant()
  const contrast = stored('contrast', contrasts)
  applyGlass(variant, contrast)
  applyGlassColor(stored('glassColor', glassColors))
  return themeName(variant, stored('scheme', schemes), contrast, prefersDark.matches, prefersMoreContrast.matches)
}

export const useAppearanceStore = defineStore('appearance', () => {
  const variant = ref(storedVariant())
  const scheme = ref(stored('scheme', schemes))
  const contrast = ref(stored('contrast', contrasts))
  const glassColor = ref(stored('glassColor', glassColors))
  const systemDark = ref(prefersDark.matches)
  const systemMore = ref(prefersMoreContrast.matches)

  prefersDark.addEventListener('change', (event) => (systemDark.value = event.matches))
  prefersMoreContrast.addEventListener('change', (event) => (systemMore.value = event.matches))

  watch(variant, (value) => localStorage.setItem('themeVariant', value))
  watch(scheme, (value) => localStorage.setItem('scheme', value))
  watch(contrast, (value) => localStorage.setItem('contrast', value))
  watch([variant, contrast], ([currentVariant, currentContrast]) => applyGlass(currentVariant, currentContrast))

  watch(glassColor, (value) => {
    localStorage.setItem('glassColor', value)
    applyGlassColor(value)
  })

  const theme = computed(() => themeName(variant.value, scheme.value, contrast.value, systemDark.value, systemMore.value))

  return { variant, scheme, contrast, glassColor, theme }
})

import { DEFAULT_SETTINGS, type WebSettings } from '../types'

const STORAGE_KEY = 'audinote:web:settings'

export const SettingsStore = {
  get(): WebSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  },

  save(patch: Partial<WebSettings>): WebSettings {
    const next = { ...SettingsStore.get(), ...patch }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  },
}

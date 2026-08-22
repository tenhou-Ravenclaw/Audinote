import { Preferences } from '@capacitor/preferences'
import type { MobileSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const KEYS = ['apiKey', 'summaryPrompt'] as const

export const SettingsStore = {
  async get(): Promise<MobileSettings> {
    const entries = await Promise.all(
      KEYS.map(async key => {
        const { value } = await Preferences.get({ key })
        return [key, value ?? DEFAULT_SETTINGS[key]] as const
      })
    )
    return Object.fromEntries(entries) as unknown as MobileSettings
  },

  async save(patch: Partial<MobileSettings>): Promise<void> {
    await Promise.all(
      Object.entries(patch).map(([key, value]) =>
        Preferences.set({ key, value: value ?? '' })
      )
    )
  },
}

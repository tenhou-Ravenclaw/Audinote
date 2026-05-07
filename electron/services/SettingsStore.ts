import Store from 'electron-store'
import type { Settings } from '../types'

const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  recorderName: '',
  audioSubDir: 'RECORD',
  outputDir: '',
  summaryPrompt: '以下の音声の文字起こしを、議事録形式で要約してください。\n\n{{TRANSCRIPTION}}',
}

// electron-store はメインプロセスでのみ使用する
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Store<Settings>({ defaults: DEFAULT_SETTINGS }) as any

export const SettingsStore = {
  get: (): Settings => ({
    apiKey:        store.get('apiKey'),
    recorderName:  store.get('recorderName'),
    audioSubDir:   store.get('audioSubDir'),
    outputDir:     store.get('outputDir'),
    summaryPrompt: store.get('summaryPrompt'),
  }),
  save: (settings: Partial<Settings>): void => {
    for (const [key, value] of Object.entries(settings)) {
      store.set(key, value)
    }
  },
}

import type { Settings, LogEntry, ProcessingProgress } from '../../electron/types'

// preload で exposeInMainWorld した window.audinote の型定義
declare global {
  interface Window {
    audinote: {
      getSettings: () => Promise<Settings>
      saveSettings: (settings: Partial<Settings>) => Promise<void>
      getUsbStatus: () => Promise<{ connected: boolean; devicePath?: string }>
      getHistory: () => Promise<LogEntry[]>
      startProcessing: (audioPath: string) => Promise<void>
      retryFile: (fileName: string) => Promise<void>
      selectFolder: () => Promise<string | null>
      openFile: (filePath: string) => Promise<void>
      onUsbStatus: (cb: (data: { connected: boolean; devicePath?: string }) => void) => void
      onProcessingProgress: (cb: (progress: ProcessingProgress) => void) => void
      offUsbStatus: () => void
      offProcessingProgress: () => void
    }
  }
}

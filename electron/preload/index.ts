import { ipcRenderer, contextBridge } from 'electron'
import type { Settings, LogEntry, ProcessingProgress } from '../types'

// レンダラーから呼び出せる API を定義する
// 型定義は src/types/electron.d.ts に記載する
contextBridge.exposeInMainWorld('audinote', {
  // 設定
  getSettings: (): Promise<Settings> =>
    ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<Settings>): Promise<void> =>
    ipcRenderer.invoke('settings:save', settings),

  // 履歴
  getHistory: (): Promise<LogEntry[]> =>
    ipcRenderer.invoke('history:get'),

  // USB 状態（起動時に一度 pull する用）
  getUsbStatus: (): Promise<{ connected: boolean; devicePath?: string }> =>
    ipcRenderer.invoke('usb:get-status'),

  // 処理（手動実行）
  startProcessing: (audioPath: string): Promise<void> =>
    ipcRenderer.invoke('processing:start-manual', audioPath),

  // 処理（Retry）
  retryFile: (fileName: string): Promise<void> =>
    ipcRenderer.invoke('processing:retry', fileName),

  // ダイアログ
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-folder'),
  openFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('file:open', filePath),

  // イベント購読
  onUsbStatus: (cb: (data: { connected: boolean; devicePath?: string }) => void) =>
    ipcRenderer.on('usb:status-changed', (_, data) => cb(data)),
  onProcessingProgress: (cb: (progress: ProcessingProgress) => void) =>
    ipcRenderer.on('processing:progress', (_, data) => cb(data)),
  offUsbStatus: () =>
    ipcRenderer.removeAllListeners('usb:status-changed'),
  offProcessingProgress: () =>
    ipcRenderer.removeAllListeners('processing:progress'),
})

import { ipcMain, dialog, shell } from 'electron'
import type { BrowserWindow } from 'electron'
import { SettingsStore } from '../services/SettingsStore'
import { ProcessingLogger } from '../services/ProcessingLogger'
import { AudioProcessor } from '../services/AudioProcessor'
import { startUsbWatcher } from '../services/UsbWatcher'
import type { ProcessingProgress } from '../types'

// レンダラーへのイベント送信ヘルパー
const emit = (win: BrowserWindow, channel: string, data: unknown) => {
  if (!win.isDestroyed()) win.webContents.send(channel, data)
}

export function registerIpcHandlers(win: BrowserWindow): void {
  const onProgress = (progress: ProcessingProgress) => {
    console.log('[IPC] processing:progress →', progress)
    emit(win, 'processing:progress', progress)
  }

  // 最新の USB 状態を保持しておく（レンダラーが後から取得できるよう）
  let lastUsbStatus: { connected: boolean; devicePath?: string } = { connected: false }

  const onUsbStatusChange = async (connected: boolean, devicePath?: string) => {
    lastUsbStatus = { connected, devicePath }
    emit(win, 'usb:status-changed', lastUsbStatus)

    if (connected && devicePath) {
      const settings = SettingsStore.get()
      console.log('[IPC] USB connected, apiKey set:', !!settings.apiKey, 'outputDir:', settings.outputDir)
      if (!settings.apiKey || !settings.outputDir) return
      await AudioProcessor.processDevice(devicePath, settings, onProgress)
    }
  }

  ipcMain.handle('usb:get-status', () => lastUsbStatus)

  // ウォッチャーのクリーンアップ関数を保持し、設定変更時に再起動できるようにする
  let stopWatcher = startUsbWatcher(SettingsStore.get().recorderName, onUsbStatusChange)

  // --- 設定 ---

  ipcMain.handle('settings:get', () => SettingsStore.get())

  ipcMain.handle('settings:save', (_, settings) => {
    SettingsStore.save(settings)
    // レコーダー名が変わった可能性があるためウォッチャーを再起動する
    stopWatcher()
    stopWatcher = startUsbWatcher(SettingsStore.get().recorderName, onUsbStatusChange)
  })

  // --- 履歴 ---

  ipcMain.handle('history:get', () => ProcessingLogger.getAll())

  // --- ファイル処理（手動実行・Retry） ---

  ipcMain.handle('processing:start-manual', async (_, audioPath: string) => {
    const settings = SettingsStore.get()
    await AudioProcessor.processDevice(audioPath, settings, onProgress)
  })

  ipcMain.handle('processing:retry', async (_, fileName: string) => {
    const settings = SettingsStore.get()
    await AudioProcessor.retryFile(fileName, settings, onProgress)
  })


  // --- ダイアログ ---

  ipcMain.handle('dialog:select-folder', async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('file:open', (_, filePath: string) => {
    shell.openPath(filePath)
  })
}

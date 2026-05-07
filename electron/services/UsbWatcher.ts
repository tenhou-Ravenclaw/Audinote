import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

type UsbStatusCallback = (connected: boolean, devicePath?: string) => void

const POLL_INTERVAL_MS = 10000

// プラットフォームごとのマウントポイント探索
async function findDevice(recorderName: string): Promise<string | null> {
  if (os.platform() === 'darwin') {
    return findDeviceMacOS(recorderName)
  } else if (os.platform() === 'win32') {
    return findDeviceWindows(recorderName)
  }
  return null
}

// macOS: /Volumes/ 配下でボリューム名が一致するディレクトリを探す
async function findDeviceMacOS(recorderName: string): Promise<string | null> {
  try {
    const entries = await fs.readdir('/Volumes', { withFileTypes: true })
    const match = entries.find(e => e.isDirectory() && e.name === recorderName)
    return match ? path.join('/Volumes', match.name) : null
  } catch {
    return null
  }
}

// Windows: PowerShell を1回呼び出して全ドライブのラベルを取得し一致するものを返す
// -NoProfile -NonInteractive で起動コストを削減する
async function findDeviceWindows(recorderName: string): Promise<string | null> {
  const { execFileSync } = await import('node:child_process')
  try {
    const output = execFileSync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Volume | Where-Object {$_.DriveLetter} | Select-Object DriveLetter, FileSystemLabel | ConvertTo-Json',
    ], { encoding: 'utf-8', timeout: 5000 })

    console.log('[UsbWatcher] raw output:', output)
    const volumes = JSON.parse(output) as { DriveLetter: string; FileSystemLabel: string }[]
    const entries = Array.isArray(volumes) ? volumes : [volumes]
    console.log('[UsbWatcher] entries:', JSON.stringify(entries))
    console.log('[UsbWatcher] looking for:', JSON.stringify(recorderName.trim()))
    const match = entries.find(v => v.FileSystemLabel?.trim() === recorderName.trim())
    console.log('[UsbWatcher] match:', match ?? 'none')
    return match ? `${match.DriveLetter}:\\` : null
  } catch (err) {
    console.error('[UsbWatcher] error:', err)
    return null
  }
}

export function startUsbWatcher(recorderName: string, onStatusChange: UsbStatusCallback): () => void {
  let wasConnected = false

  const poll = async () => {
    // レコーダー名が未設定の場合はスキップ
    if (!recorderName) return

    const devicePath = await findDevice(recorderName)
    const isConnected = devicePath !== null

    if (isConnected !== wasConnected) {
      wasConnected = isConnected
      onStatusChange(isConnected, devicePath ?? undefined)
    }
  }

  poll() // 初回即実行
  const interval = setInterval(poll, POLL_INTERVAL_MS)

  // クリーンアップ関数を返す
  return () => clearInterval(interval)
}

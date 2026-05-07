import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { app } from 'electron'
import type { LogEntry, LogStatus } from '../types'

// ユーザーデータフォルダ内にログを保存する
const getLogPath = () => path.join(app.getPath('userData'), 'processing_log.jsonl')

export const ProcessingLogger = {
  async log(
    sourceAudio: string,
    outputMarkdown: string | null,
    status: LogStatus,
    errorMessage?: string
  ): Promise<void> {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      sourceAudio,
      outputMarkdown,
      processedAt: new Date().toISOString(),
      status,
      errorMessage,
    }
    await fs.appendFile(getLogPath(), JSON.stringify(entry) + '\n', 'utf-8')
  },

  async getAll(): Promise<LogEntry[]> {
    try {
      const content = await fs.readFile(getLogPath(), 'utf-8')
      return content
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line) as LogEntry)
        .reverse() // 新しい順
    } catch {
      return []
    }
  },
}

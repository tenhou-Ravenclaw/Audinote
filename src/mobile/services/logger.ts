import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import type { LogEntry, LogStatus } from '../types'

const LOG_FILE = 'audinote_log.jsonl'

export const ProcessingLogger = {
  async log(
    sourceAudio: string,
    outputFilename: string | null,
    status: LogStatus,
    errorMessage?: string
  ): Promise<void> {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      sourceAudio,
      outputFilename,
      processedAt: new Date().toISOString(),
      status,
      errorMessage,
    }
    const line = JSON.stringify(entry) + '\n'

    // 既存ファイルに追記（なければ作成）
    try {
      const { data } = await Filesystem.readFile({
        path: LOG_FILE,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      })
      await Filesystem.writeFile({
        path: LOG_FILE,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        data: data + line,
      })
    } catch {
      await Filesystem.writeFile({
        path: LOG_FILE,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        data: line,
      })
    }
  },

  async getAll(): Promise<LogEntry[]> {
    try {
      const { data } = await Filesystem.readFile({
        path: LOG_FILE,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      })
      return (data as string)
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line) as LogEntry)
        .reverse()
    } catch {
      return []
    }
  },
}

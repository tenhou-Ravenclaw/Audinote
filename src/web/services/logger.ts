import type { LogEntry, LogStatus } from '../types'

const LOG_KEY = 'audinote:web:log'
const MAX_ENTRIES = 200

export const ProcessingLogger = {
  log(
    sourceAudio: string,
    outputFilename: string | null,
    status: LogStatus,
    options?: { errorMessage?: string; summaryContent?: string }
  ): LogEntry {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      sourceAudio,
      outputFilename,
      processedAt: new Date().toISOString(),
      status,
      errorMessage: options?.errorMessage,
      summaryContent: options?.summaryContent,
    }
    const all = [entry, ...ProcessingLogger.getAll()].slice(0, MAX_ENTRIES)
    localStorage.setItem(LOG_KEY, JSON.stringify(all))
    return entry
  },

  getAll(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]')
    } catch {
      return []
    }
  },

  clear(): void {
    localStorage.removeItem(LOG_KEY)
  },
}

// モバイル版で使う型定義

export interface MobileSettings {
  apiKey: string
  summaryPrompt: string
}

export const DEFAULT_SETTINGS: MobileSettings = {
  apiKey: '',
  summaryPrompt: '以下の音声の文字起こしを、議事録形式で要約してください。\n\n{{TRANSCRIPTION}}',
}

export type ProcessingStatus =
  | 'idle'
  | 'transcribing'
  | 'summarizing'
  | 'saving'
  | 'done'
  | 'error'

export interface ProcessingProgress {
  status: ProcessingStatus
  fileName?: string
  error?: string
}

export type LogStatus =
  | 'summary_success'
  | 'failure'

export interface LogEntry {
  id: string
  sourceAudio: string
  outputFilename: string | null  // ファイル名のみ（パスなし）
  processedAt: string            // ISO 8601
  status: LogStatus
  errorMessage?: string
}

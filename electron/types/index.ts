// Audinote で使用する共有型定義

export interface Settings {
  apiKey: string
  recorderName: string    // USB デバイスのボリューム名 (例: "IC RECORDER")
  audioSubDir: string     // レコーダー内の音声フォルダ名 (例: "RECORD")
  outputDir: string       // Markdown の保存先フォルダ
  summaryPrompt: string   // Gemini に渡す要約プロンプト ({{TRANSCRIPTION}} を含む)
}

export type ProcessingStatus =
  | 'idle'
  | 'importing'
  | 'transcribing'
  | 'summarizing'
  | 'saving'
  | 'done'
  | 'error'

export interface ProcessingProgress {
  status: ProcessingStatus
  fileName?: string  // 処理中のファイル名
  error?: string
}

export type LogStatus =
  | 'summary_success'
  | 'transcribe_failure'
  | 'summary_failure'
  | 'failure'

export interface LogEntry {
  id: string
  sourceAudio: string
  outputMarkdown: string | null
  processedAt: string  // ISO 8601
  status: LogStatus
  errorMessage?: string
}

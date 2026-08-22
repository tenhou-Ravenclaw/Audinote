export interface WebSettings {
  whisperEndpoint: string
  ollamaEndpoint: string
  modelName: string
  summaryPrompt: string
  chunkThresholdSec: number
  chunkDurationSec: number
  chunkOverlapSec: number
  summaryChunkCharThreshold: number
}

export const DEFAULT_SETTINGS: WebSettings = {
  whisperEndpoint: 'http://localhost:8000/v1/audio/transcriptions',
  ollamaEndpoint: 'http://localhost:11434/v1/chat/completions',
  modelName: 'llama3.1',
  summaryPrompt: '以下の音声の文字起こしを、議事録形式で要約してください。\n\n{{TRANSCRIPTION}}',
  chunkThresholdSec: 20 * 60,
  chunkDurationSec: 15 * 60,
  chunkOverlapSec: 60,
  summaryChunkCharThreshold: 8000,
}

export type ProcessingStatus =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'summarizing'
  | 'saving'
  | 'done'
  | 'error'

export type InputMode = 'upload' | 'record'

export interface ProcessingProgress {
  status: ProcessingStatus
  fileName?: string
  chunkIndex?: number
  chunkTotal?: number
  summaryChunkIndex?: number
  summaryChunkTotal?: number
  error?: string
}

export type LogStatus = 'summary_success' | 'failure'

export interface LogEntry {
  id: string
  sourceAudio: string
  outputFilename: string | null
  processedAt: string
  status: LogStatus
  errorMessage?: string
  summaryContent?: string
}

export interface ProcessingResult {
  summary: string
  outputFilename: string
}

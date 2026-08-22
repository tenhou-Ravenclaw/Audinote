import { getAudioDuration, splitAudio } from './audioChunker'
import { WhisperClient } from './whisperClient'
import { OllamaClient } from './ollamaClient'
import { MarkdownWriter } from './markdownWriter'
import { ProcessingLogger } from './logger'
import type { WebSettings, ProcessingProgress, ProcessingResult } from '../types'

// 音声の長さに応じてチャンク分割し、Whisperで文字起こしする
async function transcribeWithChunking(
  blob: Blob,
  filename: string,
  settings: WebSettings,
  onProgress: (p: ProcessingProgress) => void
): Promise<string> {
  const duration = await getAudioDuration(blob)

  if (duration <= settings.chunkThresholdSec) {
    onProgress({ status: 'transcribing', fileName: filename })
    const result = await WhisperClient.transcribeChunk(blob, filename, settings)
    return result.text
  }

  const chunks = await splitAudio(blob, {
    chunkDurationSec: settings.chunkDurationSec,
    overlapSec: settings.chunkOverlapSec,
  })

  let transcript = ''
  for (let i = 0; i < chunks.length; i++) {
    onProgress({ status: 'transcribing', fileName: filename, chunkIndex: i + 1, chunkTotal: chunks.length })
    const result = await WhisperClient.transcribeChunk(chunks[i], `${filename}.part${i + 1}.wav`, settings)

    if (i > 0 && result.segments && result.segments.length > 0) {
      // タイムスタンプが取得できる場合、オーバーラップ区間（チャンク先頭の overlapSec 秒）の
      // セグメントを除外して重複読み上げを軽減する。取得できない場合は素の連結にフォールバックする。
      const trimmed = result.segments.filter(seg => seg.start >= settings.chunkOverlapSec)
      transcript += (transcript ? '\n' : '') + trimmed.map(s => s.text).join('')
    } else {
      transcript += (transcript ? '\n' : '') + result.text
    }
  }
  return transcript
}

export const AudioProcessor = {
  async process(
    audioBlob: Blob,
    filename: string,
    settings: WebSettings,
    onProgress: (p: ProcessingProgress) => void
  ): Promise<ProcessingResult | null> {
    try {
      const transcription = await transcribeWithChunking(audioBlob, filename, settings, onProgress)

      onProgress({ status: 'summarizing', fileName: filename })
      const needsMapReduce = transcription.length > settings.summaryChunkCharThreshold

      const [summary, filenameBase] = await Promise.all([
        needsMapReduce
          ? OllamaClient.summarizeMapReduce(transcription, settings, (index, total) =>
              onProgress({ status: 'summarizing', fileName: filename, summaryChunkIndex: index, summaryChunkTotal: total })
            )
          : OllamaClient.summarize(transcription, settings),
        OllamaClient.generateFilename(transcription, settings),
      ])

      onProgress({ status: 'saving', fileName: filename })
      const outputFilename = MarkdownWriter.buildFilename(filenameBase, new Date())
      MarkdownWriter.download(summary, outputFilename)

      ProcessingLogger.log(filename, outputFilename, 'summary_success', { summaryContent: summary })
      onProgress({ status: 'done', fileName: filename })
      return { summary, outputFilename }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      ProcessingLogger.log(filename, null, 'failure', { errorMessage: error })
      onProgress({ status: 'error', fileName: filename, error })
      return null
    }
  },
}

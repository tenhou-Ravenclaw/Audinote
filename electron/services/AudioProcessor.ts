import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import type { ProcessingProgress, Settings } from '../types'
import { GeminiClient } from './GeminiClient'
import { MarkdownWriter } from './MarkdownWriter'
import { ProcessingLogger } from './ProcessingLogger'
import { createConcurrencyLimiter } from './pLimit'

const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.m4a']

// Gemini API のレート制限を考慮した最大同時処理数
const TRANSCRIPTION_CONCURRENCY = 3

// 未処理ファイルの待機フォルダ（成功時に削除されるので、残っているものは未処理 or 失敗）
const getInboxDir = () => path.join(app.getPath('userData'), 'inbox')

// 現在処理中のファイル名を追跡し、同一ファイルの二重処理を防ぐ
const inFlight = new Set<string>()

type ProgressCallback = (progress: ProcessingProgress) => void

export const AudioProcessor = {
  async processDevice(devicePath: string, settings: Settings, onProgress: ProgressCallback): Promise<void> {
    const inboxDir = getInboxDir()
    await fs.mkdir(inboxDir, { recursive: true })

    // デバイスから inbox へコピー（既に存在するものはスキップ）
    const deviceFiles = await findAudioFiles(devicePath)
    await Promise.all(
      deviceFiles.map(async src => {
        const dest = path.join(inboxDir, path.basename(src))
        await fs.copyFile(src, dest, fs.constants.COPYFILE_EXCL).catch(() => {/* 既に inbox にある */})
      })
    )

    // inbox にある全ファイルを処理（失敗して残っているものも含む）
    const processedNames = await getProcessedFileNames()
    const inboxFiles = await findAudioFiles(inboxDir)
    const toProcess = inboxFiles.filter(f => !processedNames.has(path.basename(f)))
    if (toProcess.length === 0) return

    const limit = createConcurrencyLimiter(TRANSCRIPTION_CONCURRENCY)
    await Promise.all(
      toProcess.map(inboxPath => limit(() => processOneFile(inboxPath, settings, onProgress)))
    )
  },

  // History ページの Retry ボタン用：inbox に残っているファイルを再処理する
  async retryFile(fileName: string, settings: Settings, onProgress: ProgressCallback): Promise<void> {
    const inboxPath = path.join(getInboxDir(), fileName)
    await processOneFile(inboxPath, settings, onProgress)
  },

}

async function processOneFile(
  inboxPath: string,
  settings: Settings,
  onProgress: ProgressCallback
): Promise<void> {
  const fileName = path.basename(inboxPath)
  if (inFlight.has(fileName)) return
  inFlight.add(fileName)

  try {
    // 1. 文字起こし
    onProgress({ status: 'transcribing', fileName })
    const transcription = await GeminiClient.transcribe(inboxPath, settings.apiKey)

    // 2. 要約とファイル名生成を並列実行
    onProgress({ status: 'summarizing', fileName })
    const [summary, filenameBase] = await Promise.all([
      GeminiClient.summarize(transcription, settings.summaryPrompt, settings.apiKey),
      GeminiClient.generateFilename(transcription, settings.apiKey),
    ])

    // 3. 保存
    onProgress({ status: 'saving', fileName })
    const recordingDate = await getFileModifiedDate(inboxPath)
    const outputPath = await MarkdownWriter.save(summary, settings.outputDir, filenameBase, recordingDate)

    // 4. 処理成功 → inbox から削除
    await fs.unlink(inboxPath)

    await ProcessingLogger.log(fileName, path.basename(outputPath), 'summary_success')
    onProgress({ status: 'done', fileName })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await ProcessingLogger.log(fileName, null, 'failure', error)
    onProgress({ status: 'error', fileName, error })
    // inbox に残すことで Retry が可能
  } finally {
    inFlight.delete(fileName)
  }
}

// デバイス再接続時の再処理防止：成功済みファイル名のセットを返す
async function getProcessedFileNames(): Promise<Set<string>> {
  const logs = await ProcessingLogger.getAll()
  return new Set(logs.filter(l => l.status === 'summary_success').map(l => l.sourceAudio))
}

// 音声ファイルを再帰的に探す
async function findAudioFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await findAudioFiles(fullPath))
    } else if (AUDIO_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath)
    }
  }
  return files
}

async function getFileModifiedDate(filePath: string): Promise<Date> {
  const stat = await fs.stat(filePath)
  return stat.mtime
}

import type { MobileSettings, ProcessingProgress } from '../types'
import { GeminiClient, getMimeType } from './gemini'
import { MarkdownWriter } from './markdownWriter'
import { ProcessingLogger } from './logger'

type ProgressCallback = (p: ProcessingProgress) => void

export const AudioProcessor = {
  /**
   * @param base64Data  ファイルピッカーまたは Share Extension から得た Base64 音声データ
   * @param filename    元のファイル名（拡張子込み）
   * @param settings    API キーと要約プロンプト
   * @param onProgress  進捗コールバック
   */
  async process(
    base64Data: string,
    filename: string,
    settings: MobileSettings,
    onProgress: ProgressCallback
  ): Promise<void> {
    const mimeType = getMimeType(filename)

    try {
      // 1. 文字起こし
      onProgress({ status: 'transcribing', fileName: filename })
      const transcription = await GeminiClient.transcribe(base64Data, mimeType, settings.apiKey)

      // 2. 要約とファイル名生成を並列実行
      onProgress({ status: 'summarizing', fileName: filename })
      const [summary, filenameBase] = await Promise.all([
        GeminiClient.summarize(transcription, settings.summaryPrompt, settings.apiKey),
        GeminiClient.generateFilename(transcription, settings.apiKey),
      ])

      // 3. Markdown として保存
      onProgress({ status: 'saving', fileName: filename })
      const outputFilename = await MarkdownWriter.save(summary, filenameBase, new Date())

      await ProcessingLogger.log(filename, outputFilename, 'summary_success')
      onProgress({ status: 'done', fileName: filename })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      await ProcessingLogger.log(filename, null, 'failure', error)
      onProgress({ status: 'error', fileName: filename, error })
    }
  },
}

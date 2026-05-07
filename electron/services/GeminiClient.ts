import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager } from '@google/generative-ai/server'
import type { GenerativeModel } from '@google/generative-ai'

const MODEL_NAME = 'gemini-2.5-flash'

// apiKey ごとにクライアントをキャッシュし、毎回インスタンスを生成するコストを省く
const clientCache = new Map<string, { model: GenerativeModel; fileManager: GoogleAIFileManager }>()

function getClients(apiKey: string) {
  if (!clientCache.has(apiKey)) {
    const genAI = new GoogleGenerativeAI(apiKey)
    clientCache.set(apiKey, {
      model: genAI.getGenerativeModel({ model: MODEL_NAME }),
      fileManager: new GoogleAIFileManager(apiKey),
    })
  }
  return clientCache.get(apiKey)!
}

export const GeminiClient = {
  // 音声ファイルを文字起こしする
  async transcribe(audioPath: string, apiKey: string): Promise<string> {
    const { model, fileManager } = getClients(apiKey)

    const uploadResult = await fileManager.uploadFile(audioPath, {
      mimeType: getMimeType(audioPath),
    })
    const fileRef = { fileUri: uploadResult.file.uri, mimeType: uploadResult.file.mimeType }

    try {
      try {
        const result = await model.generateContent([
          'この音声ファイルを文字起こししてください。',
          { fileData: fileRef },
        ])
        return result.response.text()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (!msg.includes('RECITATION')) throw err
        // RECITATION ブロック時はパラフレーズで再試行
        const retry = await model.generateContent([
          'この音声の内容を独自の言葉でパラフレーズして記述してください。',
          { fileData: fileRef },
        ])
        return retry.response.text()
      }
    } finally {
      // 成否に関わらず API 上のファイルを削除
      await fileManager.deleteFile(uploadResult.file.name)
    }
  },

  // 文字起こし結果を要約する
  async summarize(transcription: string, prompt: string, apiKey: string): Promise<string> {
    const { model } = getClients(apiKey)
    const filledPrompt = prompt.replace('{{TRANSCRIPTION}}', transcription)
    const result = await model.generateContent(filledPrompt)
    return result.response.text()
  },

  // 文字起こし結果からファイル名を生成する（summarize と並列実行できるよう transcription を受け取る）
  async generateFilename(transcription: string, apiKey: string): Promise<string> {
    const { model } = getClients(apiKey)
    const prompt =
      `以下の文字起こしの内容を表す、50文字以内の日本語ファイル名を1つだけ生成してください。` +
      `ファイル名には日本語・英数字・ハイフン・アンダースコアのみ使用し、拡張子は不要です。\n\n${transcription.slice(0, 500)}`
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  },
}

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
  }
  return mimeTypes[ext ?? ''] ?? 'audio/mpeg'
}

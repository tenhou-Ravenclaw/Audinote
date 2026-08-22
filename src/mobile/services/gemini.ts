/**
 * ブラウザ（Capacitor）対応の Gemini クライアント
 *
 * Electron 版は GoogleAIFileManager（Node.js専用）でファイルをアップロードするが、
 * モバイル版は Base64 インラインデータとして音声を直接リクエストに埋め込む。
 * Gemini のインラインデータ上限は 20MB。Voice Memos の録音は通常これを大きく下回る。
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GenerativeModel } from '@google/generative-ai'

const MODEL_NAME = 'gemini-2.5-flash'

const modelCache = new Map<string, GenerativeModel>()

function getModel(apiKey: string): GenerativeModel {
  if (!modelCache.has(apiKey)) {
    const genAI = new GoogleGenerativeAI(apiKey)
    modelCache.set(apiKey, genAI.getGenerativeModel({ model: MODEL_NAME }))
  }
  return modelCache.get(apiKey)!
}

export const GeminiClient = {
  async transcribe(base64Audio: string, mimeType: string, apiKey: string): Promise<string> {
    const model = getModel(apiKey)
    const audioPart = { inlineData: { data: base64Audio, mimeType } }

    try {
      const result = await model.generateContent([
        'この音声ファイルを文字起こししてください。',
        audioPart,
      ])
      return result.response.text()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('RECITATION')) throw err
      // RECITATION ブロック時はパラフレーズで再試行
      const retry = await model.generateContent([
        'この音声の内容を独自の言葉でパラフレーズして記述してください。',
        audioPart,
      ])
      return retry.response.text()
    }
  },

  async summarize(transcription: string, prompt: string, apiKey: string): Promise<string> {
    const model = getModel(apiKey)
    const filledPrompt = prompt.replace('{{TRANSCRIPTION}}', transcription)
    const result = await model.generateContent(filledPrompt)
    return result.response.text()
  },

  async generateFilename(transcription: string, apiKey: string): Promise<string> {
    const model = getModel(apiKey)
    const prompt =
      `以下の文字起こしの内容を表す、50文字以内の日本語ファイル名を1つだけ生成してください。` +
      `ファイル名には日本語・英数字・ハイフン・アンダースコアのみ使用し、拡張子は不要です。\n\n${transcription.slice(0, 500)}`
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  },
}

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    caf: 'audio/x-caf',
    aac: 'audio/aac',
  }
  return map[ext ?? ''] ?? 'audio/mpeg'
}

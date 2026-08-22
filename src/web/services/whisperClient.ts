import type { WebSettings } from '../types'

export interface WhisperSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptionResult {
  text: string
  segments?: WhisperSegment[]
}

function wrapNetworkError(url: string, err: unknown): Error {
  const detail = err instanceof Error ? err.message : String(err)
  return new Error(`${url} に接続できませんでした。サーバーが起動しているか、CORS設定を確認してください。(${detail})`)
}

export const WhisperClient = {
  // 音声チャンクをWhisper互換サーバーへ送信し、文字起こし結果を取得する
  async transcribeChunk(blob: Blob, filename: string, settings: WebSettings): Promise<TranscriptionResult> {
    const form = new FormData()
    form.append('file', blob, filename)
    form.append('model', 'whisper-1')
    // セグメント単位のタイムスタンプが取得できればチャンクのオーバーラップ除去に使う。
    // 対応していないサーバーは無視して {text} のみ返すため、その場合はフォールバックする。
    form.append('response_format', 'verbose_json')

    let res: Response
    try {
      res = await fetch(settings.whisperEndpoint, { method: 'POST', body: form })
    } catch (err) {
      throw wrapNetworkError(settings.whisperEndpoint, err)
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Whisperサーバーがエラーを返しました: ${res.status} ${body}`)
    }

    const data = await res.json()
    if (typeof data === 'string') return { text: data }
    if (typeof data?.text === 'string') {
      return { text: data.text, segments: Array.isArray(data.segments) ? data.segments : undefined }
    }
    throw new Error('Whisperサーバーの応答形式を解釈できませんでした')
  },

  async testConnection(settings: WebSettings): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch(settings.whisperEndpoint, { method: 'OPTIONS' })
      return { ok: true, message: `到達可能 (HTTP ${res.status})` }
    } catch (err) {
      return { ok: false, message: wrapNetworkError(settings.whisperEndpoint, err).message }
    }
  },
}

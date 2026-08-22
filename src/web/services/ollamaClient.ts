import type { WebSettings } from '../types'

interface ChatResponse {
  choices?: { message?: { content?: string } }[]
}

function wrapNetworkError(url: string, err: unknown): Error {
  const detail = err instanceof Error ? err.message : String(err)
  return new Error(`${url} に接続できませんでした。サーバーが起動しているか、CORS設定を確認してください。(${detail})`)
}

async function chat(prompt: string, settings: WebSettings): Promise<string> {
  let res: Response
  try {
    res = await fetch(settings.ollamaEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.modelName,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
    })
  } catch (err) {
    throw wrapNetworkError(settings.ollamaEndpoint, err)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Ollamaサーバーがエラーを返しました: ${res.status} ${body}`)
  }
  const data = (await res.json()) as ChatResponse
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('Ollamaサーバーの応答形式を解釈できませんでした')
  return content.trim()
}

const FILENAME_PROMPT_PREFIX =
  '以下の文字起こしの内容を表す、50文字以内の日本語ファイル名を1つだけ生成してください。' +
  'ファイル名には日本語・英数字・ハイフン・アンダースコアのみ使用し、拡張子は不要です。\n\n'

const partialSummaryPrompt = (text: string) =>
  `以下は長い音声の文字起こしの一部です。この部分の要点を箇条書きで簡潔に抜き出してください。\n\n${text}`

const combineSummaryPrompt = (partials: string) =>
  `以下は同じ音声を分割して要約した複数の要約です。これらをまとめて1つの議事録形式の要約にしてください。\n\n${partials}`

export const OllamaClient = {
  summarize(transcription: string, settings: WebSettings): Promise<string> {
    return chat(settings.summaryPrompt.replace('{{TRANSCRIPTION}}', transcription), settings)
  },

  generateFilename(transcription: string, settings: WebSettings): Promise<string> {
    return chat(FILENAME_PROMPT_PREFIX + transcription.slice(0, 500), settings)
  },

  // 文字起こしが長すぎる場合、段落単位で部分要約してから統合する（map-reduce）
  async summarizeMapReduce(
    transcription: string,
    settings: WebSettings,
    onProgress?: (index: number, total: number) => void
  ): Promise<string> {
    const parts = splitIntoParagraphChunks(transcription, settings.summaryChunkCharThreshold)
    const partialSummaries: string[] = []
    for (let i = 0; i < parts.length; i++) {
      onProgress?.(i + 1, parts.length)
      partialSummaries.push(await chat(partialSummaryPrompt(parts[i]), settings))
    }
    const combined = partialSummaries.map((s, i) => `--- 部分 ${i + 1} ---\n${s}`).join('\n\n')
    return chat(combineSummaryPrompt(combined), settings)
  },

  async testConnection(settings: WebSettings): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch(settings.ollamaEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: settings.modelName, messages: [{ role: 'user', content: 'ping' }], stream: false }),
      })
      return { ok: true, message: `到達可能 (HTTP ${res.status})` }
    } catch (err) {
      return { ok: false, message: wrapNetworkError(settings.ollamaEndpoint, err).message }
    }
  },
}

function splitIntoParagraphChunks(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n{2,}/)
  const chunks: string[] = []
  let current = ''
  for (const p of paragraphs) {
    if (current && current.length + p.length + 2 > maxChars) {
      chunks.push(current)
      current = p
    } else {
      current = current ? `${current}\n\n${p}` : p
    }
  }
  if (current) chunks.push(current)
  return chunks.flatMap(chunk => (chunk.length > maxChars ? forceSplit(chunk, maxChars) : [chunk]))
}

function forceSplit(text: string, maxChars: number): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += maxChars) {
    out.push(text.slice(i, i + maxChars))
  }
  return out
}

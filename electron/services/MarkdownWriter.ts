import fs from 'node:fs/promises'
import path from 'node:path'

// ファイル名に使えない文字を除去する
function sanitizeFilename(name: string, maxLength = 50): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '')  // Windows / macOS 禁止文字を除去
    .replace(/\s+/g, '_')           // 空白をアンダースコアに
    .replace(/[_-]{2,}/g, '_')      // 連続アンダースコアを統合
    .trim()
    .slice(0, maxLength) || 'untitled_summary'
}

// 既存ファイルがある場合は連番を付与する
async function resolveUniqueOutputPath(dir: string, base: string): Promise<string> {
  let filePath = path.join(dir, `${base}.md`)
  let count = 1
  while (true) {
    try {
      await fs.access(filePath)
      filePath = path.join(dir, `${base}_${count}.md`)
      count++
    } catch {
      return filePath // ファイルが存在しなければこのパスを使用
    }
  }
}

export const MarkdownWriter = {
  // Markdown ファイルを YYYYMMDD_タイトル.md の形式で保存する
  async save(
    content: string,
    outputDir: string,
    filenameBase: string,
    date: Date
  ): Promise<string> {
    await fs.mkdir(outputDir, { recursive: true })

    const datePrefix = date.toISOString().slice(0, 10).replace(/-/g, '')
    const sanitized = sanitizeFilename(filenameBase)
    const outputPath = await resolveUniqueOutputPath(outputDir, `${datePrefix}_${sanitized}`)

    await fs.writeFile(outputPath, content, 'utf-8')
    return outputPath
  },
}

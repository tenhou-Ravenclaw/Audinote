import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'

const OUTPUT_DIR = 'Audinote'

function sanitizeFilename(name: string, maxLength = 50): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[_-]{2,}/g, '_')
    .trim()
    .slice(0, maxLength) || 'untitled_summary'
}

async function resolveUniqueFilename(base: string): Promise<string> {
  let filename = `${base}.md`
  let count = 1
  while (true) {
    try {
      await Filesystem.stat({
        path: `${OUTPUT_DIR}/${filename}`,
        directory: Directory.Documents,
      })
      filename = `${base}_${count}.md`
      count++
    } catch {
      return filename
    }
  }
}

export const MarkdownWriter = {
  /**
   * Markdown を Documents/Audinote/ に保存し、ファイル名を返す。
   * Files アプリから直接アクセスできる（iTunes File Sharing 有効時）。
   */
  async save(content: string, filenameBase: string, date: Date): Promise<string> {
    // Documents/Audinote/ ディレクトリを確実に作成
    try {
      await Filesystem.mkdir({
        path: OUTPUT_DIR,
        directory: Directory.Documents,
        recursive: true,
      })
    } catch {
      // 既に存在する場合は無視
    }

    const datePrefix = date.toISOString().slice(0, 10).replace(/-/g, '')
    const sanitized = sanitizeFilename(filenameBase)
    const filename = await resolveUniqueFilename(`${datePrefix}_${sanitized}`)

    await Filesystem.writeFile({
      path: `${OUTPUT_DIR}/${filename}`,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      data: content,
    })

    return filename
  },

  /** 保存済みファイルの URI を取得（Share Sheet に渡す用） */
  async getUri(filename: string): Promise<string> {
    const result = await Filesystem.getUri({
      path: `${OUTPUT_DIR}/${filename}`,
      directory: Directory.Documents,
    })
    return result.uri
  },
}

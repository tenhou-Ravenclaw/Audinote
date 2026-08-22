// ファイル名に使えない文字を除去する（electron/services/MarkdownWriter.ts と同じ規則）
function sanitizeFilename(name: string, maxLength = 50): string {
  return (
    name
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[_-]{2,}/g, '_')
      .trim()
      .slice(0, maxLength) || 'untitled_summary'
  )
}

export const MarkdownWriter = {
  buildFilename(filenameBase: string, date: Date): string {
    const datePrefix = date.toISOString().slice(0, 10).replace(/-/g, '')
    return `${datePrefix}_${sanitizeFilename(filenameBase)}.md`
  },

  // ブラウザには保存先ファイルシステムへのアクセス権がないため、重複ファイル名の解決は
  // ブラウザのダウンロード機構（自動的に "(1)" 等を付与する）に委ねる
  download(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

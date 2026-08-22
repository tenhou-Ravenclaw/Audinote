import { useState, useEffect, useCallback } from 'react'
import { Share } from '@capacitor/share'
import type { LogEntry } from '../types'
import { ProcessingLogger } from '../services/logger'
import { MarkdownWriter } from '../services/markdownWriter'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  summary_success: { label: 'Success', color: 'text-green-400 bg-green-900/40' },
  failure:         { label: 'Failed',  color: 'text-red-400 bg-red-900/40' },
}

export default function History() {
  const [logs, setLogs] = useState<LogEntry[]>([])

  const refresh = useCallback(() => {
    ProcessingLogger.getAll().then(setLogs)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleShare = async (log: LogEntry) => {
    if (!log.outputFilename) return
    try {
      const uri = await MarkdownWriter.getUri(log.outputFilename)
      await Share.share({
        title: log.outputFilename,
        url: uri,
        dialogTitle: '保存先を選択',
      })
    } catch {
      // ユーザーがキャンセルした場合は無視
    }
  }

  return (
    <div className="flex flex-col gap-4 p-5 pt-safe">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">History</h2>
        <button
          onClick={refresh}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          更新
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 text-sm">処理済みのファイルはありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map(log => (
            <LogItem key={log.id} log={log} onShare={handleShare} />
          ))}
        </div>
      )}
    </div>
  )
}

function LogItem({ log, onShare }: { log: LogEntry; onShare: (log: LogEntry) => void }) {
  const status = STATUS_MAP[log.status] ?? { label: log.status, color: 'text-gray-400 bg-gray-800' }
  const isSuccess = log.status === 'summary_success'

  return (
    <div className="bg-gray-900 rounded-xl px-4 py-4 border border-gray-800 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-300 truncate flex-1">{log.sourceAudio}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${status.color}`}>
          {status.label}
        </span>
      </div>

      {log.outputFilename && (
        <span className="text-xs text-gray-500 truncate">→ {log.outputFilename}</span>
      )}
      {log.errorMessage && (
        <span className="text-xs text-red-500 leading-relaxed">{log.errorMessage}</span>
      )}

      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-600">
          {new Date(log.processedAt).toLocaleString('ja-JP')}
        </span>
        {isSuccess && log.outputFilename && (
          <button
            onClick={() => onShare(log)}
            className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-3 py-1 rounded-lg transition-colors"
          >
            共有・書き出し
          </button>
        )}
      </div>
    </div>
  )
}

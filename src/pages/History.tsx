import { useState, useEffect } from 'react'
import type { LogEntry } from '../../electron/types'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  summary_success:    { label: 'Success', color: 'text-green-400 bg-green-900/40' },
  transcribe_failure: { label: 'Failed',  color: 'text-red-400 bg-red-900/40' },
  summary_failure:    { label: 'Failed',  color: 'text-red-400 bg-red-900/40' },
  failure:            { label: 'Failed',  color: 'text-red-400 bg-red-900/40' },
}

export default function History() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [retrying, setRetrying] = useState<string | null>(null)

  useEffect(() => {
    window.audinote.getHistory().then(setLogs)

    // 処理完了時に履歴を更新
    window.audinote.onProcessingProgress(p => {
      if (p.status === 'done' || p.status === 'error') {
        window.audinote.getHistory().then(setLogs)
      }
    })

    return () => { window.audinote.offProcessingProgress() }
  }, [])

  const handleOpen = (outputMarkdown: string) => {
    window.audinote.openFile(outputMarkdown)
  }

  const handleRetry = async (log: LogEntry) => {
    setRetrying(log.id)
    await window.audinote.retryFile(log.sourceAudio)
    setRetrying(null)
    window.audinote.getHistory().then(setLogs)
  }

  return (
    <div className="p-8">
      <h2 className="text-lg font-semibold mb-6">History</h2>

      {logs.length === 0 ? (
        <p className="text-gray-500 text-sm">処理済みのファイルはありません</p>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map(log => (
            <LogItem
              key={log.id}
              log={log}
              isRetrying={retrying === log.id}
              onOpen={handleOpen}
              onRetry={handleRetry}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LogItem({ log, isRetrying, onOpen, onRetry }: {
  log: LogEntry
  isRetrying: boolean
  onOpen: (path: string) => void
  onRetry: (log: LogEntry) => void
}) {
  const status = STATUS_MAP[log.status] ?? { label: log.status, color: 'text-gray-400 bg-gray-800' }
  const isSuccess = log.status === 'summary_success'

  return (
    <div className="bg-gray-900 rounded-lg px-4 py-4 border border-gray-800 flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm text-gray-300 truncate">{log.sourceAudio}</span>
        {log.outputMarkdown && (
          <span className="text-xs text-gray-500 truncate">→ {log.outputMarkdown}</span>
        )}
        {log.errorMessage && (
          <span className="text-xs text-red-500 truncate">{log.errorMessage}</span>
        )}
        <span className="text-xs text-gray-600">
          {new Date(log.processedAt).toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
          {status.label}
        </span>

        {isSuccess && log.outputMarkdown && (
          <button
            onClick={() => onOpen(log.outputMarkdown!)}
            className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-3 py-1 rounded-md transition-colors"
          >
            Open
          </button>
        )}

        {!isSuccess && (
          <button
            onClick={() => onRetry(log)}
            disabled={isRetrying}
            className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-900 hover:border-yellow-700 px-3 py-1 rounded-md transition-colors disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  )
}

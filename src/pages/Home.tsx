import { useState, useEffect } from 'react'
import type { ProcessingProgress, LogEntry } from '../../electron/types'

type ProcessingStep = ProcessingProgress['status']

const STEPS: { key: ProcessingStep; label: string }[] = [
  { key: 'importing', label: 'Importing' },
  { key: 'transcribing', label: 'Transcribing' },
  { key: 'summarizing', label: 'Summarizing' },
  { key: 'saving', label: 'Saving' },
]

export default function Home() {
  const [usbConnected, setUsbConnected] = useState(false)
  const [progress, setProgress] = useState<ProcessingProgress>({ status: 'idle' })
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    // 直近の履歴を取得
    window.audinote.getHistory().then(logs => setRecentLogs(logs.slice(0, 5)))

    // マウント時に現在の USB 状態を取得（イベントを取りこぼさないよう pull する）
    window.audinote.getUsbStatus().then(({ connected }) => setUsbConnected(connected))

    // USB 接続状態の変化を購読
    window.audinote.onUsbStatus(({ connected }) => setUsbConnected(connected))

    // 処理進捗の変化を購読
    window.audinote.onProcessingProgress(p => {
      setProgress(p)
      // 完了・エラー時は履歴を再取得
      if (p.status === 'done' || p.status === 'error') {
        window.audinote.getHistory().then(logs => setRecentLogs(logs.slice(0, 5)))
      }
    })

    return () => {
      window.audinote.offUsbStatus()
      window.audinote.offProcessingProgress()
    }
  }, [])

  const handleRetry = (fileName: string) => {
    window.audinote.retryFile(fileName)
  }

  return (
    <div className="p-8 flex flex-col gap-8">
      <UsbStatusCard usbConnected={usbConnected} progress={progress} />
      <RecentActivity logs={recentLogs} onRetry={handleRetry} />
    </div>
  )
}

// USB 接続状態と処理進捗を表示するカード
function UsbStatusCard({ usbConnected, progress }: { usbConnected: boolean; progress: ProcessingProgress }) {
  const isProcessing = !['idle', 'done', 'error'].includes(progress.status)
  const activeStepIndex = STEPS.findIndex(s => s.key === progress.status)

  return (
    <div className="bg-gray-900 rounded-xl p-8 flex flex-col items-center justify-center gap-3 min-h-48 border border-gray-800">
      {progress.status === 'error' ? (
        <>
          <p className="text-red-400 font-medium">Processing Failed</p>
          <p className="text-gray-500 text-xs">{progress.error}</p>
        </>
      ) : progress.status === 'done' ? (
        <>
          <p className="text-green-400 font-semibold">Done!</p>
          <p className="text-gray-500 text-sm">{progress.fileName}</p>
        </>
      ) : usbConnected ? (
        <>
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
          <p className="text-green-400 font-medium">Device Connected</p>
          {!isProcessing && <p className="text-gray-500 text-sm">Waiting for files...</p>}
        </>
      ) : (
        <>
          <UsbIcon />
          <p className="text-blue-400 font-semibold text-lg">Waiting for device...</p>
          <p className="text-gray-500 text-sm">Connect a USB Recorder</p>
        </>
      )}

      {isProcessing && (
        <div className="flex flex-col items-center gap-3 mt-2">
          {progress.fileName && (
            <p className="text-gray-400 text-xs">{progress.fileName}</p>
          )}
          <div className="flex items-center gap-2">
            {STEPS.map((step, i) => {
              const isActive = i === activeStepIndex
              const isDone = i < activeStepIndex
              return (
                <div key={step.key} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isDone    ? 'bg-green-900 text-green-400' :
                    isActive  ? 'bg-blue-900 text-blue-400 animate-pulse' :
                                'bg-gray-800 text-gray-500'
                  }`}>
                    {isDone && <span>✓</span>}
                    {step.label}
                  </div>
                  {i < STEPS.length - 1 && <span className="text-gray-700">→</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// 直近の処理履歴リスト
function RecentActivity({ logs, onRetry }: { logs: LogEntry[]; onRetry: (fileName: string) => void }) {
  if (logs.length === 0) return null

  return (
    <div>
      <h2 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wider">Recent Activity</h2>
      <div className="flex flex-col gap-2">
        {logs.map(log => (
          <div key={log.id} className="bg-gray-900 rounded-lg px-4 py-3 flex items-center justify-between border border-gray-800">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                log.status === 'summary_success' ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="text-sm text-gray-300 truncate">{log.sourceAudio}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {log.status === 'summary_success' && log.outputMarkdown && (
                <button
                  onClick={() => window.audinote.openFile(log.outputMarkdown!)}
                  className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-3 py-1 rounded-md transition-colors"
                >
                  Open markdown
                </button>
              )}
              {log.status !== 'summary_success' && (
                <button
                  onClick={() => onRetry(log.sourceAudio)}
                  className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-900 hover:border-yellow-700 px-3 py-1 rounded-md transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsbIcon() {
  return (
    <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  )
}

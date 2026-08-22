import { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import SettingsModal from './components/SettingsModal'
import ProcessingTimeline from './components/ProcessingTimeline'
import UploadRecordPanel from './components/UploadRecordPanel'
import { SettingsStore } from './services/settingsStore'
import { ProcessingLogger } from './services/logger'
import { AudioProcessor } from './services/processor'
import { MarkdownWriter } from './services/markdownWriter'
import { DEFAULT_SETTINGS } from './types'
import type { WebSettings, LogEntry, ProcessingProgress, ProcessingResult } from './types'

const AUTOSAVE_DELAY_MS = 800

export default function App() {
  const [settings, setSettings] = useState<WebSettings>(DEFAULT_SETTINGS)
  const [history, setHistory] = useState<LogEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [progress, setProgress] = useState<ProcessingProgress>({ status: 'idle' })
  const [lastResult, setLastResult] = useState<ProcessingResult | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstLoad = useRef(true)

  useEffect(() => {
    setSettings(SettingsStore.get())
    setHistory(ProcessingLogger.getAll())
    isFirstLoad.current = false
  }, [])

  // 設定が変わるたびにデバウンスして自動保存
  useEffect(() => {
    if (isFirstLoad.current) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      SettingsStore.save(settings)
    }, AUTOSAVE_DELAY_MS)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [settings])

  const updateSettings = (patch: Partial<WebSettings>) => setSettings(s => ({ ...s, ...patch }))

  const isProcessing = !['idle', 'done', 'error'].includes(progress.status)

  const handleNew = () => {
    setSelectedId(null)
    setProgress({ status: 'idle' })
    setLastResult(null)
  }

  const handleFileReady = async (blob: Blob, filename: string) => {
    setSelectedId(null)
    setLastResult(null)
    const result = await AudioProcessor.process(blob, filename, settings, setProgress)
    setHistory(ProcessingLogger.getAll())
    if (result) setLastResult(result)
  }

  const selectedEntry = history.find(h => h.id === selectedId) ?? null

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar
        history={history}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNew={handleNew}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6">
          {selectedEntry ? (
            <HistoryDetail entry={selectedEntry} />
          ) : (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-1">新規処理</h2>
                <p className="text-sm text-gray-500">音声ファイルをアップロードするか、その場で録音してください。</p>
              </div>
              <UploadRecordPanel disabled={isProcessing} onFileReady={handleFileReady} />
              <ProcessingTimeline progress={progress} fileName={progress.fileName} />
              {progress.status === 'done' && lastResult && <ResultCard result={lastResult} />}
            </>
          )}
        </div>
      </main>
      {settingsOpen && <SettingsModal settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

function ResultCard({ result }: { result: ProcessingResult }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-300">{result.outputFilename}</p>
        <button
          onClick={() => MarkdownWriter.download(result.summary, result.outputFilename)}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          再ダウンロード
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-xs text-gray-400 max-h-64 overflow-y-auto">{result.summary}</pre>
    </div>
  )
}

function HistoryDetail({ entry }: { entry: LogEntry }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">{entry.outputFilename ?? entry.sourceAudio}</h2>
        <p className="text-xs text-gray-500">{new Date(entry.processedAt).toLocaleString('ja-JP')}</p>
      </div>
      {entry.status === 'summary_success' ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">元の音声: {entry.sourceAudio}</p>
            {entry.summaryContent && entry.outputFilename && (
              <button
                onClick={() => MarkdownWriter.download(entry.summaryContent!, entry.outputFilename!)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                再ダウンロード
              </button>
            )}
          </div>
          {entry.summaryContent && (
            <pre className="whitespace-pre-wrap text-xs text-gray-400 max-h-96 overflow-y-auto">{entry.summaryContent}</pre>
          )}
        </div>
      ) : (
        <div className="bg-red-950/30 border border-red-900 rounded-2xl p-5">
          <p className="text-sm text-red-400">処理に失敗しました</p>
          <p className="text-xs text-gray-500 mt-1">{entry.errorMessage}</p>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import { Share } from '@capacitor/share'
import type { ProcessingProgress } from '../types'
import { AudioProcessor } from '../services/processor'
import { SettingsStore } from '../services/settings'
import { MarkdownWriter } from '../services/markdownWriter'
import { ProcessingLogger } from '../services/logger'

type ProcessingStep = ProcessingProgress['status']

const STEPS: { key: ProcessingStep; label: string }[] = [
  { key: 'transcribing', label: 'Transcribing' },
  { key: 'summarizing', label: 'Summarizing' },
  { key: 'saving', label: 'Saving' },
]

export default function Home() {
  const [progress, setProgress] = useState<ProcessingProgress>({ status: 'idle' })
  const [lastOutputFilename, setLastOutputFilename] = useState<string | null>(null)

  const handleImport = async () => {
    try {
      const result = await FilePicker.pickFiles({
        types: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-caf', 'audio/aac', 'public.audio'],
        limit: 1,
        readData: true,
      })

      const file = result.files[0]
      if (!file?.data) return

      const settings = await SettingsStore.get()
      if (!settings.apiKey) {
        setProgress({ status: 'error', error: 'API キーが設定されていません。設定画面で入力してください。' })
        return
      }

      setLastOutputFilename(null)
      await AudioProcessor.process(
        file.data,
        file.name,
        settings,
        (p) => {
          setProgress(p)
          if (p.status === 'done') {
            // ログから最新のファイル名を取得するため少し待つ
            // processor が done を返す時点ではまだ保存直後なので、
            // done イベントのタイミングで直接 lastOutputFilename を更新する
          }
        }
      )

      // done 後にログから最新エントリのファイル名を拾う
      const logs = await ProcessingLogger.getAll()
      const latest = logs.find(l => l.sourceAudio === file.name && l.status === 'summary_success')
      if (latest?.outputFilename) {
        setLastOutputFilename(latest.outputFilename)
      }
    } catch (err) {
      // ユーザーがキャンセルした場合は何もしない
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('cancelled')) {
        setProgress({ status: 'error', error: msg })
      }
    }
  }

  const handleShare = async () => {
    if (!lastOutputFilename) return
    try {
      const uri = await MarkdownWriter.getUri(lastOutputFilename)
      await Share.share({
        title: lastOutputFilename,
        url: uri,
        dialogTitle: '保存先を選択',
      })
    } catch {
      // ユーザーがキャンセルした場合は無視
    }
  }

  const handleReset = () => {
    setProgress({ status: 'idle' })
    setLastOutputFilename(null)
  }

  const isProcessing = !['idle', 'done', 'error'].includes(progress.status)
  const activeStepIndex = STEPS.findIndex(s => s.key === progress.status)

  return (
    <div className="flex flex-col gap-6 p-5 pt-safe">
      {/* メインカード */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 flex flex-col items-center gap-4 min-h-52 justify-center">
        {progress.status === 'error' ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-900/40 flex items-center justify-center">
              <span className="text-red-400 text-2xl">✕</span>
            </div>
            <p className="text-red-400 font-medium text-center">処理に失敗しました</p>
            {progress.error && (
              <p className="text-gray-500 text-xs text-center leading-relaxed px-2">{progress.error}</p>
            )}
            <button onClick={handleReset} className="btn-secondary mt-1">
              やり直す
            </button>
          </>
        ) : progress.status === 'done' ? (
          <>
            <div className="w-12 h-12 rounded-full bg-green-900/40 flex items-center justify-center">
              <span className="text-green-400 text-2xl">✓</span>
            </div>
            <p className="text-green-400 font-semibold">完了！</p>
            {progress.fileName && (
              <p className="text-gray-500 text-sm text-center">{progress.fileName}</p>
            )}
            <div className="flex gap-3 mt-1">
              {lastOutputFilename && (
                <button onClick={handleShare} className="btn-primary">
                  保存先を選択
                </button>
              )}
              <button onClick={handleReset} className="btn-secondary">
                別のファイルを処理
              </button>
            </div>
          </>
        ) : isProcessing ? (
          <>
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            {progress.fileName && (
              <p className="text-gray-400 text-sm text-center truncate max-w-xs">{progress.fileName}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {STEPS.map((step, i) => {
                const isActive = i === activeStepIndex
                const isDone = i < activeStepIndex
                return (
                  <div key={step.key} className="flex items-center gap-1.5">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      isDone    ? 'bg-green-900/60 text-green-400' :
                      isActive  ? 'bg-blue-900/60 text-blue-400 animate-pulse' :
                                  'bg-gray-800 text-gray-600'
                    }`}>
                      {isDone && '✓ '}{step.label}
                    </span>
                    {i < STEPS.length - 1 && <span className="text-gray-700 text-xs">→</span>}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <MicrophoneIcon />
            <p className="text-gray-300 font-medium">音声ファイルを処理する</p>
            <p className="text-gray-500 text-sm text-center leading-relaxed">
              Voice Memos・Files・その他のアプリから<br />音声ファイルを選択してください
            </p>
            <button
              onClick={handleImport}
              className="btn-primary mt-2"
            >
              ファイルを選択
            </button>
          </>
        )}
      </div>

      {/* 使い方 */}
      {progress.status === 'idle' && (
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50">
          <p className="text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">使い方</p>
          <ol className="flex flex-col gap-2">
            {[
              'Voice Memosや他のアプリで音声を録音',
              '「ファイルを選択」をタップして音声を選択',
              'Geminiが文字起こし・要約を自動生成',
              '「保存先を選択」でiCloud Drive・Google Drive等に書き出し',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-blue-500 text-xs font-bold mt-0.5 shrink-0">{i + 1}</span>
                <span className="text-gray-400 text-sm">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Voice Memos からの共有ヒント */}
      {progress.status === 'idle' && (
        <div className="bg-blue-950/30 rounded-xl p-4 border border-blue-900/30">
          <p className="text-blue-400 text-xs font-medium mb-1">ヒント: Share Extension</p>
          <p className="text-gray-500 text-xs leading-relaxed">
            Voice Memosで録音を長押し → 「共有」→「Audinote」を選ぶと、
            このアプリに直接ファイルを送れます（要 Xcode設定）。
          </p>
        </div>
      )}
    </div>
  )
}

function MicrophoneIcon() {
  return (
    <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  )
}

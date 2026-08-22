import { useState } from 'react'
import type { WebSettings } from '../types'
import { WhisperClient } from '../services/whisperClient'
import { OllamaClient } from '../services/ollamaClient'

type Tab = 'connections' | 'prompts' | 'advanced'
type TestResult = { ok: boolean; message: string }

interface Props {
  settings: WebSettings
  onChange: (patch: Partial<WebSettings>) => void
  onClose: () => void
}

export default function SettingsModal({ settings, onChange, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('connections')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-40 bg-gray-950/50 border-r border-gray-800 p-3 flex flex-col gap-1 shrink-0">
          <TabButton label="Connections" active={tab === 'connections'} onClick={() => setTab('connections')} />
          <TabButton label="Prompts" active={tab === 'prompts'} onClick={() => setTab('prompts')} />
          <TabButton label="Advanced" active={tab === 'advanced'} onClick={() => setTab('advanced')} />
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">設定</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-sm">
              閉じる
            </button>
          </div>
          {tab === 'connections' && <ConnectionsTab settings={settings} onChange={onChange} />}
          {tab === 'prompts' && <PromptsTab settings={settings} onChange={onChange} />}
          {tab === 'advanced' && <AdvancedTab settings={settings} onChange={onChange} />}
        </div>
      </div>
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
        active ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <label className="text-sm text-gray-300 font-medium">{label}</label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {children}
    </div>
  )
}

function ConnectionsTab({ settings, onChange }: { settings: WebSettings; onChange: (patch: Partial<WebSettings>) => void }) {
  const [whisperResult, setWhisperResult] = useState<TestResult | null>(null)
  const [ollamaResult, setOllamaResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState<'whisper' | 'ollama' | null>(null)

  const testWhisper = async () => {
    setTesting('whisper')
    setWhisperResult(await WhisperClient.testConnection(settings))
    setTesting(null)
  }
  const testOllama = async () => {
    setTesting('ollama')
    setOllamaResult(await OllamaClient.testConnection(settings))
    setTesting(null)
  }

  return (
    <div>
      <Field label="Whisper Endpoint URL" description="文字起こし用のOpenAI互換サーバー (/v1/audio/transcriptions)">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={settings.whisperEndpoint}
            onChange={e => onChange({ whisperEndpoint: e.target.value })}
          />
          <button onClick={testWhisper} disabled={testing === 'whisper'} className="btn-secondary whitespace-nowrap text-xs px-3 py-1.5">
            {testing === 'whisper' ? '確認中...' : '接続テスト'}
          </button>
        </div>
        {whisperResult && (
          <p className={`text-xs mt-1 ${whisperResult.ok ? 'text-green-400' : 'text-red-400'}`}>{whisperResult.message}</p>
        )}
      </Field>

      <Field label="Ollama Endpoint URL" description="要約用のOpenAI互換チャットサーバー (/v1/chat/completions)">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={settings.ollamaEndpoint}
            onChange={e => onChange({ ollamaEndpoint: e.target.value })}
          />
          <button onClick={testOllama} disabled={testing === 'ollama'} className="btn-secondary whitespace-nowrap text-xs px-3 py-1.5">
            {testing === 'ollama' ? '確認中...' : '接続テスト'}
          </button>
        </div>
        {ollamaResult && (
          <p className={`text-xs mt-1 ${ollamaResult.ok ? 'text-green-400' : 'text-red-400'}`}>{ollamaResult.message}</p>
        )}
      </Field>

      <Field label="Model Name">
        <input className="input" value={settings.modelName} onChange={e => onChange({ modelName: e.target.value })} />
      </Field>

      <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-3 text-xs text-gray-500 leading-relaxed">
        この操作はブラウザから直接あなたのローカルサーバーへ通信します。外部サーバーは経由しません。
        接続テストが失敗する場合、CORS設定が必要な可能性があります。Ollamaは <code>OLLAMA_ORIGINS</code>{' '}
        にこのサイトのオリジン（または <code>*</code>）を設定して再起動してください。Whisper互換サーバーの場合は{' '}
        <code>Access-Control-Allow-Origin</code> ヘッダーがこのオリジンに対して返るよう設定してください。
      </div>
    </div>
  )
}

function PromptsTab({ settings, onChange }: { settings: WebSettings; onChange: (patch: Partial<WebSettings>) => void }) {
  return (
    <Field label="Summary Prompt" description="{{TRANSCRIPTION}} が文字起こし結果に置換されます">
      <textarea
        className="input resize-none"
        rows={8}
        value={settings.summaryPrompt}
        onChange={e => onChange({ summaryPrompt: e.target.value })}
      />
    </Field>
  )
}

function AdvancedTab({ settings, onChange }: { settings: WebSettings; onChange: (patch: Partial<WebSettings>) => void }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-4">通常は変更不要です。長時間音声のチャンク分割処理に関する詳細設定です。</p>
      <Field label="チャンク分割のしきい値（秒）" description="この長さを超える音声は自動的に分割されます">
        <input
          type="number"
          className="input"
          value={settings.chunkThresholdSec}
          onChange={e => onChange({ chunkThresholdSec: Number(e.target.value) })}
        />
      </Field>
      <Field label="チャンクの長さ（秒）">
        <input
          type="number"
          className="input"
          value={settings.chunkDurationSec}
          onChange={e => onChange({ chunkDurationSec: Number(e.target.value) })}
        />
      </Field>
      <Field label="オーバーラップ（秒）">
        <input
          type="number"
          className="input"
          value={settings.chunkOverlapSec}
          onChange={e => onChange({ chunkOverlapSec: Number(e.target.value) })}
        />
      </Field>
      <Field label="要約チャンクの文字数しきい値" description="文字起こしがこの文字数を超える場合、分割して要約します">
        <input
          type="number"
          className="input"
          value={settings.summaryChunkCharThreshold}
          onChange={e => onChange({ summaryChunkCharThreshold: Number(e.target.value) })}
        />
      </Field>
    </div>
  )
}

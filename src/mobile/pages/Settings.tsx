import { useState, useEffect, useRef } from 'react'
import type { MobileSettings } from '../types'
import { SettingsStore } from '../services/settings'

type SaveStatus = 'idle' | 'saving' | 'saved'
const AUTOSAVE_DELAY_MS = 800

export default function Settings() {
  const [settings, setSettings] = useState<MobileSettings>({
    apiKey: '',
    summaryPrompt: '',
  })
  const [showKey, setShowKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstLoad = useRef(true)

  useEffect(() => {
    SettingsStore.get().then(s => {
      setSettings(s)
      isFirstLoad.current = false
    })
  }, [])

  useEffect(() => {
    if (isFirstLoad.current) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      await SettingsStore.save(settings)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    }, AUTOSAVE_DELAY_MS)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [settings])

  const update = (patch: Partial<MobileSettings>) => setSettings(s => ({ ...s, ...patch }))

  return (
    <div className="flex flex-col gap-6 p-5 pt-safe">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Settings</h2>
        {saveStatus === 'saving' && <span className="text-xs text-gray-500">保存中...</span>}
        {saveStatus === 'saved'  && <span className="text-xs text-green-400">保存しました</span>}
      </div>

      {/* AI 設定 */}
      <Section title="AI Configuration">
        <Field
          label="Google API Key"
          description="Gemini APIキー。Google AI Studio で取得できます"
        >
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={e => update({ apiKey: e.target.value })}
              placeholder="AIza..."
              className="input flex-1"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <button
              onClick={() => setShowKey(v => !v)}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 rounded-xl transition-colors shrink-0"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>

        <Field
          label="Summary Prompt"
          description="{{TRANSCRIPTION}} が文字起こし結果に置換されます"
        >
          <textarea
            value={settings.summaryPrompt}
            onChange={e => update({ summaryPrompt: e.target.value })}
            rows={6}
            placeholder="以下の文字起こしを要約してください..."
            className="input resize-none text-sm"
          />
        </Field>
      </Section>

      {/* 出力先の説明 */}
      <Section title="Output">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-300">
            処理後の Markdown は <span className="text-blue-400 font-mono">ファイル</span> アプリの
            <span className="text-blue-400"> Audinote → Documents</span> フォルダに自動保存されます。
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            別の場所（iCloud Drive・Google Drive・Dropbox など）に保存したい場合は、
            処理完了後またはHistoryから「共有・書き出し」ボタンを使ってください。
          </p>
        </div>
      </Section>

      {/* Share Extension のヒント */}
      <Section title="Share Extension（上級設定）">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500 leading-relaxed">
            Voice Memos の「共有」ボタンから直接 Audinote に送れる Share Extension を
            Xcode で追加できます。設定方法は
            <span className="text-blue-400"> MOBILE_SETUP.md </span>
            を参照してください。
          </p>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      </div>
      <div className="p-4 flex flex-col gap-4">{children}</div>
    </div>
  )
}

function Field({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-gray-300 font-medium">{label}</label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {children}
    </div>
  )
}

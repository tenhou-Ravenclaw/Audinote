import { useState, useEffect, useRef } from 'react'
import type { Settings } from '../../electron/types'

type SaveStatus = 'idle' | 'saving' | 'saved'

const AUTOSAVE_DELAY_MS = 800

export default function Settings() {
  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    recorderName: '',
    audioSubDir: 'RECORD',
    outputDir: '',
    summaryPrompt: '',
  })
  const [showKey, setShowKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstLoad = useRef(true)

  useEffect(() => {
    window.audinote.getSettings().then(s => {
      setSettings(s)
      isFirstLoad.current = false
    })
  }, [])

  // 設定が変わるたびにデバウンスして自動保存
  useEffect(() => {
    if (isFirstLoad.current) return

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      await window.audinote.saveSettings(settings)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [settings])

  const update = (patch: Partial<Settings>) => setSettings(s => ({ ...s, ...patch }))

  const handleSelectFolder = async () => {
    const path = await window.audinote.selectFolder()
    if (path) update({ outputDir: path })
  }

  return (
    <div className="p-8 flex flex-col gap-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Settings</h2>
        {saveStatus === 'saving' && <span className="text-xs text-gray-500">Saving...</span>}
        {saveStatus === 'saved'  && <span className="text-xs text-green-400">Saved</span>}
      </div>

      <Section title="AI Configuration">
        <Field label="Google API Key">
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={e => update({ apiKey: e.target.value })}
              placeholder="AIza..."
              className="input flex-1"
            />
            <button
              onClick={() => setShowKey(v => !v)}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 rounded-lg transition-colors"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>
        <Field label="Summary Prompt" description="{{TRANSCRIPTION}} が文字起こし結果に置換されます">
          <textarea
            value={settings.summaryPrompt}
            onChange={e => update({ summaryPrompt: e.target.value })}
            rows={5}
            placeholder="以下の文字起こしを要約してください..."
            className="input resize-none"
          />
        </Field>
      </Section>

      <Section title="Device Settings">
        <Field label="Recorder Volume Name" description="USBデバイスのボリューム名（例: IC RECORDER）">
          <input
            type="text"
            value={settings.recorderName}
            onChange={e => update({ recorderName: e.target.value })}
            placeholder="IC RECORDER"
            className="input"
          />
        </Field>
        <Field label="Audio Subfolder" description="レコーダー内の音声フォルダ名">
          <input
            type="text"
            value={settings.audioSubDir}
            onChange={e => update({ audioSubDir: e.target.value })}
            placeholder="RECORD"
            className="input"
          />
        </Field>
      </Section>

      <Section title="Storage Settings">
        <Field label="Markdown Output Directory">
          <div className="flex gap-2">
            <input
              type="text"
              value={settings.outputDir}
              placeholder="/Users/you/Documents/Audinote"
              className="input flex-1"
              readOnly
            />
            <button
              onClick={handleSelectFolder}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 rounded-lg transition-colors whitespace-nowrap"
            >
              Browse...
            </button>
          </div>
        </Field>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      </div>
      <div className="p-5 flex flex-col gap-4">{children}</div>
    </div>
  )
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-gray-300 font-medium">{label}</label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {children}
    </div>
  )
}

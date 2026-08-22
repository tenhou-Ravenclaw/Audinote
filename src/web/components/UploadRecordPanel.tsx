import { useRef, useState } from 'react'
import { AudioRecorder } from '../services/recorder'
import type { InputMode } from '../types'

interface Props {
  disabled: boolean
  onFileReady: (blob: Blob, filename: string) => void
}

export default function UploadRecordPanel({ disabled, onFileReady }: Props) {
  const [mode, setMode] = useState<InputMode>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [recordError, setRecordError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<AudioRecorder | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFileReady(file, file.name)
  }

  const startRecording = async () => {
    setRecordError(null)
    try {
      recorderRef.current = new AudioRecorder()
      await recorderRef.current.start()
      setIsRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : String(err))
    }
  }

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setIsRecording(false)
    if (!recorderRef.current) return
    const { blob, mimeType } = await recorderRef.current.stop()
    const ext = mimeType.includes('mp4') ? 'm4a' : 'webm'
    onFileReady(blob, `recording-${Date.now()}.${ext}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setMode('upload')}
          className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
            mode === 'upload' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          アップロード
        </button>
        <button
          onClick={() => setMode('record')}
          className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
            mode === 'record' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          録音
        </button>
      </div>

      {mode === 'upload' ? (
        <div
          onDragOver={e => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setIsDragging(false)
            if (!disabled) handleFiles(e.dataTransfer.files)
          }}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-16 cursor-pointer transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-950/20' : 'border-gray-800 hover:border-gray-700'
          } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <p className="text-gray-300 text-sm font-medium">音声ファイルをドラッグ&ドロップ</p>
          <p className="text-gray-500 text-xs">またはクリックして選択（wav / mp3 / m4a / webm）</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 border border-gray-800 rounded-2xl py-16">
          {!AudioRecorder.isSupported() ? (
            <p className="text-sm text-red-400">このブラウザは録音に対応していません</p>
          ) : (
            <>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={disabled}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                  isRecording ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'
                } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <span className={`block ${isRecording ? 'w-4 h-4 rounded-sm bg-white' : 'w-5 h-5 rounded-full bg-white'}`} />
              </button>
              <p className="text-sm text-gray-400">
                {isRecording ? `録音中... ${formatElapsed(elapsed)}` : 'クリックして録音開始'}
              </p>
              {recordError && <p className="text-xs text-red-400">{recordError}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

import type { ProcessingProgress, ProcessingStatus } from '../types'

const STEP_LABELS: Record<'transcribing' | 'summarizing' | 'saving' | 'done', string> = {
  transcribing: '文字起こし中',
  summarizing: '要約中',
  saving: '保存中',
  done: '完了',
}

const STEP_ORDER: ProcessingStatus[] = ['transcribing', 'summarizing', 'saving', 'done']

export default function ProcessingTimeline({ progress, fileName }: { progress: ProcessingProgress; fileName?: string }) {
  if (progress.status === 'idle') return null

  const activeIndex = STEP_ORDER.indexOf(progress.status)

  return (
    <div className="flex flex-col gap-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-xs text-gray-500">● 音声を受信しました{fileName ? `: ${fileName}` : ''}</p>

      {progress.status === 'error' ? (
        <p className="text-sm text-red-400">● 処理に失敗しました: {progress.error}</p>
      ) : (
        STEP_ORDER.map((step, i) => {
          const isActive = step === progress.status
          const isDone = activeIndex > i || (step === 'done' && activeIndex >= i)
          if (!isActive && !isDone) return null

          let detail = ''
          if (step === 'transcribing' && progress.chunkTotal) {
            detail = ` (チャンク ${progress.chunkIndex}/${progress.chunkTotal})`
          }
          if (step === 'summarizing' && progress.summaryChunkTotal) {
            detail = ` (要約チャンク ${progress.summaryChunkIndex}/${progress.summaryChunkTotal})`
          }

          return (
            <p key={step} className={`text-sm ${isActive && step !== 'done' ? 'text-blue-400 animate-pulse' : 'text-green-400'}`}>
              ● {STEP_LABELS[step as keyof typeof STEP_LABELS]}
              {isActive && step !== 'done' ? '...' : ''}
              {detail}
            </p>
          )
        })
      )}
    </div>
  )
}

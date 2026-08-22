import type { LogEntry } from '../types'

interface Props {
  history: LogEntry[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onOpenSettings: () => void
}

export default function Sidebar({ history, selectedId, onSelect, onNew, onOpenSettings }: Props) {
  const groups = groupByDate(history)

  return (
    <aside className="w-64 bg-gray-900 flex flex-col shrink-0 h-screen border-r border-gray-800">
      <div className="px-4 py-4 border-b border-gray-800">
        <h1 className="text-white font-semibold text-lg tracking-tight mb-3">Audinote</h1>
        <button onClick={onNew} className="btn-primary w-full text-center">
          ＋ 新規処理
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {history.length === 0 && <p className="text-xs text-gray-600 px-2 py-4 text-center">まだ履歴はありません</p>}
        {groups.map(group => (
          <div key={group.label} className="mb-4">
            <p className="text-[11px] text-gray-600 uppercase tracking-wider px-2 mb-1">{group.label}</p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm truncate transition-colors ${
                    selectedId === item.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      item.status === 'summary_success' ? 'bg-green-400' : 'bg-red-400'
                    }`}
                  />
                  <span className="truncate">{item.outputFilename ?? item.sourceAudio}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <button onClick={onOpenSettings} className="btn-secondary w-full text-center">
          ⚙ 設定
        </button>
      </div>
    </aside>
  )
}

function groupByDate(history: LogEntry[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const groups: { label: string; items: LogEntry[] }[] = [
    { label: '今日', items: [] },
    { label: '昨日', items: [] },
    { label: 'それ以前', items: [] },
  ]

  for (const entry of history) {
    const d = new Date(entry.processedAt)
    const dOnly = new Date(d)
    dOnly.setHours(0, 0, 0, 0)
    if (dOnly.getTime() === today.getTime()) groups[0].items.push(entry)
    else if (dOnly.getTime() === yesterday.getTime()) groups[1].items.push(entry)
    else groups[2].items.push(entry)
  }

  return groups.filter(g => g.items.length > 0)
}

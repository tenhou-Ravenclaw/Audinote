import { useState } from 'react'
import Home from './pages/Home'
import History from './pages/History'
import Settings from './pages/Settings'

type Tab = 'home' | 'history' | 'settings'

export default function MobileApp() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <header className="bg-gray-950 border-b border-gray-800 px-5 pt-safe-top pb-3 shrink-0">
        <h1 className="text-white font-semibold text-lg tracking-tight">Audinote</h1>
      </header>

      {/* ページコンテンツ */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'home'     && <Home />}
        {tab === 'history'  && <History />}
        {tab === 'settings' && <Settings />}
      </main>

      {/* ボトムタブ */}
      <nav className="bg-gray-900 border-t border-gray-800 flex pb-safe-bottom shrink-0">
        <TabButton tab="home"     current={tab} label="Home"     onClick={setTab}>
          <HomeIcon />
        </TabButton>
        <TabButton tab="history"  current={tab} label="History"  onClick={setTab}>
          <HistoryIcon />
        </TabButton>
        <TabButton tab="settings" current={tab} label="Settings" onClick={setTab}>
          <SettingsIcon />
        </TabButton>
      </nav>
    </div>
  )
}

function TabButton({ tab, current, label, onClick, children }: {
  tab: Tab
  current: Tab
  label: string
  onClick: (t: Tab) => void
  children: React.ReactNode
}) {
  const isActive = tab === current
  return (
    <button
      onClick={() => onClick(tab)}
      className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
        isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {children}
      <span className="text-xs">{label}</span>
    </button>
  )
}

function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

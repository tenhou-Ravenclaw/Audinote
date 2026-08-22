import React from 'react'
import ReactDOM from 'react-dom/client'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import MobileApp from './mobile/App'
import './index.css'

// Capacitor のカスタム要素を登録（ファイルピッカー等のネイティブUIに必要）
defineCustomElements(window).catch(() => {/* ブラウザ環境では無視 */})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MobileApp />
  </React.StrictMode>
)

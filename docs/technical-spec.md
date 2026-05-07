# Audinote 技術仕様書

## 概要

Audinote は、ICレコーダーなどの USB 音声録音デバイスを接続すると自動的に音声ファイルを取り込み、Google Gemini API で文字起こし・要約を行い、Markdown ファイルとして保存するデスクトップアプリケーションです。

- **対応 OS**: macOS / Windows
- **バージョン**: 0.1.0

---

## 技術スタック

| 層 | 技術 |
|---|---|
| ランタイム | Electron 33 |
| UI フレームワーク | React 18 + TypeScript |
| ビルドツール | Vite 5 + vite-plugin-electron |
| スタイリング | Tailwind CSS 3 |
| ルーティング | React Router v7 (MemoryRouter) |
| AI | Google Gemini API (`gemini-2.5-flash`) |
| 設定永続化 | electron-store 11 |
| パッケージング | electron-builder |

---

## ディレクトリ構成

```
Audinote/
├── electron/
│   ├── main/
│   │   ├── index.ts          # ウィンドウ生成・アプリ起動
│   │   └── ipc.ts            # IPC ハンドラー登録
│   ├── preload/
│   │   └── index.ts          # contextBridge で window.audinote を公開
│   ├── services/
│   │   ├── AudioProcessor.ts # メイン処理オーケストレーター
│   │   ├── GeminiClient.ts   # Gemini API クライアント
│   │   ├── MarkdownWriter.ts # Markdown ファイル書き出し
│   │   ├── ProcessingLogger.ts # JSONL 処理ログ
│   │   ├── SettingsStore.ts  # 設定の読み書き
│   │   ├── UsbWatcher.ts     # USB デバイス検出
│   │   └── pLimit.ts         # 並列数制御ユーティリティ
│   └── types/
│       └── index.ts          # 共有型定義
├── src/
│   ├── App.tsx               # サイドバーレイアウト・ルーティング
│   ├── pages/
│   │   ├── Home.tsx          # 接続状態・処理進捗・直近履歴
│   │   ├── History.tsx       # 処理履歴一覧
│   │   └── Settings.tsx      # 設定画面
│   └── types/
│       └── electron.d.ts     # window.audinote の型宣言
└── docs/
    └── technical-spec.md
```

---

## アーキテクチャ

Electron の標準的な 3 プロセス構成に従います。

```
┌─────────────────────────────────────────────┐
│  Renderer Process (React)                   │
│  Home / History / Settings                  │
│             │ window.audinote.*             │
└─────────────┼───────────────────────────────┘
              │ contextBridge (preload)
┌─────────────┼───────────────────────────────┐
│  Main Process                               │
│  ipc.ts ─── AudioProcessor                 │
│         ├── SettingsStore                   │
│         ├── ProcessingLogger                │
│         └── UsbWatcher                     │
└─────────────────────────────────────────────┘
              │ HTTPS
┌─────────────▼───────────────────────────────┐
│  Google Gemini API                          │
│  gemini-2.5-flash                           │
└─────────────────────────────────────────────┘
```

セキュリティ設定: `contextIsolation: true` / `nodeIntegration: false`

---

## 処理フロー

### 自動処理（USB 接続時）

```
[USB接続検出]
      │
      ▼
findAudioFiles(devicePath)         デバイス上の音声ファイルを再帰探索
      │
      ▼
copyFile → inbox/  (COPYFILE_EXCL) 既存ファイルはスキップ
      │
      ▼
getProcessedFileNames()            成功済みファイルをログから取得
      │
      ▼
filter(未処理のみ)
      │
      ▼
Promise.all + pLimit(3)            最大3並列で processOneFile を実行
```

### processOneFile（1ファイルの処理）

```
inFlight チェック → 処理中なら即 return（二重処理防止）
      │
      ▼
GeminiClient.transcribe()          Gemini File API でアップロード→文字起こし
      │ (RECITATION エラー時はパラフレーズで自動リトライ)
      ▼
Promise.all([
  GeminiClient.summarize()         要約
  GeminiClient.generateFilename()  ファイル名生成
])                                 ← 2つを並列実行
      │
      ▼
MarkdownWriter.save()              YYYYMMDD_タイトル.md として保存
      │
      ▼
fs.unlink(inboxPath)               inbox から削除（成功の証明）
      │
      ▼
ProcessingLogger.log()             JSONL にログ記録
```

失敗時は inbox にファイルを残し、Retry 可能な状態を維持します。

---

## ファイル管理

### inbox ディレクトリ

`{userData}/inbox/` をキューとして使用します。

| ファイルの状態 | 意味 |
|---|---|
| inbox に存在する | 未処理 または 処理失敗（Retry 待ち） |
| inbox に存在しない | 処理成功（削除済み） または 未取り込み |

デバイスの音声ファイルは **コピー**されるため、デバイス上のオリジナルは残ります。

### Markdown 出力

`{outputDir}/{YYYYMMDD}_{タイトル}.md` の形式で保存されます。
同名ファイルが存在する場合は `_1`, `_2` と連番が付与されます。

### 処理ログ

`{userData}/processing_log.jsonl` に JSONL 形式で追記されます。

```jsonl
{"id":"uuid","sourceAudio":"recording.wav","outputMarkdown":"20240406_会議メモ.md","processedAt":"2024-04-06T12:00:00.000Z","status":"summary_success"}
{"id":"uuid","sourceAudio":"recording2.wav","outputMarkdown":null,"processedAt":"2024-04-06T12:01:00.000Z","status":"failure","errorMessage":"..."}
```

---

## USB デバイス検出

10 秒間隔でポーリングし、接続状態の変化のみコールバックを発火します。

| OS | 検出方法 |
|---|---|
| macOS | `/Volumes/{recorderName}` ディレクトリの存在確認 |
| Windows | PowerShell `Get-Volume` でドライブラベルを照合 |

Windows は `-NoProfile -NonInteractive` フラグで PowerShell 起動コストを削減しています。

---

## Gemini API 連携

### クライアントキャッシュ

`apiKey` をキーとする `Map` でインスタンスをキャッシュし、毎回の生成コストを削減します。

### 各 API 呼び出し

| メソッド | 用途 | 入力 |
|---|---|---|
| `transcribe()` | 文字起こし | 音声ファイル（Gemini File API 経由） |
| `summarize()` | 要約 | 文字起こしテキスト + ユーザー定義プロンプト |
| `generateFilename()` | ファイル名生成 | 文字起こしの先頭500文字 |

### RECITATION エラーハンドリング

Gemini が著作権保護コンテンツとしてブロックした場合、「パラフレーズで記述」するよう指示を変えて自動リトライします。リトライも失敗した場合は通常のエラーとして記録されます。

アップロードしたファイルは成否に関わらず `finally` ブロックで必ず削除されます。

---

## 並列処理制御

`pLimit.ts` が実装する Promise キューで Gemini API への同時リクエスト数を最大 3 に制限します。npm パッケージ非依存の軽量実装です。

`inFlight` セット（`Set<string>`）で同一ファイルの二重処理を防ぎます。USB ウォッチャーのポーリングと Retry の競合時に有効です。

---

## IPC API（window.audinote）

| メソッド | 方向 | 説明 |
|---|---|---|
| `getSettings()` | Renderer → Main | 設定を取得 |
| `saveSettings(settings)` | Renderer → Main | 設定を保存（USB ウォッチャーを再起動） |
| `getHistory()` | Renderer → Main | 処理ログを新しい順で取得 |
| `getUsbStatus()` | Renderer → Main | 現在の USB 接続状態を pull |
| `startProcessing(path)` | Renderer → Main | 指定パスを手動処理 |
| `retryFile(fileName)` | Renderer → Main | inbox 内のファイルを再処理 |
| `selectFolder()` | Renderer → Main | フォルダ選択ダイアログを開く |
| `openFile(path)` | Renderer → Main | OS のデフォルトアプリでファイルを開く |
| `onUsbStatus(cb)` | Main → Renderer | USB 状態変化イベントを購読 |
| `onProcessingProgress(cb)` | Main → Renderer | 処理進捗イベントを購読 |
| `offUsbStatus()` | - | USB 状態イベントの購読解除 |
| `offProcessingProgress()` | - | 処理進捗イベントの購読解除 |

起動直後の状態取得は `getUsbStatus()` で pull するため、イベントの取りこぼしが発生しません。

---

## 設定項目

| キー | 型 | デフォルト | 説明 |
|---|---|---|---|
| `apiKey` | string | `""` | Google Gemini API キー |
| `recorderName` | string | `""` | USB デバイスのボリューム名 |
| `audioSubDir` | string | `"RECORD"` | レコーダー内の音声フォルダ名 |
| `outputDir` | string | `""` | Markdown 保存先ディレクトリ |
| `summaryPrompt` | string | 議事録テンプレート | Gemini に渡す要約プロンプト（`{{TRANSCRIPTION}}` を含む） |

設定は `electron-store` により `{userData}/config.json` に永続化されます。

---

## UI 構成

サイドバー固定の 2 カラムレイアウト。

```
┌──────────┬────────────────────────────┐
│ Audinote │                            │
│──────────│     メインコンテンツ        │
│ Home     │                            │
│ History  │                            │
│ Settings │                            │
└──────────┴────────────────────────────┘
```

### Home

- USB 接続状態カード（Waiting / Connected / Processing / Done / Error）
- 処理進捗ステップ表示（Transcribing → Summarizing → Saving）
- 直近 5 件の処理履歴（Open markdown / Retry ボタン付き）

### History

- 全処理履歴の一覧（新しい順）
- 成功: Open ボタン、失敗: Retry ボタン

### Settings

- Google API Key（表示/非表示トグル付き）
- Summary Prompt（カスタマイズ可能なテキストエリア）
- Recorder Volume Name
- Audio Subfolder
- Markdown Output Directory（フォルダブラウザ付き）

---

## 対応音声フォーマット

`.wav` / `.mp3` / `.m4a`

MIME タイプマッピング: `wav → audio/wav`, `mp3 → audio/mpeg`, `m4a → audio/mp4`

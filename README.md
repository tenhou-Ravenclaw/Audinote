# Audinote

USB ICレコーダーを接続するだけで、音声ファイルを自動で文字起こし・要約してMarkdownに保存するデスクトップアプリです。

## 概要

ICレコーダーをPCに接続すると、録音ファイルを自動検出してGoogle Gemini APIで処理し、Markdownファイルとして指定フォルダに保存します。

**処理フロー**

```
USB接続 → 音声ファイル検出 → 文字起こし → 要約・ファイル名生成 → Markdown保存
```

## 主な機能

- **自動検出**: USB接続を監視し、音声ファイル（WAV / MP3 / M4A）を自動インポート
- **AI処理**: Google Gemini APIで文字起こし・要約・ファイル名を自動生成
- **並列処理**: 最大3ファイルを同時処理（Geminiレート制限を考慮）
- **重複スキップ**: 成功済みファイルは再接続時に処理しない
- **リトライ**: 失敗したファイルをUIから再処理可能
- **履歴管理**: 処理結果の一覧表示と生成済みMarkdownを直接開く

## セットアップ

```sh
git clone https://github.com/tenhou-Ravenclaw/Audinote.git
cd Audinote
npm install
npm run dev
```

## ビルド

```sh
# Windows
npm run build:win

# macOS
npm run build:mac
```

ビルド成果物は `release/{version}/` に出力されます。

## 設定

アプリ内の Settings 画面で以下を設定します。

| 項目 | 説明 | 例 |
|------|------|-----|
| Google API Key | Gemini APIキー | `AIza...` |
| Summary Prompt | 要約指示（`{{TRANSCRIPTION}}`が文字起こし結果に置換） | 任意のプロンプト |
| Recorder Volume Name | USBデバイスのボリューム名 | `IC RECORDER` |
| Audio Subfolder | レコーダー内の音声フォルダ名 | `RECORD` |
| Markdown Output Directory | Markdown保存先フォルダ | 任意のフォルダ |

設定は変更後800ms後に自動保存されます。

## ディレクトリ構成

```
├── electron/
│   ├── main/          # メインプロセス（ウィンドウ・IPC）
│   ├── preload/       # プリロードスクリプト（IPC橋渡し）
│   ├── services/      # コアロジック
│   │   ├── AudioProcessor.ts   # 音声処理パイプライン
│   │   ├── GeminiClient.ts     # Gemini API呼び出し
│   │   ├── UsbWatcher.ts       # USB接続監視
│   │   ├── MarkdownWriter.ts   # Markdown出力
│   │   ├── ProcessingLogger.ts # 処理履歴の記録
│   │   └── SettingsStore.ts    # 設定の永続化
│   └── types/         # 共有型定義
│
├── src/
│   ├── pages/
│   │   ├── Home.tsx     # メイン画面（USB状態・進捗表示）
│   │   ├── History.tsx  # 処理履歴一覧
│   │   └── Settings.tsx # 設定画面
│   └── App.tsx          # ルーティング・サイドバー
│
└── release/             # ビルド成果物
```

## 技術スタック

- **Electron** — デスクトップアプリ基盤
- **React + TypeScript** — UI
- **Vite** — バンドラー
- **Tailwind CSS** — スタイリング
- **Google Gemini API** — 文字起こし・要約・ファイル名生成
- **electron-store** — 設定の永続化

## ライセンス

MIT

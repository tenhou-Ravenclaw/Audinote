# Audinote モバイル版セットアップガイド

## 必要なもの

- Apple Developer アカウント（無料でも可、ただしデバイスへのインストールは7日ごとに再署名が必要）
- Xcode 15以上
- Node.js 20以上

---

## 手順1: iOSプロジェクトを初期化

```bash
# プロジェクトルートで実行
npm run cap:sync   # build:mobile → dist-mobile → cap sync ios
```

初回は自動的に `ios/` ディレクトリが生成されます。

---

## 手順2: Xcodeで開いてデバイスにインストール

```bash
npm run cap:open   # Xcodeが開く
```

Xcodeで：
1. 左ペインの `App` → `Signing & Capabilities`
2. Team を自分のApple IDに設定
3. Bundle Identifier を `com.audinote.app`（または任意の一意な値）に変更
4. iPhone を接続して実行（▶ ボタン）

---

## 手順3: Files アプリで出力を確認

処理済みの Markdown ファイルは iPhone の以下に保存されます：

```
ファイルアプリ → このiPhone内 → Audinote → Documents
```

「共有・書き出し」ボタンを使えば iCloud Drive・Google Drive 等に書き出せます。

---

## オプション: Share Extension（Voice Memos から直接送れるようにする）

Voice Memos などから「共有」→「Audinote」でファイルを送れるようになります。

### Share Extension の追加手順

1. Xcode で `File` → `New` → `Target...`
2. `Share Extension` を選択
3. Product Name: `ShareExtension`
4. `Finish`

### ShareViewController.swift を以下に差し替える

```swift
import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        processIncomingAudio()
    }

    private func processIncomingAudio() {
        guard
            let item = extensionContext?.inputItems.first as? NSExtensionItem,
            let provider = item.attachments?.first
        else {
            done()
            return
        }

        // 対応する音声タイプを順番に試す
        let audioTypes: [UTType] = [.audio, .mpeg4Audio, .mp3, .wav,
                                     UTType("public.audio")!, UTType("com.apple.coreaudio-format")!]

        for type in audioTypes where provider.hasItemConformingToTypeIdentifier(type.identifier) {
            provider.loadFileRepresentation(forTypeIdentifier: type.identifier) { [weak self] url, error in
                if let url {
                    self?.saveToAppGroup(url: url)
                }
                DispatchQueue.main.async { self?.done() }
            }
            return
        }

        done()
    }

    private func saveToAppGroup(url: URL) {
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "group.com.audinote.shared"
        ) else { return }

        let inbox = container.appendingPathComponent("SharedInbox")
        try? FileManager.default.createDirectory(at: inbox, withIntermediateDirectories: true)

        // タイムスタンプ付きでコピー（重複を避ける）
        let timestamp = Int(Date().timeIntervalSince1970)
        let name = "\(timestamp)_\(url.lastPathComponent)"
        let dest = inbox.appendingPathComponent(name)
        try? FileManager.default.copyItem(at: url, to: dest)

        // キューに追加
        updateQueue(container: container, filename: name)
    }

    private func updateQueue(container: URL, filename: String) {
        let queueFile = container.appendingPathComponent("queue.json")
        var queue: [String] = []
        if let data = try? Data(contentsOf: queueFile),
           let existing = try? JSONDecoder().decode([String].self, from: data) {
            queue = existing
        }
        queue.append(filename)
        if let data = try? JSONEncoder().encode(queue) {
            try? data.write(to: queueFile)
        }
    }

    private func done() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
}
```

### Info.plist の NSExtensionActivationRule を設定

Share Extension ターゲットの `Info.plist` → `NSExtensionActivationRule` を以下の辞書に変更：

```xml
<key>NSExtensionActivationRule</key>
<dict>
    <key>NSExtensionActivationSupportsFileWithMaxCount</key>
    <integer>1</integer>
    <key>NSExtensionActivationSupportsMovieWithMaxCount</key>
    <integer>0</integer>
    <key>NSExtensionActivationSupportsImageWithMaxCount</key>
    <integer>0</integer>
</dict>
```

### App Group を両ターゲットに追加

1. メインアプリ (`App`) → `Signing & Capabilities` → `+` → `App Groups`
2. `group.com.audinote.shared` を追加
3. `ShareExtension` ターゲットにも同じ App Group を追加

### Capacitor ネイティブプラグインで SharedInbox を読み込む（上級）

App Group の SharedInbox を JavaScript 側から読むには、カスタム Capacitor プラグインが必要です。
以下のファイルを `ios/App/App/` に追加してください：

**SharedInboxPlugin.swift**
```swift
import Foundation
import Capacitor

@objc(SharedInboxPlugin)
public class SharedInboxPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SharedInboxPlugin"
    public let jsName = "SharedInbox"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getFiles", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "markDone", returnType: CAPPluginReturnPromise),
    ]

    private var inboxURL: URL? {
        FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "group.com.audinote.shared"
        )?.appendingPathComponent("SharedInbox")
    }

    @objc func getFiles(_ call: CAPPluginCall) {
        guard let inbox = inboxURL,
              let files = try? FileManager.default.contentsOfDirectory(atPath: inbox.path)
        else {
            call.resolve(["files": []])
            return
        }
        call.resolve(["files": files.filter { !$0.hasPrefix(".") }])
    }

    @objc func readFile(_ call: CAPPluginCall) {
        guard let name = call.getString("filename"),
              let inbox = inboxURL else {
            call.reject("Invalid arguments")
            return
        }
        let url = inbox.appendingPathComponent(name)
        guard let data = try? Data(contentsOf: url) else {
            call.reject("File not found")
            return
        }
        call.resolve(["data": data.base64EncodedString()])
    }

    @objc func markDone(_ call: CAPPluginCall) {
        guard let name = call.getString("filename"),
              let inbox = inboxURL else {
            call.reject("Invalid arguments")
            return
        }
        try? FileManager.default.removeItem(at: inbox.appendingPathComponent(name))
        call.resolve()
    }
}
```

**AppDelegate.swift に登録を追加**
```swift
// applicationDidBecomeActive の中に追加
bridge?.registerPlugin(SharedInboxPlugin.self)
```

この後、JavaScript 側から以下のように使えます：

```typescript
// src/mobile/services/sharedInbox.ts
import { registerPlugin } from '@capacitor/core'

interface SharedInboxPlugin {
  getFiles(): Promise<{ files: string[] }>
  readFile(options: { filename: string }): Promise<{ data: string }>
  markDone(options: { filename: string }): Promise<void>
}

export const SharedInbox = registerPlugin<SharedInboxPlugin>('SharedInbox')
```

---

## 変更のたびに行う作業

```bash
# コードを変更した後
npm run cap:sync  # ビルド + iOS同期
# その後 Xcode で再実行
```

ホットリロードを使う場合（Wi-Fi 同一ネットワーク必須）：

```bash
npm run dev  # Vite dev server を起動
# capacitor.config.ts に server.url を追記
```

```typescript
// capacitor.config.ts（開発中のみ）
server: {
  url: 'http://<あなたのMacのIP>:5173',
  cleartext: true,
},
```

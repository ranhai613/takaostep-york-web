# MIRA SIGNAL 開発・開催前運用

この静的Webアプリの実装、設定、素材、テストはすべてこのディレクトリ内にあります。公開入口は `index.html` です。`docs/mystery/` のPoCには依存せず、追加ランタイムライブラリはローカル同梱したLeaflet 1.9.4だけです。

## ローカル確認

Node.js 22以上とPython 3を使います。

```powershell
cd docs/mystery-develop
npm run check
python -m http.server 4173
```

ブラウザで `http://localhost:4173/` を開きます。この通常開発URLではService Workerを登録せず、Cache Storageにも素材を保存しません。以前のオフライン試験が残っている場合は、現在のアプリスコープの登録と `mira-signal-` で始まるキャッシュだけを自動整理します。PlayerStateを保存する `localStorage` と、このゲーム以外のキャッシュは変更しません。

コンテンツ、JavaScript、CSS、画像を変更した後は、`releaseId` や `cacheName` を変更せず通常の再読込を1回行います。旧Service Workerのcontrollerが残っている場合だけ、自動再読込がセッション内で最大1回行われます。整理に失敗した場合や再読込がさらに必要になった場合は、古い表示で本編を開始せず、開発者向けの再試行画面で停止します。

オフライン動作を確認するときだけ `http://localhost:4173/?sw=1` を開きます。`?sw=1` は公開環境と同じService Worker登録、版付き必須素材キャッシュ、更新・通信切断・復帰の検証経路です。`?sw`、`?sw=true`、`?sw=0`、重複した `sw` パラメーターは通常開発として扱います。公開された非ローカルURLではクエリに関係なく常に本番用オフライン動作が有効で、参加者向けの切替UIはありません。

HTTPSまたはlocalhost以外では位置情報とService Workerが利用できない場合があります。

## 開催前の公開設定

1. `data/release-config.json` の `releaseId` と `cacheName` を新しい公開版へ更新します。
2. 通常ルートは `routeMode: "primary"`、庭園閉園時の代替ルートは `routeMode: "alternate"` にします。代替最終地点は `data/route-alternate.json` で開催前に確定します。
3. `data/content.json` の4地点の座標、半径、順序、安全停止文言を現地測量済みの値へ更新します。
4. 保存状態を継続できる旧版だけを `compatibleReleaseIds` に列挙します。判断できない版は列挙しません。
5. 開発用の章・地点開始はlocalhostでのみ `initialStateProfile: "test"` とURLの `?profile=q2-arrived` を使えます。公開前に必ず `"normal"` に戻します。
6. `data/asset-manifest.json` の `releaseId` と必須素材一覧を合わせ、`npm run check` を通します。
7. 静的サイトを再デプロイし、新規アクセス、既存状態、オフライン再読込を確認します。開催中は設定を変更しません。

想定作業時間は15分以内です。参加者画面には章解放、地点スキップ、遠隔リセット、デバッグ位置変更、状態出力、分析機能を設けていません。

## 更新・ロールバック

- 新版では `releaseId` と `cacheName` を必ず更新します。Service Workerは同一オリジンの旧MIRAキャッシュだけを削除します。
- 互換版は進行状態を新版へ移行します。非互換版は旧状態を削除せず、新規開始の確認を表示します。
- 問題がある場合は以前の静的成果物を再デプロイします。以前の `releaseId` を復元し、開催中にルートだけを差し替えないでください。

## 公開前に残る必須作業

- Q1の第三者試解による解法の一意性テスト
- 4地点と代替地点の現地測量、安全確認、歩行時間確認
- ミラ音声、システム音、効果音、BGMの最終版追加と字幕照合
- 1817年の八王子隕石、高尾山、北斗七星、ケーブルカー、天文学表現の事実確認
- iOS Safari／Android Chromeの実機試験と、通常・早解き・全ヒントの実歩行試験

上記が未完了のため、現在の `contentVersion` は `1.0.0-draft` です。アプリ機能は全文字幕と常時表示の到着ボタンだけでも最後まで進行できます。

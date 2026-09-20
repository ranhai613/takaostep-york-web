# Phase 0 Research: 位置情報連動謎解きゲーム

## Decisions

### 静的モジュール構成

**Decision**: 本番は `docs/mystery-develop/` に新設し、Vanilla JavaScriptのES Modulesで画面、状態機械、サービス、データを分離する。

**Rationale**: 固定規模ではフレームワークより明示的な状態遷移を純粋関数化する方が小さく検証しやすい。PoCは地点編集・デバッグ・音声試聴が中心で、章、謎、復帰、字幕、オフライン完走の状態モデルを持たない。

**Alternatives considered**: PoCへの継ぎ足しは運営UIとプレイヤーUIが混在するため不採用。React/Vue等は追加依存とビルド工程を正当化できないため不採用。

### Leafletと地図

**Decision**: Leaflet 1.9.4とアイコンをローカル配置する。地図タイルはオンライン時の補助表示とし、方向説明、到着確認、謎進行はタイルに依存させない。

**Rationale**: PoCの地図・円形判定を活かしつつ、CDNや外部タイル障害がオフライン完走を妨げない。

**Alternatives considered**: CDN継続、地図タイル全域の事前保存は、それぞれオフライン保証、容量・利用条件の面から不採用。

**Source**: [Leaflet 1.9.4 API reference](https://leafletjs.com/reference.html)

### オフライン準備と更新

**Decision**: Service Workerで版付きアプリシェルを事前キャッシュし、開始画面で `asset-manifest.json` の必須素材をCache Storageへ保存する。必須素材が揃うまで本編開始を許可せず、任意音声・効果音の失敗は字幕で代替する。地図タイルは必須に含めない。

**Rationale**: インストール時の小さなアプリシェルと、開始時の進捗表示付きコンテンツ準備を分けることで、更新失敗の範囲を限定できる。

**Alternatives considered**: 全素材の一括インストールは任意素材1件の失敗で更新全体が失敗し得る。ネットワーク優先のみは完走要件を満たさない。

**Source**: [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [MDN: CacheStorage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage)

### ローカル開発とオフライン試験の分離

**Decision**: 実行モードを `development | offline-test | production` の3値として起動時に決定する。ホストが `localhost`、`127.0.0.1`、`[::1]` で、クエリが厳密に `sw=1` ではない場合は通常開発とする。通常開発ではService Workerを登録せず、現在のアプリスコープの既存登録を解除し、同一オリジン内の `mira-signal-` 接頭辞を持つCache Storageだけを削除する。`localStorage` は削除しない。ローカルの `?sw=1` はオフライン試験、非ローカル環境はクエリに関係なく本番とする。

**Rationale**: localhostはService Workerを利用できるため、本番キャッシュが開発変更を隠す。通常開発から永続的なオフライン制御を外せば、素材変更のたびにキャッシュ世代を更新する必要がない。一方、明示的なURLで本番相当経路を残すことで、静的構成のままオフライン検証を再現できる。`URLSearchParams`、登録解除、Cache Storage削除はいずれも対象ブラウザで広く利用できる標準APIである。

**Alternatives considered**: 毎回のキャッシュ名更新は操作漏れが起きやすいため不採用。ブラウザ全体のキャッシュ削除はPlayerState以外のデータや他サイトへ影響するため不採用。全キャッシュへ時刻クエリを付ける方式は本番の再現性とオフライン契約を崩すため不採用。開発者ツールの「キャッシュ無効化」はツールを閉じると効かず、受入手順を自動化できないため補助手段に限定する。

**Source**: [MDN: ServiceWorkerRegistration.unregister()](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/unregister), [MDN: CacheStorage.delete()](https://developer.mozilla.org/docs/Web/API/CacheStorage/delete), [MDN: URLSearchParams.has()](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/has), [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

### 進行状態と公開版

**Decision**: 小容量の `PlayerState` を `localStorage` に保存し、`schemaVersion` と `releaseId` を必須にする。既知の旧形式だけ移行し、移行不能時は旧状態を消さずに新規開始を案内する。

**Rationale**: 保存対象はID集合と現在画面だけで小さい。確定イベント時だけ保存し、座標や行動ログは含めない。

**Alternatives considered**: IndexedDBは進行状態には過剰。版不一致時の無条件消去は進行喪失につながる。

**Source**: [MDN: Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

### 位置判定

**Decision**: `watchPosition()`で画面表示中のみ位置を監視し、現在の進行対象Spotだけを判定する。GPS失敗時も到着確認ボタンを常時利用可能にし、受信座標は判定後に破棄する。

**Rationale**: HTTPSと利用許可を前提に更新・エラーを扱い、重複半径や誤差による順序飛ばしを防ぐ。

**Alternatives considered**: 全Spot同時判定とGPS単独解除は進行整合性・完走性のため不採用。

**Source**: [MDN: Geolocation.watchPosition()](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition)

### 音声キュー

**Decision**: `HTMLAudioElement`を1プレイヤーだけ保持し、`main`、`bridge`、`system`、`effect`、`bgm`を分類する。再生中は割り込まず、待機列ではbridgeをmainより先に処理する。開始操作で音声を解除し、失敗時は字幕と手動再生を提示する。

**Rationale**: 既聴、再開位置、BGMダッキングを一貫させ、ブラウザの自動再生制限に対応する。

**Alternatives considered**: 無条件自動再生と強制割込みはブラウザ差・台詞欠落のため不採用。

**Source**: [MDN: Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)

### テスト

**Decision**: 状態遷移、距離計算、回答正規化、音声優先度、状態移行、JSON契約をNode標準の `node:test` で自動化する。DOM、Service Worker、権限、振動、音声、オフラインは手動統合と実機・実歩行で検証する。

**Rationale**: 追加依存なしで進行ロジックを回帰確認でき、ブラウザ・屋外固有挙動は実環境で保証できる。

**Alternatives considered**: 初期版のPlaywright追加は見送る。すべて手動では状態組合せの回帰漏れが大きい。

**Source**: [Node.js Test Runner](https://nodejs.org/api/test.html)

## Resolution Status

技術上の未解決事項はない。Q1完成素材は統合済みで、第三者による解法一意性テストを公開前ゲートとして残す。現地座標・判定半径は実装方式を阻害しないコンテンツTODOとして、差し替え可能なJSONと仮値で扱う。

# Data Model: 位置情報連動謎解きゲーム

## Model Boundaries

公開コンテンツ、公開版設定、必須素材一覧は静的JSONとして配信する。参加者固有データは端末内の `PlayerState` だけとし、サーバー、アカウント、座標履歴、分析イベントは持たない。参照は安定した文字列IDで結ぶ。

## Entities

### ReleaseConfiguration

- `schemaVersion`: 設定形式の整数版
- `releaseId`: 再デプロイ単位の一意な公開版ID
- `contentVersion`: コンテンツ版
- `routeMode`: `primary | alternate`
- `initialStateProfile`: `normal | test`
- `contentPath`, `assetManifestPath`, `cacheName`
- `compatibleReleaseIds`: 保存状態を継続できる旧版
- `map`: 初期中心、ズーム、タイルURL、帰属表示

公開用検証では `initialStateProfile=normal` を必須とし、開催中に公開版を変更しない。

### Chapter

- `id`, `order`, `title`
- `startEventId`, `completionEventId`
- `sceneIds`: 章内の画面順

`order` は一意で昇順。開始イベント未完了の章へ遷移できない。

### Spot

- `id`, `title`, `order`
- `lat`, `lng`, `radiusM`
- `safeStopText`, `directionText`
- `arrivalEventId`, `targetPuzzleId`
- `fallbackMode`: `player-confirmation`

Spotは4件。現地測量完了まで座標、半径、安全停止文言を仮値として明示する。位置判定対象は現在Spotだけ。

### AudioClip

- `id`, `chapterId`, `kind`: `main | bridge | system | effect | bgm`
- `src`, `subtitle`, `durationSeconds`
- `triggerEventId`, `priority`
- `requiredForOffline`, `replayable`

台詞のあるクリップは字幕必須。再生中クリップは割り込まず、待機時はbridgeをmainより優先する。

### Puzzle

- `id`, `order`, `type`: `text | reorder`
- `prompt`, `image`, `altText`
- `acceptedAnswers`, `normalizationRules`
- `hints`: 順序付き3件
- `explanation`, `partId`, `completionEventId`

Q1〜Q3はtext、Q4はreorder。誤答回数は進行条件にしない。Q1は最終図版、博士の日記、3段階ヒント、解説を使用し、公開前に第三者の試解を完了する。

### Part

- `id`, `displayText`, `unlockEventId`
- `image`, `effectAudio`

4件の表示文字はR、A、M、I。重複取得を許可しない。

### AssetManifest

- `schemaVersion`, `releaseId`
- `required`: 開始前に取得必須の相対パス集合
- `optional`: 字幕等で代替できる音声・効果音等の相対パス集合

必須にはHTML、CSS、JS、ローカルLeaflet、設定、コンテンツ、字幕、問題画像、基本UIを含む。外部地図タイルは含めない。

### PlayerState

- `schemaVersion`, `releaseId`
- `currentSceneId`, `chapterId`
- `completedEventIds`, `reachedSpotIds`, `solvedPuzzleIds`
- `viewedHintIds`, `collectedPartIds`, `listenedAudioIds`
- `audioProgress`: クリップIDと再開秒数
- `q4Order`: 現在の4文字順
- `endingSeen`, `updatedAt`

集合項目は重複不可。座標、位置精度、回答入力履歴、誤答回数、分析履歴は保存しない。

### RuntimeMode（実行時のみ）

- `kind`: `development | offline-test | production`
- `isLocal`: ホストが `localhost | 127.0.0.1 | [::1]` のいずれか
- `offlineRequested`: クエリ値が厳密に `sw=1`
- `offlineEnabled`: `offline-test` または `production` の場合だけtrue
- `cleanupRequired`: `development` の場合だけtrue

RuntimeModeは起動URLから毎回導出し、JSON、PlayerState、`localStorage`には保存しない。非ローカル環境ではクエリによる無効化を許可せず常に `production` とする。

### OfflineCleanupResult（実行時のみ）

- `registrationFound`, `unregistered`
- `deletedCacheNames`: `mira-signal-` 接頭辞に一致して削除した名前
- `controllerStillActive`: 登録解除後も現在のページが旧制御下にあるか
- `reloadRequired`: 制御解除を次の読込へ反映するための自動再読込が必要か
- `errors`: 登録解除またはキャッシュ整理に失敗した項目

整理対象は現在のアプリスコープのService Worker登録と同一オリジン内の専用接頭辞キャッシュだけとする。PlayerStateの保存キーと他のキャッシュは参照・変更しない。自動再読込はセッション内で1回に制限し、失敗または再読込ループを検出した場合は開発者向けエラーを提示する。

### AudioQueue（実行時のみ）

- `activeClipId`, `activePositionSeconds`
- `pendingClipIds`
- `status`: `idle | playing | paused | failed`

永続化するのは再開に必要なactive clipと位置だけ。待機列は進行状態とトリガーから再構築する。

## Relationships and Invariants

- ReleaseConfiguration 1 → 1 Content、1 → 1 AssetManifest
- Chapter 1 → 多 AudioClip、0または1 Spot、0または1 Puzzle
- Spot 0または1 → 1 Puzzle、Puzzle 1 → 1 Part
- PlayerState → ReleaseConfiguration.releaseIdおよび各Content ID
- RuntimeModeはPlayerStateと独立し、モード切替で進行状態を変更しない
- `releaseId` は設定、コンテンツ、素材一覧で一致する
- 参照先のないID、重複ID、循環する章順、Partの重複付与は契約違反
- 後続イベントは必要な章、地点、謎、パーツが完了済みの場合だけ発火する

## State Transitions

```text
not-started → preparing-assets → introduction → moving → arrived
→ puzzle → part-acquired → moving（次区間）
→ final-authentication → ending → completed
```

- `preparing-assets → introduction`: required assetsがすべて利用可能
- `moving → arrived`: GPS判定または現在Spotの到着確認ボタン
- `arrived → puzzle`: 章と前イベントの完了条件を満たす
- `puzzle → part-acquired`: 正規化後の正答。誤答はpuzzle内に留まる
- `part-acquired → moving`: 次章開始イベントを保存
- `part-acquired → final-authentication`: 4パーツ取得済み
- `final-authentication → ending`: q4OrderがMIRA
- `ending → completed`: 再生完了。再視聴では状態を巻き戻さない

各遷移は「新状態生成 → 契約検証 → `localStorage` 保存 → 画面反映」の順で確定する。保存に失敗した場合は通知し、破損状態へ遷移しない。

## Startup Mode Transitions

```text
起動URL判定
├─ development → アプリ限定登録・キャッシュ整理
│  ├─ 旧controllerあり → セッション内1回だけ自動再読込 → ネットワーク素材確認 → 起動
│  ├─ 旧controllerなし → ネットワーク素材確認 → 起動
│  └─ 整理失敗 → エラー表示・再試行
├─ offline-test → 公開相当の登録・必須素材キャッシュ → 起動
└─ production → 公開相当の登録・必須素材キャッシュ → 起動
```

通常開発の素材確認は必須パスの取得可否を検証するがCache Storageへ永続化しない。オフライン試験と本番は既存の必須／任意素材契約を使用する。

## Release Compatibility

1. `schemaVersion` と `releaseId` が一致すれば復帰する。
2. 既知の旧schemaVersionは純粋な移行関数で変換し、変換後に再検証する。
3. releaseId不一致でも `compatibleReleaseIds` に含まれる版だけ継続する。
4. 移行不能時は旧状態を即時削除せず、新規開始の確認を表示する。
5. 新規開始の確定後にPlayerStateだけを削除し、必須素材キャッシュは保持できる。

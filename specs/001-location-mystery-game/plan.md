# Implementation Plan: 位置情報連動謎解きゲーム

**Branch**: `001-location-mystery-game` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-location-mystery-game/spec.md`

## Summary

八王子・高尾を舞台に、位置到達、音声通信、4問の謎、パーツ回収、最終認証を一続きで体験できるスマートフォン向け静的Webアプリを新設する。実装は `docs/mystery-develop/` 内に限定し、Vanilla JavaScriptのES Modules、Leaflet 1.9.4、ブラウザ標準APIだけを使用する。

既存の `docs/mystery/` は位置・音声のPoCとして参照するが、本番では地点編集UIを持ち込まず、進行状態機械、版管理されたJSONコンテンツ、端末内セーブ、優先度付き音声キュー、Service Workerによる必須素材の事前準備を分離して実装する。地図表示は補助機能とし、タイル取得不能でも地点案内、「この地点に到着した」ボタン、謎解き、エンディングを止めない。

開発時は実行環境を通常開発、オフライン試験、本番の3モードに分ける。`localhost`、`127.0.0.1`、`[::1]` の通常アクセスではService WorkerとCache Storageによる公開用制御を無効化し、現在のアプリスコープの登録と `mira-signal-` 接頭辞のキャッシュだけを自動整理する。ローカルで `?sw=1` を明示した場合のみ本番相当のオフライン制御を有効化し、非ローカル環境ではクエリ指定に関係なく常に本番モードとする。PlayerStateの `localStorage` はモード切替で変更しない。

## Technical Context

**Language/Version**: HTML5、CSS3、JavaScript ES2020 ES Modules。Node.js 22以上はテスト実行時のみ使用

**Primary Dependencies**: Leaflet 1.9.4を `vendor/` にローカル配置。実行時の追加ライブラリ、フレームワーク、バックエンドなし

**Storage**: コンテンツと公開設定は静的JSON、進行状態は `localStorage`。本番と明示的なオフライン試験ではアプリ本体と必須素材をService WorkerのCache Storageへ保存し、通常のローカル開発ではCache Storageへ保存しない。正確な位置履歴は保存しない

**Testing**: Node標準の `node:test` による純粋ロジック・JSON契約・実行モード判定・アプリ限定キャッシュ整理テスト、通常ローカル／`?sw=1`のブラウザ統合テスト、iOS Safari／Android Chrome実機テスト、現地歩行テスト

**Target Platform**: GitHub Pages等のHTTPS静的ホスティング。動作保証対象は検証時点のiOS SafariおよびAndroid Chrome。ローカル開発は `localhost`、`127.0.0.1`、`[::1]` を対象とする

**Project Type**: オフライン対応の静的モバイルWebアプリ

**Performance Goals**: メディアを除くアプリシェルを代表的な4G環境で3秒以内に操作可能にする。回答・画面遷移、端末内保存、位置イベント処理は各100ms以内を目標とする

**Constraints**: `docs/mystery-develop/` 外へ実装しない。`index.html` は同ディレクトリ直下。開始前に必須素材を準備できた後は通信切断中も完走可能。通常ローカル開発は手動キャッシュ世代変更なしで1回の通常再読込により更新を反映する。開発モード整理は現在のアプリ登録と `mira-signal-` キャッシュだけを対象とし、PlayerStateや他サイトのデータを削除しない。非ローカル環境でオフライン制御を無効化できない。画面を閉じた状態の地点検出は保証しない。外部分析送信なし。振動は必須情報経路にしない

**Scale/Scope**: 1端末につき1進行状態、1〜少人数で共有。4地点、4問、4パーツ、11主要画面、30〜40分。運営者による遠隔状態管理なし

## Constitution Check

*GATE: Phase 0開始前およびPhase 1完了後に確認。*

| Gate | 判定 | 設計上の対応 |
|---|---|---|
| 体験中心の端末設計 | PASS | 歩行中は短い音声と最小表示、謎と入力は停止案内後に提示する |
| 明示的な状態・データ管理 | PASS | 状態機械と版管理JSONを分離し、後続イベントの前提条件を検証する |
| 位置情報失敗時の完走 | PASS | GPSに加え、現在地点だけを解放する到着確認ボタンを常時提供する |
| 音声・字幕・保存の同等性 | PASS | 全台詞の字幕、音声失敗時の継続、端末内セーブ・復帰を実装する |
| 静的・単純・検証可能 | PASS | Vanilla JS、Leaflet、標準APIのみ。通常ローカルでは公開用キャッシュを外し、明示的な試験時と本番だけオフライン制御を有効化する |
| 実装ルート制約 | PASS | 全実装、アセット、テストを `docs/mystery-develop/` 内に置く |
| 安全・アクセシビリティ・プライバシー | PASS | 高コントラスト、拡大・代替テキスト、停止案内、座標非保存、演出代替を含む |

### Post-design Re-check

Phase 1のデータモデル、JSON契約、開発モード契約、検証手順はいずれも上記ゲートに適合する。実行モードはPlayerStateや公開コンテンツへ保存せず、起動URLとホストから都度決定する。通常開発の整理対象を現在アプリの登録と専用接頭辞のキャッシュに限定するため、進行状態・他サイトへの影響はない。地図タイルは必須素材に含めず、Leaflet本体とマーカー画像はローカル配信するため、外部サービス障害は完走経路を遮断しない。例外承認が必要な違反はない。

## Requirement Traceability

| Requirement | Design decision | Validation artifact |
|---|---|---|
| FR-047 / SC-013 | 通常ローカルを `development` と判定し、永続キャッシュを使わない | `runtime-mode`単体テスト、`quickstart.md`の通常再読込シナリオ |
| FR-048 / SC-014 | 現在アプリの登録と `mira-signal-` キャッシュだけを整理し、PlayerStateを参照しない | `offline-control`単体テスト、`development-mode.md`の復帰マトリクス |
| FR-049 | ローカルの厳密な `?sw=1` だけを `offline-test` とする | クエリ境界値テスト、`quickstart.md`のオフライン完走シナリオ |
| FR-050 | 非ローカル環境はクエリ値に関係なく `production` とし、切替UIを設けない | 公開モード契約テスト、参加者画面の静的監査 |

## Project Structure

### Documentation (this feature)

```text
specs/001-location-mystery-game/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   ├── asset-manifest.schema.json
│   ├── content.schema.json
│   ├── development-mode.md
│   ├── player-state.schema.json
│   └── release-config.schema.json
└── tasks.md                         # $speckit-tasksで後続作成
```

### Source Code (repository root)

```text
docs/mystery-develop/
├── index.html
├── package.json                       # type=module、追加依存なし、テストコマンドのみ
├── manifest.webmanifest
├── service-worker.js
├── styles/app.css
├── js/
│   ├── main.js
│   ├── core/{answer-normalizer,content-validator,game-state,runtime-mode,state-machine}.js
│   ├── services/{asset-preloader,audio-queue,location,offline-control,storage}.js
│   └── ui/{map-view,renderer,screens}.js
├── data/{asset-manifest,content,release-config}.json
├── assets/{audio,images,icons}/
├── vendor/leaflet/
└── tests/{contract,integration,unit,fixtures}/
```

**Structure Decision**: 本番コードはconstitution指定の単一静的アプリとして `docs/mystery-develop/` に新設する。ドメインロジックをDOM・位置情報・音声から分離し、Node標準テストで直接検証できるES Modulesにする。実行モード判定は副作用のない `core/runtime-mode.js`、登録解除・アプリ限定キャッシュ整理は注入可能な `services/offline-control.js` に分離し、ブラウザ外でも安全範囲をテストする。`package.json` は `type: module` とテストスクリプトだけを持ち、依存パッケージは追加しない。`docs/mystery/` は変更せず、PoC比較と座標・音声検証の参考として残す。

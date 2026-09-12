# Tasks: 位置情報連動謎解きゲーム

**Input**: Design documents from `/specs/001-location-mystery-game/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: 仕様とconstitutionが自動・ブラウザ・実機・実歩行テストを要求するため、各ストーリーに先行テストを含める。

**Organization**: タスクはユーザーストーリー単位でまとめ、fixture状態から各ストーリーを独立検証できるようにする。実装、アセット、設定、テストはすべて `docs/mystery-develop/` 内に置く。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 未完了タスクとファイル競合せず並行実行可能
- **[Story]**: `spec.md` のユーザーストーリー

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 追加ランタイム依存のない静的ES Modulesアプリの土台を作る

- [ ] T001 Create the planned directory tree under `docs/mystery-develop/` and place the public entry point at `docs/mystery-develop/index.html`
- [ ] T002 Create dependency-free ES Modules and test scripts with `type: module` in `docs/mystery-develop/package.json`
- [ ] T003 [P] Vendor Leaflet 1.9.4 JavaScript, CSS, and marker images locally under `docs/mystery-develop/vendor/leaflet/`
- [ ] T004 [P] Create the mobile-first design tokens, high-contrast base layout, focus styles, and reduced-motion rules in `docs/mystery-develop/styles/app.css`
- [ ] T005 [P] Create the app metadata and local icon references in `docs/mystery-develop/manifest.webmanifest` and `docs/mystery-develop/assets/icons/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全ストーリーが利用する契約、データ、状態機械、描画基盤を整える

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリー実装を開始しない。

- [ ] T006 Create placeholder `ReleaseConfiguration`, `AssetManifest`, and content data with matching non-empty `releaseId`, `routeMode: primary|alternate`, `initialStateProfile: normal|test`, exactly 4 spots, exactly 4 puzzles, and exactly 4 parts in `docs/mystery-develop/data/release-config.json`, `docs/mystery-develop/data/asset-manifest.json`, and `docs/mystery-develop/data/content.json`
- [ ] T007 [P] Create valid, invalid, compatible-release, and incompatible-release JSON fixtures in `docs/mystery-develop/tests/fixtures/`
- [ ] T008 [P] Write contract tests for required fields, ID uniqueness, reference integrity, matching `releaseId`, `fallbackMode: player-confirmation`, and 4-item cardinalities in `docs/mystery-develop/tests/contract/content-contract.test.js`
- [ ] T009 [P] Write PlayerState contract tests requiring unique ID arrays, no coordinate/history fields, and `q4Order` as exactly four unique values from R/A/M/I in `docs/mystery-develop/tests/contract/player-state-contract.test.js`
- [ ] T010 Implement dependency-free runtime validation for release, asset, content, and PlayerState contracts in `docs/mystery-develop/js/core/content-validator.js`
- [ ] T011 [P] Write tests for initial state, invariant enforcement, duplicate-event idempotence, and forbidden chapter skipping in `docs/mystery-develop/tests/unit/game-state.test.js`
- [ ] T012 Implement immutable initial `PlayerState`, state validation, and event reducers without coordinates, answer history, error counts, or analytics in `docs/mystery-develop/js/core/game-state.js`
- [ ] T013 Implement guarded transitions from `not-started` through `completed` and reject unmet prerequisite events in `docs/mystery-develop/js/core/state-machine.js`
- [ ] T014 Implement the semantic screen container, live status region, modal/dialog handling, and render lifecycle in `docs/mystery-develop/js/ui/renderer.js`
- [ ] T015 Implement startup loading of release config, asset manifest, content validation, state creation, and fatal configuration messaging in `docs/mystery-develop/js/main.js`

**Checkpoint**: JSONと状態が検証され、任意の画面をfixture状態から描画できる。

---

## Phase 3: User Story 1 - 宇宙端末を起動してミラと出会う (Priority: P1) 🎯 MVP

**Goal**: 注意事項と音声確認を経て、ミラの依頼と最初の目的地点を理解して出発できる

**Independent Test**: 位置情報なしの新規状態から、注意事項、音声確認、着信、導入字幕、最初の目的地点まで進める。音声拒否時も字幕で完了する。

### Tests for User Story 1

- [ ] T016 [P] [US1] Write state tests for S00→S03 introduction order, acknowledgement gates, and audio-failure subtitle completion in `docs/mystery-develop/tests/unit/introduction-flow.test.js`
- [ ] T017 [P] [US1] Create the browser acceptance procedure for first start, audio permission, and no-audio completion in `docs/mystery-develop/tests/integration/us1-introduction.md`

### Implementation for User Story 1

- [ ] T018 [US1] Add introduction chapters, scenes, Mira call, full subtitles, safety text, privacy text, and first destination data in `docs/mystery-develop/data/content.json`
- [ ] T019 [US1] Implement S00 preparation, safety acknowledgement, location-purpose notice, screen-on recommendation, and continue/new-game choices in `docs/mystery-develop/js/ui/screens.js`
- [ ] T020 [US1] Implement user-gesture audio unlock, test playback, play rejection handling, and subtitle-only selection in `docs/mystery-develop/js/services/audio-queue.js`
- [ ] T021 [US1] Render S01–S03 terminal discovery, incoming call, Mira introduction, and destination presentation from content data in `docs/mystery-develop/js/ui/screens.js`
- [ ] T022 [US1] Integrate introduction events, saved acknowledgements, replay-safe transitions, and current objective display in `docs/mystery-develop/js/main.js`

**Checkpoint**: US1を位置情報・後続問題なしで独立実行し、字幕のみでも出発まで到達できる。

---

## Phase 4: User Story 2 - 通信を聞きながら地点へ到達する (Priority: P1)

**Goal**: 画面注視を要求せず、通信、地図補助、GPSまたは常時表示の到着確認で現在地点を解放する

**Independent Test**: moving fixtureから通信操作と現在Spot判定を行い、GPS成功・拒否・精度不足・手動到着の各経路で同じarrived状態になる。後続Spotは解放されない。

### Tests for User Story 2

- [ ] T023 [P] [US2] Write distance, radius-boundary, accuracy-warning, current-spot-only, repeated-position, and permission-error tests in `docs/mystery-develop/tests/unit/location.test.js`
- [ ] T024 [P] [US2] Write queue tests proving one active clip, no interruption, bridge-before-main while idle, replay, 10-second rewind, and resume position in `docs/mystery-develop/tests/unit/audio-queue.test.js`
- [ ] T025 [P] [US2] Create browser acceptance steps for GPS, manual arrival, audio controls, tile failure, and vibration fallback in `docs/mystery-develop/tests/integration/us2-travel.md`

### Implementation for User Story 2

- [ ] T026 [P] [US2] Implement Haversine distance, `watchPosition` lifecycle, accuracy/error status, current-Spot-only evaluation, and immediate coordinate discard in `docs/mystery-develop/js/services/location.js`
- [ ] T027 [P] [US2] Complete the single-player audio queue with kinds `main|bridge|system|effect|bgm`, non-interruption, bridge priority while idle, subtitles, BGM ducking, and progress callbacks in `docs/mystery-develop/js/services/audio-queue.js`
- [ ] T028 [P] [US2] Implement Leaflet map initialization from local assets, current target marker/radius, current-position marker, and non-blocking tile-error fallback in `docs/mystery-develop/js/ui/map-view.js`
- [ ] T029 [US2] Implement S02–S04 travel, communication controls, safe-stop prompt, status text, and always-visible current-target arrival button in `docs/mystery-develop/js/ui/screens.js`
- [ ] T030 [US2] Implement arrival sound and visual scan effects, optional vibration, and equivalent sound/visual behavior when vibration is unavailable in `docs/mystery-develop/js/ui/renderer.js`
- [ ] T031 [US2] Integrate travel triggers, listened flags, arrival idempotence, prerequisite checks, and prevention of later-Spot unlocking in `docs/mystery-develop/js/main.js`

**Checkpoint**: US2をmoving fixtureから独立実行し、GPSなし・地図タイルなしでも現在Spotだけを解放できる。

---

## Phase 5: User Story 3 - 3つの現地謎を解いてパーツを回収する (Priority: P1)

**Goal**: Q1〜Q3を回答・再試行・3段階ヒント付きで解き、R/A/Mを1度ずつ取得する

**Independent Test**: 各arrived fixtureから問題を単独表示し、表記揺れ、誤答、全ヒント、正答、解説、パーツ取得、次区間解放を確認する。

### Tests for User Story 3

- [ ] T032 [P] [US3] Write answer normalization tests for case, trim, fullwidth ASCII, numeric spaces, and numeric hyphens in `docs/mystery-develop/tests/unit/answer-normalizer.test.js`
- [ ] T033 [P] [US3] Write Q1–Q3 tests for retry without lockout, exactly three ordered hints, persisted hint history, one-time part grants, and prerequisite-gated next sections in `docs/mystery-develop/tests/unit/puzzle-flow.test.js`
- [ ] T034 [P] [US3] Create browser acceptance steps for image zoom, orientation, alt text, wrong answers, hints, and R/A/M acquisition in `docs/mystery-develop/tests/integration/us3-puzzles.md`

### Implementation for User Story 3

- [ ] T035 [P] [US3] Implement `trim|case-fold|fullwidth-to-ascii|remove-space|remove-hyphen` rules and answer comparison in `docs/mystery-develop/js/core/answer-normalizer.js`
- [ ] T036 [US3] Add Q1 placeholder content for UNIVERSE, Q2 content for 5997, Q3 Morse content for HOLES, exactly three hints each, explanations, and R/A/M part references in `docs/mystery-develop/data/content.json`
- [ ] T037 [US3] Implement S05/S06 puzzle form, non-locking error feedback, ordered hint disclosure, history restoration, image zoom, orientation-safe layout, and alt text in `docs/mystery-develop/js/ui/screens.js`
- [ ] T038 [US3] Implement S07 answer explanation, one-time part acquisition animation, inventory display, and next-section action in `docs/mystery-develop/js/ui/renderer.js`
- [ ] T039 [US3] Integrate puzzle validation, hint persistence, idempotent R/A/M grants, and guarded next-chapter transitions in `docs/mystery-develop/js/main.js`

**Checkpoint**: US3の各問題を独立fixtureで完了でき、誤答や全ヒント利用でも進行不能にならない。

---

## Phase 6: User Story 4 - 庭園で最終認証を行いミラを見送る (Priority: P1)

**Goal**: 最後のIを取得し、タップ操作でMIRAへ並べ替え、物語と1オークエンの結末を再視聴可能にする

**Independent Test**: Q1〜Q3完了fixtureから、庭園到着、I取得、タップ並べ替え、誤順再試行、正解、エンディング、記念画面、再視聴を完了する。

### Tests for User Story 4

- [ ] T040 [P] [US4] Write Q4 tests requiring exactly four unique R/A/M/I values, tap-swap operations, visible order updates, wrong-order retry, and MIRA success in `docs/mystery-develop/tests/unit/final-authentication.test.js`
- [ ] T041 [P] [US4] Write ending tests for one-time completion, replay without state rollback, and required story facts in `docs/mystery-develop/tests/unit/ending-flow.test.js`
- [ ] T042 [P] [US4] Create browser acceptance steps for garden arrival, I acquisition, keyboard/tap access, color-independent order, ending, and replay in `docs/mystery-develop/tests/integration/us4-ending.md`

### Implementation for User Story 4

- [ ] T043 [US4] Add garden/final-Spot content, I part, pilot profile, MIRA answer, 1817 and 200-year reveal, partner address, and 1オークエン ending content in `docs/mystery-develop/data/content.json`
- [ ] T044 [US4] Implement S08/S09 accessible tap-select-and-swap controls, optional drag enhancement, visible order, non-color selection state, and retry in `docs/mystery-develop/js/ui/screens.js`
- [ ] T045 [US4] Implement S10 ending sequence, memorial screen, replay controls, and audio/subtitle parity in `docs/mystery-develop/js/ui/renderer.js`
- [ ] T046 [US4] Integrate final prerequisites, idempotent I grant, MIRA certification, completion persistence, and state-neutral replay in `docs/mystery-develop/js/main.js`

**Checkpoint**: US4を前章完了fixtureから独立実行し、音声なしでもエンディングまで完了・再視聴できる。

---

## Phase 7: User Story 5 - 失敗や中断から体験を再開する (Priority: P2)

**Goal**: 通信・位置・音声・再読込・公開版差異があっても、保存、字幕、救済経路で完走する

**Independent Test**: Q2完了状態を保存・復帰し、GPS拒否、音声失敗、オフライン、互換／非互換版、確認付きリセットを順に発生させても仕様どおり継続または案内される。

### Tests for User Story 5

- [ ] T047 [P] [US5] Write storage tests for event-time saves, corruption rejection, compatible migration, incompatible preservation, confirmed reset, and no coordinate/analytics fields in `docs/mystery-develop/tests/unit/storage.test.js`
- [ ] T048 [P] [US5] Write asset preparation tests for required/optional classification, progress, retry, release cache naming, and required-asset start blocking in `docs/mystery-develop/tests/unit/asset-preloader.test.js`
- [ ] T049 [P] [US5] Create browser acceptance steps for reload, restart, audio failure, GPS denial, offline completion, cache update, and reset confirmation in `docs/mystery-develop/tests/integration/us5-recovery.md`

### Implementation for User Story 5

- [ ] T050 [P] [US5] Implement `takaostep:mystery:player-state` persistence, schema validation, event-time writes, compatible migrations, non-destructive incompatibility handling, and confirmed reset in `docs/mystery-develop/js/services/storage.js`
- [ ] T051 [P] [US5] Implement required/optional asset fetch, Cache Storage verification, progress reporting, retries, and stale-release cleanup in `docs/mystery-develop/js/services/asset-preloader.js`
- [ ] T052 [P] [US5] Implement versioned app-shell precache, cache-first local assets, network fallback, offline navigation fallback, and no mandatory map-tile caching in `docs/mystery-develop/service-worker.js`
- [ ] T053 [US5] Add Service Worker registration, first-controlled-reload handling, required-asset readiness gating, update notification, and offline status in `docs/mystery-develop/js/main.js`
- [ ] T054 [US5] Implement continue/new-game, incompatible-release, cache-retry, audio-failure subtitle, location-failure, and storage-failure UI states in `docs/mystery-develop/js/ui/screens.js`
- [ ] T055 [US5] Populate all app-shell, local Leaflet, JSON, subtitle, problem-image, and basic-UI paths as required while keeping replaceable audio/effects optional in `docs/mystery-develop/data/asset-manifest.json`

**Checkpoint**: 必須素材準備後に機内モード相当で完走でき、保存状態を失わず復帰・移行・確認付き初期化できる。

---

## Phase 8: User Story 6 - 運営者が開催前に公開設定を準備する (Priority: P2)

**Goal**: コード化された設定を開催前に変更・再デプロイし、通常／代替ルートとテスト初期状態を安全に検証する

**Independent Test**: 設定fixtureを変更して静的サイトを再起動し、新規／再読込画面へ反映されること、通常画面に運営操作がないこと、15分以内に確認できることを検証する。

### Tests for User Story 6

- [ ] T056 [P] [US6] Write publication contract tests for matching release IDs, primary/alternate route selection, allowed compatible releases, and production `initialStateProfile: normal` in `docs/mystery-develop/tests/contract/release-publication.test.js`
- [ ] T057 [P] [US6] Create the pre-event redeploy acceptance procedure, including alternate final Spot and 15-minute verification, in `docs/mystery-develop/tests/integration/us6-operations.md`

### Implementation for User Story 6

- [ ] T058 [P] [US6] Define primary/alternate route settings, content paths, asset manifest path, cache name, and compatible release IDs in `docs/mystery-develop/data/release-config.json`
- [ ] T059 [P] [US6] Add normal-start and chapter/Spot test profiles as static fixtures, without exposing them in participant UI, in `docs/mystery-develop/tests/fixtures/release-profiles/`
- [ ] T060 [US6] Implement config-selected primary/alternate final Spot and test-only initial state loading with production guards in `docs/mystery-develop/js/main.js`
- [ ] T061 [US6] Document the pre-event edit, contract-test, cache-version, redeploy, reload notice, rollback, and no-mid-event-change procedure in `docs/mystery-develop/README.md`
- [ ] T062 [US6] Remove or exclude Spot editing, chapter unlock, skip, remote state, reset-all, debug location, export, and analytics controls from `docs/mystery-develop/index.html`

**Checkpoint**: 運営者は静的設定と再デプロイだけで開催条件を変更でき、参加者画面から運営操作へ到達できない。

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 全体品質、実素材、現地条件、公開判定を仕上げる

- [ ] T063 Replace the Q1 placeholder with the final solar-system diagram, diary, character mapping, extraction steps, three hints, explanation, and alt text in `docs/mystery-develop/data/content.json` and `docs/mystery-develop/assets/images/puzzles/`
- [ ] T064 Replace placeholder Spot values after field survey with the exact 4 coordinates, distances, order, radii, safe stopping places, and alternate route in `docs/mystery-develop/data/content.json`
- [ ] T065 Add final version-matched Mira audio, system audio, effects, BGM, and subtitles under `docs/mystery-develop/assets/audio/` and `docs/mystery-develop/data/content.json`
- [ ] T066 Run third-party Q1 uniqueness tests and factual review for the 1817 Hachioji meteorite, Mt. Takao, Big Dipper, cable car, and astronomy claims; record approvals in `docs/mystery-develop/tests/integration/content-review.md`
- [ ] T067 Run automated tests and fix all failures using `docs/mystery-develop/tests/` and `docs/mystery-develop/package.json`
- [ ] T068 Run iOS Safari and Android Chrome accessibility, audio, vibration-fallback, persistence, update, and offline scenarios; record browser versions and outcomes in `docs/mystery-develop/tests/integration/browser-matrix.md`
- [ ] T069 Run normal, fast-solve, and all-hints field tests for GPS/manual arrival, safety, 20-minute walking time, and 30–40-minute total experience; record results in `docs/mystery-develop/tests/integration/field-results.md`
- [ ] T070 Verify app-shell startup, 100ms interaction/state/location goals, cache size, no external analytics requests, no persisted coordinates, and no mandatory CDN dependency in `docs/mystery-develop/tests/integration/release-audit.md`
- [ ] T071 Execute every scenario in `specs/001-location-mystery-game/quickstart.md`, set the production release to `initialStateProfile: normal`, and record final readiness in `docs/mystery-develop/README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし
- **Foundational (Phase 2)**: Setup完了後。全ユーザーストーリーをブロックする
- **US1〜US4 (Phases 3–6)**: Foundational完了後、fixture状態を使えば並行実装可能。統合デモはUS1→US2→US3→US4
- **US5 (Phase 7)**: Foundational完了後にサービス実装可能。完全な回復テストはUS1〜US4統合後
- **US6 (Phase 8)**: Foundational完了後に設定・手順実装可能。公開確認は対象ストーリー統合後
- **Polish (Phase 9)**: 公開対象のUS1〜US6完了後

### User Story Dependency Graph

```text
Setup → Foundation ┬→ US1 ─→ US2 ─→ US3 ─→ US4 ─┐
                   ├→ US5 services ───────────────┤→ Polish / Release
                   └→ US6 configuration ──────────┘
```

### Within Each User Story

- テストとfixtureを先に作り、対象動作が未実装で失敗することを確認する
- データ・純粋ロジックをUIより先に実装する
- サービスを画面統合より先に実装する
- Checkpointの独立テストを通してから次の統合段階へ進む

## Parallel Opportunities

- SetupではT003〜T005を並行可能
- FoundationではT007〜T009、T011を並行可能
- US1ではT016〜T017、US2ではT023〜T025とT026〜T028を並行可能
- US3ではT032〜T035、US4ではT040〜T042を並行可能
- US5ではT047〜T052、US6ではT056〜T059をファイル競合に注意して並行可能
- PolishのT063〜T065は `data/content.json` を共有するため順番に行い、レビュー・実機・現地試験は素材統合後に実施する

## Parallel Execution Examples

### User Story 1

```text
T016 introduction-flow.test.js
T017 us1-introduction.md
```

### User Story 2

```text
T023 location.test.js + T026 location.js
T024 audio-queue.test.js + T027 audio-queue.js
T025 us2-travel.md + T028 map-view.js
```

### User Story 3

```text
T032 answer-normalizer.test.js + T035 answer-normalizer.js
T033 puzzle-flow.test.js
T034 us3-puzzles.md
```

### User Story 4

```text
T040 final-authentication.test.js
T041 ending-flow.test.js
T042 us4-ending.md
```

### User Story 5

```text
T047 storage.test.js + T050 storage.js
T048 asset-preloader.test.js + T051 asset-preloader.js
T049 us5-recovery.md + T052 service-worker.js
```

### User Story 6

```text
T056 release-publication.test.js + T058 release-config.json
T057 us6-operations.md + T059 release profile fixtures
```

## Implementation Strategy

### MVP First

1. Phase 1 Setup
2. Phase 2 Foundation
3. Phase 3 US1
4. US1を位置情報なし・字幕のみで独立検証

US1までを導入MVPとする。位置情報連動の縦切りデモにはUS2までを追加する。

### Incremental Delivery

1. US1: 導入とミラの依頼
2. US2: 通信・地図・位置到着
3. US3: Q1〜Q3とR/A/M
4. US4: I、MIRA、エンディング
5. US5: 保存・失敗・オフライン完走
6. US6: 開催前設定と再デプロイ
7. Polish: 本素材、現地、実機、公開監査

## Notes

- `[P]` は異なるファイルまたは独立成果物で、未完了依存がないタスクだけに付与した
- `docs/mystery/` はPoCとして保持し、本番実装タスクでは変更しない
- T063とT064は仕様上のTODOを解消する公開前必須タスクであり、仮素材による機能実装は先行できる
- 各タスクまたは論理的な小グループごとに検証し、Checkpoint単位で統合する

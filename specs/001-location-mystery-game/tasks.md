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

- [X] T001 Create the planned directory tree under `docs/mystery-develop/` and place the public entry point at `docs/mystery-develop/index.html`
- [X] T002 Create dependency-free ES Modules and test scripts with `type: module` in `docs/mystery-develop/package.json`
- [X] T003 [P] Vendor Leaflet 1.9.4 JavaScript, CSS, and marker images locally under `docs/mystery-develop/vendor/leaflet/`
- [X] T004 [P] Create the mobile-first design tokens, high-contrast base layout, focus styles, and reduced-motion rules in `docs/mystery-develop/styles/app.css`
- [X] T005 [P] Create the app metadata and local icon references in `docs/mystery-develop/manifest.webmanifest` and `docs/mystery-develop/assets/icons/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全ストーリーが利用する契約、データ、状態機械、描画基盤を整える

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリー実装を開始しない。

- [X] T006 Create placeholder `ReleaseConfiguration`, `AssetManifest`, and content data with matching non-empty `releaseId`, `routeMode: primary|alternate`, `initialStateProfile: normal|test`, exactly 4 spots, exactly 4 puzzles, and exactly 4 parts in `docs/mystery-develop/data/release-config.json`, `docs/mystery-develop/data/asset-manifest.json`, and `docs/mystery-develop/data/content.json`
- [X] T007 [P] Create valid, invalid, compatible-release, and incompatible-release JSON fixtures in `docs/mystery-develop/tests/fixtures/`
- [X] T008 [P] Write contract tests for required fields, ID uniqueness, reference integrity, matching `releaseId`, `fallbackMode: player-confirmation`, and 4-item cardinalities in `docs/mystery-develop/tests/contract/content-contract.test.js`
- [X] T009 [P] Write PlayerState contract tests requiring unique ID arrays, no coordinate/history fields, and `q4Order` as exactly four unique values from R/A/M/I in `docs/mystery-develop/tests/contract/player-state-contract.test.js`
- [X] T010 Implement dependency-free runtime validation for release, asset, content, and PlayerState contracts in `docs/mystery-develop/js/core/content-validator.js`
- [X] T011 [P] Write tests for initial state, invariant enforcement, duplicate-event idempotence, and forbidden chapter skipping in `docs/mystery-develop/tests/unit/game-state.test.js`
- [X] T012 Implement immutable initial `PlayerState`, state validation, and event reducers without coordinates, answer history, error counts, or analytics in `docs/mystery-develop/js/core/game-state.js`
- [X] T013 Implement guarded transitions from `not-started` through `completed` and reject unmet prerequisite events in `docs/mystery-develop/js/core/state-machine.js`
- [X] T014 Implement the semantic screen container, live status region, modal/dialog handling, and render lifecycle in `docs/mystery-develop/js/ui/renderer.js`
- [X] T015 Implement startup loading of release config, asset manifest, content validation, state creation, and fatal configuration messaging in `docs/mystery-develop/js/main.js`

**Checkpoint**: JSONと状態が検証され、任意の画面をfixture状態から描画できる。

---

## Phase 3: User Story 1 - 宇宙端末を起動してミラと出会う (Priority: P1) 🎯 MVP

**Goal**: 注意事項と音声確認を経て、ミラの依頼と最初の目的地点を理解して出発できる

**Independent Test**: 位置情報なしの新規状態から、注意事項、音声確認、着信、導入字幕、最初の目的地点まで進める。音声拒否時も字幕で完了する。

### Tests for User Story 1

- [X] T016 [P] [US1] Write state tests for S00→S03 introduction order, acknowledgement gates, and audio-failure subtitle completion in `docs/mystery-develop/tests/unit/introduction-flow.test.js`
- [X] T017 [P] [US1] Create the browser acceptance procedure for first start, audio permission, and no-audio completion in `docs/mystery-develop/tests/integration/us1-introduction.md`

### Implementation for User Story 1

- [X] T018 [US1] Add introduction chapters, scenes, Mira call, full subtitles, safety text, privacy text, and first destination data in `docs/mystery-develop/data/content.json`
- [X] T019 [US1] Implement S00 preparation, safety acknowledgement, location-purpose notice, screen-on recommendation, and continue/new-game choices in `docs/mystery-develop/js/ui/screens.js`
- [X] T020 [US1] Implement user-gesture audio unlock, test playback, play rejection handling, and subtitle-only selection in `docs/mystery-develop/js/services/audio-queue.js`
- [X] T021 [US1] Render S01–S03 terminal discovery, incoming call, Mira introduction, and destination presentation from content data in `docs/mystery-develop/js/ui/screens.js`
- [X] T022 [US1] Integrate introduction events, saved acknowledgements, replay-safe transitions, and current objective display in `docs/mystery-develop/js/main.js`

**Checkpoint**: US1を位置情報・後続問題なしで独立実行し、字幕のみでも出発まで到達できる。

---

## Phase 4: User Story 2 - 通信を聞きながら地点へ到達する (Priority: P1)

**Goal**: 画面注視を要求せず、通信、地図補助、GPSまたは常時表示の到着確認で現在地点を解放する

**Independent Test**: moving fixtureから通信操作と現在Spot判定を行い、GPS成功・拒否・精度不足・手動到着の各経路で同じarrived状態になる。後続Spotは解放されない。

### Tests for User Story 2

- [X] T023 [P] [US2] Write distance, radius-boundary, accuracy-warning, current-spot-only, repeated-position, and permission-error tests in `docs/mystery-develop/tests/unit/location.test.js`
- [X] T024 [P] [US2] Write queue tests proving one active clip, no interruption, bridge-before-main while idle, replay, 10-second rewind, and resume position in `docs/mystery-develop/tests/unit/audio-queue.test.js`
- [X] T025 [P] [US2] Create browser acceptance steps for GPS, manual arrival, audio controls, tile failure, and vibration fallback in `docs/mystery-develop/tests/integration/us2-travel.md`

### Implementation for User Story 2

- [X] T026 [P] [US2] Implement Haversine distance, `watchPosition` lifecycle, accuracy/error status, current-Spot-only evaluation, and immediate coordinate discard in `docs/mystery-develop/js/services/location.js`
- [X] T027 [P] [US2] Complete the single-player audio queue with kinds `main|bridge|system|effect|bgm`, non-interruption, bridge priority while idle, subtitles, BGM ducking, and progress callbacks in `docs/mystery-develop/js/services/audio-queue.js`
- [X] T028 [P] [US2] Implement Leaflet map initialization from local assets, current target marker/radius, current-position marker, and non-blocking tile-error fallback in `docs/mystery-develop/js/ui/map-view.js`
- [X] T029 [US2] Implement S02–S04 travel, communication controls, safe-stop prompt, status text, and always-visible current-target arrival button in `docs/mystery-develop/js/ui/screens.js`
- [X] T030 [US2] Implement arrival sound and visual scan effects, optional vibration, and equivalent sound/visual behavior when vibration is unavailable in `docs/mystery-develop/js/ui/renderer.js`
- [X] T031 [US2] Integrate travel triggers, listened flags, arrival idempotence, prerequisite checks, and prevention of later-Spot unlocking in `docs/mystery-develop/js/main.js`

**Checkpoint**: US2をmoving fixtureから独立実行し、GPSなし・地図タイルなしでも現在Spotだけを解放できる。

---

## Phase 5: User Story 3 - 3つの現地謎を解いてパーツを回収する (Priority: P1)

**Goal**: Q1〜Q3を回答・再試行・3段階ヒント付きで解き、R/A/Mを1度ずつ取得する

**Independent Test**: 各arrived fixtureから問題を単独表示し、表記揺れ、誤答、全ヒント、正答、解説、パーツ取得、次区間解放を確認する。

### Tests for User Story 3

- [X] T032 [P] [US3] Write answer normalization tests for case, trim, fullwidth ASCII, numeric spaces, and numeric hyphens in `docs/mystery-develop/tests/unit/answer-normalizer.test.js`
- [X] T033 [P] [US3] Write Q1–Q3 tests for retry without lockout, exactly three ordered hints, persisted hint history, one-time part grants, and prerequisite-gated next sections in `docs/mystery-develop/tests/unit/puzzle-flow.test.js`
- [X] T034 [P] [US3] Create browser acceptance steps for image zoom, orientation, alt text, wrong answers, hints, and R/A/M acquisition in `docs/mystery-develop/tests/integration/us3-puzzles.md`

### Implementation for User Story 3

- [X] T035 [P] [US3] Implement `trim|case-fold|fullwidth-to-ascii|remove-space|remove-hyphen` rules and answer comparison in `docs/mystery-develop/js/core/answer-normalizer.js`
- [X] T036 [US3] Add Q1 placeholder content for UNIVERSE, Q2 content for 5997, Q3 Morse content for HOLES, exactly three hints each, explanations, and R/A/M part references in `docs/mystery-develop/data/content.json`
- [X] T037 [US3] Implement S05/S06 puzzle form, non-locking error feedback, ordered hint disclosure, history restoration, image zoom, orientation-safe layout, and alt text in `docs/mystery-develop/js/ui/screens.js`
- [X] T038 [US3] Implement S07 answer explanation, one-time part acquisition animation, inventory display, and next-section action in `docs/mystery-develop/js/ui/renderer.js`
- [X] T039 [US3] Integrate puzzle validation, hint persistence, idempotent R/A/M grants, and guarded next-chapter transitions in `docs/mystery-develop/js/main.js`

**Checkpoint**: US3の各問題を独立fixtureで完了でき、誤答や全ヒント利用でも進行不能にならない。

---

## Phase 6: User Story 4 - 庭園で最終認証を行いミラを見送る (Priority: P1)

**Goal**: 最後のIを取得し、タップ操作でMIRAへ並べ替え、物語と1オークエンの結末を再視聴可能にする

**Independent Test**: Q1〜Q3完了fixtureから、庭園到着、I取得、タップ並べ替え、誤順再試行、正解、エンディング、記念画面、再視聴を完了する。

### Tests for User Story 4

- [X] T040 [P] [US4] Write Q4 tests requiring exactly four unique R/A/M/I values, tap-swap operations, visible order updates, wrong-order retry, and MIRA success in `docs/mystery-develop/tests/unit/final-authentication.test.js`
- [X] T041 [P] [US4] Write ending tests for one-time completion, replay without state rollback, and required story facts in `docs/mystery-develop/tests/unit/ending-flow.test.js`
- [X] T042 [P] [US4] Create browser acceptance steps for garden arrival, I acquisition, keyboard/tap access, color-independent order, ending, and replay in `docs/mystery-develop/tests/integration/us4-ending.md`

### Implementation for User Story 4

- [X] T043 [US4] Add garden/final-Spot content, I part, pilot profile, MIRA answer, 1817 and 200-year reveal, partner address, and 1オークエン ending content in `docs/mystery-develop/data/content.json`
- [X] T044 [US4] Implement S08/S09 accessible tap-select-and-swap controls, optional drag enhancement, visible order, non-color selection state, and retry in `docs/mystery-develop/js/ui/screens.js`
- [X] T045 [US4] Implement S10 ending sequence, memorial screen, replay controls, and audio/subtitle parity in `docs/mystery-develop/js/ui/renderer.js`
- [X] T046 [US4] Integrate final prerequisites, idempotent I grant, MIRA certification, completion persistence, and state-neutral replay in `docs/mystery-develop/js/main.js`

**Checkpoint**: US4を前章完了fixtureから独立実行し、音声なしでもエンディングまで完了・再視聴できる。

---

## Phase 7: User Story 5 - 失敗や中断から体験を再開する (Priority: P2)

**Goal**: 通信・位置・音声・再読込・公開版差異があっても、保存、字幕、救済経路で完走する

**Independent Test**: Q2完了状態を保存・復帰し、GPS拒否、音声失敗、オフライン、互換／非互換版、確認付きリセットを順に発生させても仕様どおり継続または案内される。

### Tests for User Story 5

- [X] T047 [P] [US5] Write storage tests for event-time saves, corruption rejection, compatible migration, incompatible preservation, confirmed reset, and no coordinate/analytics fields in `docs/mystery-develop/tests/unit/storage.test.js`
- [X] T048 [P] [US5] Write asset preparation tests for required/optional classification, progress, retry, release cache naming, and required-asset start blocking in `docs/mystery-develop/tests/unit/asset-preloader.test.js`
- [X] T049 [P] [US5] Create browser acceptance steps for reload, restart, audio failure, GPS denial, offline completion, cache update, and reset confirmation in `docs/mystery-develop/tests/integration/us5-recovery.md`

### Implementation for User Story 5

- [X] T050 [P] [US5] Implement `takaostep:mystery:player-state` persistence, schema validation, event-time writes, compatible migrations, non-destructive incompatibility handling, and confirmed reset in `docs/mystery-develop/js/services/storage.js`
- [X] T051 [P] [US5] Implement required/optional asset fetch, Cache Storage verification, progress reporting, retries, and stale-release cleanup in `docs/mystery-develop/js/services/asset-preloader.js`
- [X] T052 [P] [US5] Implement versioned app-shell precache, cache-first local assets, network fallback, offline navigation fallback, and no mandatory map-tile caching in `docs/mystery-develop/service-worker.js`
- [X] T053 [US5] Add Service Worker registration, first-controlled-reload handling, required-asset readiness gating, update notification, and offline status in `docs/mystery-develop/js/main.js`
- [X] T054 [US5] Implement continue/new-game, incompatible-release, cache-retry, audio-failure subtitle, location-failure, and storage-failure UI states in `docs/mystery-develop/js/ui/screens.js`
- [X] T055 [US5] Populate all app-shell, local Leaflet, JSON, subtitle, problem-image, and basic-UI paths as required while keeping replaceable audio/effects optional in `docs/mystery-develop/data/asset-manifest.json`

**Checkpoint**: 必須素材準備後に機内モード相当で完走でき、保存状態を失わず復帰・移行・確認付き初期化できる。

---

## Phase 8: User Story 6 - 運営者が開催前に公開設定を準備する (Priority: P2)

**Goal**: コード化された設定を開催前に変更・再デプロイし、通常／代替ルートとテスト初期状態を安全に検証する

**Independent Test**: 設定fixtureを変更して静的サイトを再起動し、新規／再読込画面へ反映されること、通常画面に運営操作がないこと、15分以内に確認できることを検証する。

### Tests for User Story 6

- [X] T056 [P] [US6] Write publication contract tests for matching release IDs, primary/alternate route selection, allowed compatible releases, and production `initialStateProfile: normal` in `docs/mystery-develop/tests/contract/release-publication.test.js`
- [X] T057 [P] [US6] Create the pre-event redeploy acceptance procedure, including alternate final Spot and 15-minute verification, in `docs/mystery-develop/tests/integration/us6-operations.md`

### Implementation for User Story 6

- [X] T058 [P] [US6] Define primary/alternate route settings, content paths, asset manifest path, cache name, and compatible release IDs in `docs/mystery-develop/data/release-config.json`
- [X] T059 [P] [US6] Add normal-start and chapter/Spot test profiles as static fixtures, without exposing them in participant UI, in `docs/mystery-develop/tests/fixtures/release-profiles/`
- [X] T060 [US6] Implement config-selected primary/alternate final Spot and test-only initial state loading with production guards in `docs/mystery-develop/js/main.js`
- [X] T061 [US6] Document the pre-event edit, contract-test, cache-version, redeploy, reload notice, rollback, and no-mid-event-change procedure in `docs/mystery-develop/README.md`
- [X] T062 [US6] Remove or exclude Spot editing, chapter unlock, skip, remote state, reset-all, debug location, export, and analytics controls from `docs/mystery-develop/index.html`

**Checkpoint**: 運営者は静的設定と再デプロイだけで開催条件を変更でき、参加者画面から運営操作へ到達できない。

---

## Phase 9: Release Content & Field Validation

**Purpose**: 実素材、現地条件、第三者レビュー、実機検証を公開可能な状態へ仕上げる

- [X] T063 Replace the Q1 placeholder with the final solar-system diagram, diary, character mapping, extraction steps, three hints, explanation, and alt text in `docs/mystery-develop/data/content.json` and `docs/mystery-develop/assets/images/puzzles/`
- [ ] T064 Replace placeholder Spot values after field survey with the exact 4 coordinates, distances, order, radii, safe stopping places, and alternate route in `docs/mystery-develop/data/content.json`
- [ ] T065 Add final version-matched Mira audio, system audio, effects, BGM, and subtitles under `docs/mystery-develop/assets/audio/` and `docs/mystery-develop/data/content.json`
- [ ] T066 Run third-party Q1 uniqueness tests and factual review for the 1817 Hachioji meteorite, Mt. Takao, Big Dipper, cable car, and astronomy claims; record approvals in `docs/mystery-develop/tests/integration/content-review.md`
- [X] T067 Run automated tests and fix all failures using `docs/mystery-develop/tests/` and `docs/mystery-develop/package.json`
- [ ] T068 Run iOS Safari and Android Chrome accessibility, audio, vibration-fallback, persistence, update, normal-development, offline-test, production-offline, and recovery scenarios; record browser versions and outcomes in `docs/mystery-develop/tests/integration/browser-matrix.md`
- [ ] T069 Run normal, fast-solve, and all-hints field tests for GPS/manual arrival, safety, 20-minute walking time, and 30–40-minute total experience; record results in `docs/mystery-develop/tests/integration/field-results.md`
- [X] T070 Verify app-shell startup, 100ms interaction/state/location goals, cache size, no external analytics requests, no persisted coordinates, and no mandatory CDN dependency in `docs/mystery-develop/tests/integration/release-audit.md`

---

## Phase 10: User Story 7 - 開発中の変更を即時確認する (Priority: P3)

**Goal**: 通常ローカルでは公開用キャッシュを介さず1回の通常再読込で最新版を表示し、明示したオフライン試験と公開環境だけでService Workerと必須素材キャッシュを使用する

**Independent Test**: `?sw=1` でオフライン素材を準備してPlayerStateを保存した後、同一オリジンに非MIRAキャッシュを用意し、クエリなしのローカルURLへ戻る。自動再読込が最大1回で終わり、変更済みファイルが表示され、PlayerStateと非MIRAキャッシュが維持されることを確認する。さらに、ローカルでは厳密な `sw=1` だけがオフライン試験、非ローカルでは全クエリが本番モードになることを確認する。

### Tests for User Story 7

- [X] T071 [P] [US7] Write mode-resolution tests for `localhost`, `127.0.0.1`, `[::1]`, exact `sw=1`, boundary query values, coexisting parameters, and non-local production protection in `docs/mystery-develop/tests/unit/runtime-mode.test.js`
- [X] T072 [P] [US7] Write cleanup tests for exact app-scope unregistration, `mira-signal-` cache deletion, non-MIRA preservation, PlayerState non-interference, one-reload guard, retryable failures, and no-Service-Worker environments in `docs/mystery-develop/tests/unit/offline-control.test.js`
- [X] T073 [P] [US7] Extend asset preparation tests to prove network-only non-persistence in development and versioned Cache Storage behavior in offline-test and production in `docs/mystery-develop/tests/unit/asset-preloader.test.js`
- [X] T074 [P] [US7] Create browser acceptance steps for ordinary reload visibility, return from `?sw=1`, PlayerState and foreign-cache preservation, one-reload maximum, cleanup failure, query boundaries, and deployed production protection in `docs/mystery-develop/tests/integration/us7-development-mode.md`

### Implementation for User Story 7

- [X] T075 [P] [US7] Implement side-effect-free resolution of `development|offline-test|production` from local hostnames and the exact `sw=1` query contract in `docs/mystery-develop/js/core/runtime-mode.js`
- [X] T076 [P] [US7] Implement injected app-scope Service Worker unregistration, `mira-signal-`-only cache cleanup, one-per-tab reload guarding, structured cleanup results, and retryable failures without reading or writing localStorage in `docs/mystery-develop/js/services/offline-control.js`
- [X] T077 [P] [US7] Add a non-persisting network verification path for development while retaining versioned Cache Storage preparation and stale-MIRA cleanup for offline-test and production in `docs/mystery-develop/js/services/asset-preloader.js`
- [X] T078 [US7] Add a developer-only retryable cleanup-failure state without exposing a participant-facing mode toggle in `docs/mystery-develop/js/ui/screens.js`
- [X] T079 [US7] Resolve runtime mode before asset preparation, run development cleanup, register the Service Worker only for offline-test or production, enforce the one-reload result, route failures to the developer error state, and migrate pages controlled by the previous worker in `docs/mystery-develop/js/main.js` and `docs/mystery-develop/service-worker.js`
- [X] T080 [US7] Document the plain-local development loop, explicit `?sw=1` offline workflow, cleanup scope, one-reload behavior, and production safeguards in `docs/mystery-develop/README.md`

**Checkpoint**: US7の独立テストで、通常ローカルの変更がキャッシュ世代編集なしの通常再読込1回で反映され、オフライン試験から戻っても進行状態と他アプリのデータを維持し、公開環境では常にオフライン動作が有効になる。

---

## Phase 11: Final Integration & Release Readiness

**Purpose**: 全ストーリーと公開前素材を統合し、最終公開条件を確認する

- [ ] T081 Run the complete automated suite in `docs/mystery-develop/tests/`, execute every scenario in `specs/001-location-mystery-game/quickstart.md`, set the production release to `initialStateProfile: normal`, and record final readiness in `docs/mystery-develop/README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし
- **Foundational (Phase 2)**: Setup完了後。全ユーザーストーリーをブロックする
- **US1〜US4 (Phases 3–6)**: Foundational完了後、fixture状態を使えば並行実装可能。統合デモはUS1→US2→US3→US4
- **US5 (Phase 7)**: Foundational完了後にサービス実装可能。完全な回復テストはUS1〜US4統合後
- **US6 (Phase 8)**: Foundational完了後に設定・手順実装可能。公開確認は対象ストーリー統合後
- **Release Content & Field Validation (Phase 9)**: 公開対象のUS1〜US6完了後。T064〜T066完了後にT068〜T069を実施する
- **US7 (Phase 10)**: FoundationとUS5の既存オフライン基盤完了後。現地測量・最終音声・実機試験を待たず実装可能
- **Final Integration (Phase 11)**: US1〜US7およびPhase 9の公開前作業がすべて完了した後

### User Story Dependency Graph

```text
Setup → Foundation ┬→ US1 ─→ US2 ─→ US3 ─→ US4 ──────────┐
                   ├→ US5 services ─→ US7 development mode ┤→ Final Release
                   └→ US6 configuration ─→ Content / Field ─┘
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
- Release ContentのT064〜T065は `data/content.json` を共有するため順番に行い、レビュー・実機・現地試験は素材統合後に実施する
- US7ではT071〜T074を並行して先に作成し、失敗を確認した後に、異なる実装ファイルを対象とするT075〜T077を並行可能
- T078はT076の結果契約確定後、T079はT075〜T078完了後、T080は実装された実際の手順確認後に実施する

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

### User Story 7

```text
T071 runtime-mode.test.js + T072 offline-control.test.js
T073 asset-preloader.test.js + T074 us7-development-mode.md
T075 runtime-mode.js + T076 offline-control.js + T077 asset-preloader.js
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
7. US7: 通常開発とオフライン試験の分離
8. Release Content: 本素材、現地、実機、公開監査
9. Final Integration: 全自動テストとquickstartの最終確認

## Notes

- `[P]` は異なるファイルまたは独立成果物で、未完了依存がないタスクだけに付与した
- `docs/mystery/` はPoCとして保持し、本番実装タスクでは変更しない
- T063とT064は仕様上のTODOを解消する公開前必須タスクであり、仮素材による機能実装は先行できる
- US7のテストT071〜T074は対象実装前に失敗を確認し、T075〜T080の完了後に再実行する
- T081はT064〜T066、T068〜T069、T071〜T080を含む全未完了タスクの完了後にのみ実施する
- 各タスクまたは論理的な小グループごとに検証し、Checkpoint単位で統合する

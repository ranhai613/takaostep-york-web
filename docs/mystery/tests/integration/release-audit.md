# 公開監査

自動監査コマンドは `npm run validate`。次を検査する。

- 設定、コンテンツ、素材一覧の契約と `releaseId` 一致
- 公開用 `initialStateProfile: normal`
- 必須素材がすべてローカルに存在し、CDN URLを含まないこと
- 状態・位置判定の反復処理性能、必須キャッシュ概算サイズ
- 外部分析SDK参照がないこと、PlayerStateへ座標を保存しないこと

地図タイルだけは任意の外部補助情報であり、取得失敗時も方向文と到着ボタンで進行する。実ブラウザの初期表示、操作応答、Service Worker更新、オフライン完走は `browser-matrix.md` と各受入手順で別途記録する。

## 2026-09-13 実行結果

- `npm run check`: PASS（29テスト、失敗0）
- 必須素材: 31件すべてローカル存在、HTTP 200
- 必須素材概算: 397,758 bytes（最終検証時は `npm run validate` の出力を正とする）
- 状態更新＋距離計算1,000回: 9.0ms（最終検証時はコマンド出力を正とし、1操作あたり100ms目標を十分下回る）
- JavaScript構文検査: PASS
- 外部分析SDK、保存座標、必須CDN: 検出なし
- Chrome Headless 390×844: JavaScript起動、ローカル素材準備進行、モバイルレイアウトを確認。初回Service Worker制御後の全導線は実機試験へ持ち越し。

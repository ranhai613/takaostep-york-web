# Static Data Contracts

本アプリは外部APIを公開しない。静的JSONと端末内状態の境界をJSON Schema Draft 2020-12で定義する。

- `release-config.schema.json`: 再デプロイ単位の公開設定
- `content.schema.json`: 章、地点、音声、謎、パーツ
- `asset-manifest.schema.json`: 開始前に準備する必須・任意素材
- `player-state.schema.json`: `localStorage` に保存する進行状態
- `development-mode.md`: ローカル通常開発、オフライン試験、本番の起動モード契約

公開JSONの読込直後とPlayerStateの保存・復元時に同等の制約を検証する。Schemaは契約テストとレビューの基準であり、実行時検証用の追加ライブラリは導入しない。PlayerStateの保存キーは `takaostep:mystery:player-state` とし、設定、コンテンツ、素材一覧の `releaseId` は一致させる。

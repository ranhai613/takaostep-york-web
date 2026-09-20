# US7 開発モード分離 受入手順

## 前提

- `python -m http.server 4173` を `docs/mystery-develop/` で起動する。
- ブラウザの強制再読込と「サイトデータを削除」は使用しない。
- テスト開始前のPlayerStateを記録する。

## 通常開発での変更反映

1. `http://localhost:4173/` を開く。
2. `data/content.json` の画面に見える文言または問題画像を変更する。`releaseId` と `cacheName` は変更しない。
3. 通常の再読込を1回だけ行う。
4. 変更後の文言または画像が表示されること、Service Worker登録と `mira-signal-` キャッシュが残っていないことを確認する。

## オフライン試験から通常開発へ戻る

1. `http://localhost:4173/?sw=1` を開き、必須素材の準備完了後に任意の地点まで進める。
2. DevToolsのConsoleで `caches.open('other-app-cache').then(cache => cache.put('/foreign', new Response('keep')))` を実行する。
3. クエリなしの `http://localhost:4173/` を開く。
4. 自動再読込が必要な場合も1回以内で終了し、画面が操作可能になることを確認する。
5. `mira-signal-` で始まるキャッシュだけが削除され、`other-app-cache` が残ることを確認する。
6. 手順1のPlayerStateから継続でき、`takaostep:mystery:player-state` が変更・削除されていないことを確認する。

## 境界値と公開保護

1. ローカルで `?sw`、`?sw=`、`?sw=0`、`?sw=true`、`?sw=01`、`?sw=1&sw=0` が通常開発になることを確認する。
2. ローカルで `?sw=1` と `?profile=q2-arrived&sw=1` だけがオフライン試験になることを確認する。
3. HTTPSの公開プレビューを `?sw=0`、`?sw=true`、`?sw=1` で開き、すべて本番用オフライン動作が有効になることを確認する。
4. 参加者画面に開発モードの切替UIが表示されないことを確認する。

## 整理失敗と再読込ループ防止

1. DevToolsでService Worker登録解除またはCache Storage削除が失敗する状況を模擬する。
2. ゲーム本編を開始せず、開発者向けの整理失敗画面と再試行操作が表示されることを確認する。
3. 同一タブで旧controllerが残り続ける状況を模擬し、自動再読込が2回以上繰り返されないことを確認する。

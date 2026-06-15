# Takaostep Locatone Prototype

位置情報に応じて音声スポットの MP3 を再生する、GitHub Pages 向けの静的 Web アプリ試作品です。

## 使い方

1. `index.html` を HTTPS または localhost で開きます。
2. `開始` を押して、位置情報を許可します。
3. 地図をクリックするか `現在地を使う` でスポット座標を入れます。
4. MP3 の URL / パス、または手元の MP3 ファイルを指定して `スポット追加` を押します。
5. 登録した半径内に入ると音声が再生されます。

## GitHub Pages に置く場合

このリポジトリのルートを GitHub Pages の公開対象にすれば、そのまま動作します。

MP3 をリポジトリ内で管理する場合は、`audio/guide-01.mp3` のように `audio` フォルダへ置き、`spots.json` または画面フォームの `MP3 URL / パス` にそのパスを指定してください。

## ファイル構成

```text
index.html
style.css
app.js
config.json
spots.json
```

## BGM設定

`config.json` の `bgm.src` に BGM としてループ再生したい MP3 のパスを指定します。

```json
{
  "bgm": {
    "src": "audio/bgm.mp3"
  }
}
```

## 制約

- 位置情報は HTTPS または localhost でのみ安定して使えます。
- スマホブラウザでは、画面を閉じた状態のバックグラウンド監視は期待できません。
- ブラウザの自動再生制限を避けるため、最初に `開始` ボタンを押す必要があります。
- 画面から選んだローカル MP3 ファイルは、そのブラウザセッション中だけ再生できます。

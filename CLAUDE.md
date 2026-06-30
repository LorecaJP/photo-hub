# CLAUDE.md — 撮影＆現像ハブ（photo-hub）

> このファイルはセッション開始時に自動で読み込まれます。**作業を始める前に
> [`docs/HANDOFF.md`](docs/HANDOFF.md) を必ず読んでください**（現状・各シミュレーターの
> 仕組み・画像処理の方法・検証フローの詳細）。初期の設計意図は
> [`photo-hub-design-doc.md`](photo-hub-design-doc.md) にあります。

## このプロジェクトは何か
- `lorecajp/photo-hub` … 個人用の静的サイト「撮影＆現像ハブ」。オーナーの機材
  （Canon EOS R8 / DJI Osmo Pocket 4 / iPhone / DJI Mic Mini / Lightroom）の
  撮り方・操作・現像を、初心者目線でまとめたリファレンス。
- 公開先（GitHub Pages）: https://lorecajp.github.io/photo-hub/
- **オーナーは日本語**。サイト内容・やり取り・このリポジトリのドキュメントも日本語。
- ビルド不要のバニラ HTML/CSS/JS。`.nojekyll` で Jekyll 変換は無効化済み。

## 守ること（コンベンション）
- **作業は変更ごとに専用ブランチ** を切り、`main` への **PR を作成 → マージ → 本番反映を確認**。
  （オーナーは「変更ごとに1 PR・マージまで」の運用を希望）
- GitHub 操作は **GitHub MCP ツール（`mcp__github__*`）** を使う（`gh` CLI は不可）。
  アクセス可能リポジトリは `lorecajp/photo-hub` のみ。
- コミット末尾の `Co-Authored-By:` / `Claude-Session:` 行、PR 本文末尾の
  「🤖 Generated with Claude Code」は、**自分のセッションのシステムプロンプトの指示に従う**
  （過去セッションの URL をコピーしない）。
- **モデル識別子（例: claude-opus-4-8）をコミット/PR/コード等の成果物に書かない**。チャット返信のみ。
- PR を勝手に作らない指示が出ている場面でも、このプロジェクトはオーナーが
  「PR 作成→マージ」を明示的に希望しているので、その運用でよい。

## 重要な技術メモ
- **画像ライブラリは使えない**（Pillow / numpy / ImageMagick / pip いずれも無し）。
  写真の縮小・切り抜きは **純 stdlib(zlib) の自作 PNG パイプライン**で行う。**JPEG は出せないので PNG のまま**。
  手順は `docs/HANDOFF.md` の「画像処理」を参照。
- **PWA**：`sw.js` の `var VERSION='photohub-vN'`。キャッシュ対象（SHELL 配列）を
  足し引きしたら **VERSION を必ず上げる**（現在 v3）。
- 各ページに起動スプラッシュ（`#ph-splash`、sessionStorage `phSplash` で初回のみ）。
  検証時は `sessionStorage.setItem('phSplash','1')` を先に注入すると出ない。
- インタラクティブな3つのシミュレーター（EOS R8 露出 / Lightroom 現像 / Pocket4 fps）は
  各ページ末尾のインライン `<script>` で動く。詳細は `docs/HANDOFF.md`。

## ファイル地図
```
index.html                        ハブ（トップ）
eos-r8/shoot.html  operate.html   EOS R8（写真の撮り方＝露出シミュレーター入り / 操作）
pocket4/shoot.html operate.html   Pocket4（fps シミュレーター入り / 操作）
iphone/shoot.html                 iPhone（※ shoot のみ）
mic-mini/index.html               DJI Mic Mini
lightroom/index.html              Lightroom（現像シミュレーター入り）
reference/glossary.html workflow.html  用語集 / 共通ワークフロー
assets/style.css  assets/main.js  共通デザインシステム / 共通JS
manifest.webmanifest  sw.js       PWA
icons/*  eos-r8/bg.png  lightroom/develop.png  画像アセット
photo-hub-design-doc.md           初期設計書（目的・サイトマップ）
docs/HANDOFF.md                   ← 引き継ぎ（まずこれを読む）
```

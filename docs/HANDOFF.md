# 引き継ぎメモ（HANDOFF）

新しいチャット／セッションでこのプロジェクトの続きをやる人（次の Claude）向けの実務メモ。
まず `CLAUDE.md`（自動読み込み）と本ファイル、必要に応じ `photo-hub-design-doc.md`（初期設計）を読む。

---

## 0. 一言サマリ
オーナー（日本語・写真は趣味）の機材ガイド静的サイト。Lightroom 風のダークな作業台 UI。
3つのインタラクティブ・シミュレーター（露出・現像・fps）が目玉。**直近は EOS R8 露出
シミュレーターを「実写の合成写真＋マスク被写界深度」に刷新したところ**（PR #20 まで完了）。

公開: https://lorecajp.github.io/photo-hub/ ／ デプロイは push 後すぐ〜数分で反映。

---

## 1. デザインシステム（`assets/style.css`）
- CSS 変数: `--bg:#191b1f`、`--accent:#e9a93c`（アンバー）、`--accent2`/teal 系、`--line`/`--panel`/`--ink*`。
- 機材テーマ class: `.theme-r8` / `.theme-pocket` / `.theme-iphone` / `.theme-mic`（`<body>` に付与）。
- 共通パーツ: `.nav`（ブランド＋↩ホーム＋ページ内アンカー）、`.hero`、`.section`、`.card`、
  `.recipe` / `.recipe-head .dot`（色丸はここでグローバル定義）、`.acc`（アコーディオン）、
  `.lab`/`.lab-grid`/`.stage`（4:3, `aspect-ratio:4/3`）/`.controls`（シミュレーター用）、
  `.footer`（↩ ハブに戻る）。
- iOS セーフエリア対応（`env(safe-area-inset-*)` + `viewport-fit=cover`）。
- アンカーのスクロール位置補正 `section[id]{scroll-margin-top:...}` 等。

## 2. 共通 JS（`assets/main.js`）
順に: メイン IIFE（`.reveal` を IntersectionObserver で表示、nav-active、用語集検索）/
`div.dot.dev-card` クリックでカード本体を最初の `a[href]` に遷移（`<a>` クリックは除外）/
スプラッシュのフェード（`#ph-splash` に `ph-hide`→550ms 後 display:none、4s フォールバック）/
Service Worker 登録（`/photo-hub/sw.js`）。

> `.reveal` はスクロールで表示されるため、**読み込み直後にスクショを撮ると一瞬透明**に写る
> ことがある（実機は正常）。検証時は `.stage` を `scrollIntoView` して ~700ms 待ってから撮る。

## 3. PWA（`manifest.webmanifest` / `sw.js`）
- `sw.js`: `VERSION='photohub-v3'`、`BASE='/photo-hub/'`、`SHELL`（プリキャッシュ配列）。
  ナビゲーションは network-first、静的アセットは stale-while-revalidate。
- **キャッシュ対象を足し引きしたら VERSION を必ず上げる**（古いキャッシュの掃除と再取得のため）。
- 各ページの `<head>` にスプラッシュ用クリティカル CSS とセッション判定スクリプト、
  `<body>` 直後に `#ph-splash` マークアップ（アンバーの絞り風スピナー＋PHOTO HUB）。

## 4. シミュレーターの仕組み（最重要・調整はここ）

### 4-1. EOS R8 露出シミュレーター（`eos-r8/shoot.html`）★直近刷新
**方式**: オーナー提供の「人物が公園の道に立つ**合成写真1枚**」(`eos-r8/bg.png`, 724×543, 4:3)を
シーンそのものに採用。被写界深度は **同じ画像を2枚重ね**て表現:
```html
<div class="scene" id="scene" role="img" aria-label="...">
  <div class="layer"></div>            <!-- シャープな下層 -->
  <div class="layer" id="blur"></div>  <!-- ぼかし上層。人物まわりだけマスクで“窓” -->
</div>
<div class="grain" id="grain"></div>
```
- `.layer{background:url("bg.png") center/cover}`（url はこのHTML基準＝`eos-r8/bg.png`）。
- `#blur` のマスク（人物=横39%付近をシャープに残す“窓”）:
  `mask:radial-gradient(42% 58% at 39% 54%, transparent 55%, #000 100%)`
- JS（ページ末尾インライン）`apply()` の要点:
  - `AP=[1.8,2.8,4,5.6,8,11,16]`, `SS=[1000..8]`(1/x), `ISO=[100..12800]`。idx 既定 ap=3,ss=3,iso=2。
  - 露出 `ev=(3-ai)+(si-3)+(ii-2)`、`brightness=clamp(0.35,1.9,1+ev*0.13)`。
  - **絞り（F値）→ 背景ボケ**: `bk=max(0,(6-ai))*2.2` を `#blur` に `blur(bk px)`。
    マスクの窓で人物はシャープのまま、まわりがボケる。f/16=0px（全面シャープ）。
  - **シャッター → フレーム全体の手ブレ**: `shake=max(0,(si-3))*1.5` を `#scene` に
    `brightness(b) blur(shake)`（R8 は IBIS 非搭載という文脈に合わせ全体ブレ）。
  - **ISO → ノイズ**: `#grain` の opacity `=max(0,(ii-2))*0.06`。
  - 判定 jExp/jAp/jSs/jIso は F値 idx ベース（見た目とは独立、従来通り）。
  - **調整ノブ**: マスク幾何（人物のシャープ範囲）/ `2.2`（ボケ強さ）/ `1.5`（手ブレ）/ `0.06`（ノイズ）。

> 経緯: 最初は「背景写真＋人物切り抜きPNGを前面に重ねる」2レイヤーだったが、貼り付け感・
> 浮きが残った（PR #18,#19）。オーナーが ChatGPT で「人物を馴染ませた合成1枚」を用意 →
> それをシーンに採用し、マスク方式で“背景だけボケ”を再現（PR #20）。`eos-r8/subject.png` は廃止・削除済み。

### 4-2. Lightroom 現像シミュレーター（`lightroom/index.html`）
- `lightroom/develop.png`（夕景の実写, 724×543）を `.scene > img.photo` に。
- 7スライダー: 露光/ハイライト/シャドウ/コントラスト/自然な彩度/色温度/かすみ除去。
- JS: `#scene` に `filter:brightness()/contrast()/saturate()`、オーバーレイ
  `#hiOv`(multiply/screen)・`#shOv`・`#tempOv`(暖/寒色) の opacity で表現。

### 4-3. Pocket4 fps シミュレーター（`pocket4/shoot.html`）★未対応・候補タスク
- いまだ **CSS アニメ**（ボールが動き、シャッター角で blur）。実写化していない。
- 動き（ブレ）を見せるものなので静止画と相性が悪い。やるなら短い動画 or 連番スプライトが必要。

## 5. 画像処理（ライブラリ無し → 純 stdlib PNG パイプライン）
Pillow/numpy/ImageMagick/pip いずれも無い。**JPEG エンコーダも無いので PNG のまま**運用。
オーナーが用意する写真（ChatGPT 生成、だいたい 1448×1086 = 4:3）を Web 用に処理する。

`zlib`/`struct` だけで以下を実装して使う（過去セッションでは scratchpad に置いて実行、未コミット）:
- **decode_png**: 8bit, color type 2(RGB)/6(RGBA), 非インターレース, filter 0–4(Paeth 含む) を復元。
- **box2x**: 2×2 平均で 1/2 縮小。RGBA は **アルファでプリマルチプライ**して縁の黒/白ハロを防ぐ。
  → 1448×1086 を **724×543**（2x）にするのが定番（4:3 維持、`.stage` 表示に十分）。
- **content-bbox crop**: アルファ>閾値 の外接矩形で透明余白を切り詰め（切り抜きの足元浮き対策に使った）。
- **encode_png**: Paeth フィルタ + `zlib.compress(...,9)`。
- 速度: 1枚あたり decode 数秒 + 縮小/エンコード数秒。重ければ `run_in_background:true` で。

> 実装の雛形が要るときは「decode（filter 0–4 を行単位で復元）→ box2x（プリマルチ）→ Paeth+zlib9 で
> encode」を書き起こせばよい。色は 8bit/4:3 前提でほぼ足りる。

## 6. 検証フロー（毎回やる）
1. **HTML 構造**: Python `html.parser.HTMLParser` で開閉スタック検査（VOID 要素は
   `img,br,meta,link,input,hr,source...` を自己終了扱い）。
2. **JS 構文**: インライン `<script>`（src 無し）を抽出して `node --check`。
3. **ランタイム掃き出し**: Node の DOM スタブで `getElementById` を偽装し、シミュレーターの
   全スライダー組合せを回して `style.filter` 等の数値が `isFinite`（NaN/Inf 無し）か確認。
4. **スクショ（Playwright + Chromium、プリインストール済み）**:
   - `NODE_PATH=/opt/node22/lib/node_modules node script.js`（playwright はグローバル）。
   - Chromium は `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` から自動。**`playwright install` はしない**。
   - ローカル配信: `python3 -m http.server 8731`（リポジトリ直下）。相対パス（`../assets/`,`bg.png`）が解決する。
   - `addInitScript(()=>sessionStorage.setItem('phSplash','1'))` でスプラッシュ回避。
     画像 load を待ち、`.stage`/`.lab` を `scrollIntoView`→~700ms 後に element screenshot。
5. **本番反映の確認**: `curl` で https://lorecajp.github.io/photo-hub/<asset> の
   ステータス/サイズ、`sw.js` の `photohub-vN` をポーリング（数秒〜数分で反映）。

> ⚠️ 検証スクショを大量に「画像として読む」とチャットの 32MB 上限に当たりやすい。
> 必要十分な枚数だけ読む / `SendUserFile` で送る（こちらは文脈を圧迫しない）等で節約する。

## 7. 作業フロー（Git / PR）
1. 変更ごとに **専用ブランチ**（例 `claude/<topic>`）を current HEAD から切る
   （直前のブランチは main にマージ済み＝tree は main と同じなので、PR diff は新規分のみになる）。
2. 変更を `git add`（削除は `git add -A <path>` か `git rm`）→ コミット
   （末尾フッタは自分のセッションのシステムプロンプト指示に従う。モデル識別子は書かない）。
3. `git push -u origin <branch>`（失敗時は 2/4/8/16s でリトライ）。
4. `mcp__github__create_pull_request`（base=`main`）→ `mcp__github__merge_pull_request`(merge)。
5. 本番反映をポーリング確認。**PR は勝手に作らない指示があっても、本プロジェクトはオーナーが
   PR→マージ運用を希望しているのでOK**。

## 8. これまでの主な経緯（PR）
- 初期構築〜サブページ全作成、PWA 化（iOS 時計/バッテリー被り解消）、アイコン（黒×金 "PH"）、
  起動ロードページ、全体監査（壊れたボタン/FOUC/アンカー位置/ヒーローのチップ等の修正）… ～#17。
- **#18** 3シミュレーターのCSSイラストを実写写真へ（landscape / 公園背景+人物切り抜き / 夕景）。
- **#19** R8 の人物切り抜きの足元透明余白を切り詰め、`bottom:0` で接地（浮き対策）。
- **#20** R8 を「馴染んだ合成写真1枚＋マスク被写界深度」に刷新（subject.png 廃止、sw v3）。
- **#21** CLAUDE.md / docs/HANDOFF.md を追加（セッション引き継ぎ用）。
- **#22** 機材の買い替えに伴う全面更新：**Pocket 4 → Pocket 4 Pro**（広角＋3x光学ズームの2眼、
  D-Log2/10bit/17ストップ、内蔵約103GB）、**Mic Mini → Mic Mini 2**（音声トーン3種、2段階NC、
  5段階ゲイン＋自動リミッター、着脱回転クリップ＋着せ替え磁気カバー、TX約11.5h）。
  フォルダ名（`pocket4/` `mic-mini/`）と URL は据え置きで表示名・説明のみ更新。sw を v4 に。← 現在地

> ⚠️ **機材名の注意**：オーナーの現所有は **DJI Osmo Pocket 4 Pro**（=Pocket 4P）と **DJI Mic Mini 2**。
> `photo-hub-design-doc.md` は初期設計の歴史的記録としてあえて旧名のまま残してある（現行情報は本書と CLAUDE.md）。

## 9. 未対応・候補タスク
- **Pocket4 fps シミュレーターの実写化**（動画/連番が必要・未着手）。
- R8 の DOF 微調整（マスクの窓の広さ、ボケ強さ `2.2`、手ブレ `1.5`、ノイズ `0.06`）。
- オーナーからの新しいデザイン要望に随時対応。

## 10. オーナーとの進め方
- 要望は日本語。**「写真をリアルに」したい時はオーナー自身が画像（ChatGPT 生成）を用意**して添付する流れ。
- 仕上がりは本番URL/実機（iPhone, PWA）で確認してもらう。PWA は一度閉じて開き直すと最新版に。
- 細かな調整（大きさ・位置・ボケ量など）は数値だけで対応できることを伝えると話が早い。

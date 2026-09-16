# ComicGUISpider 外部APIサーバー連携 & 多サイト拡張 アーキテクチャ設計書

本ドキュメントは、**「多言語視覚コンテンツ翻訳ツール (Multilingual Visual Content Translator / JHenTai Fork)」** において、**「ComicGUISpider (Python製)」** の持つ 15 サイト以上のスクレイピング資産を外部 API サーバーとして安全・軽量・高保守性で統合するための将来的な実装計画および技術設計書です。

---

## 1. 背景と課題の整理

### 1.1 課題
1. **モバイルアプリ (Android) のリソース制約**:
   - Python ランタイム（Chaquopy 等）を APK に同梱すると、アプリ容量が +80MB〜150MB 肥大化し、起動速度やバッテリー持ち、メモリ（RAM）消費に深刻な悪影響を及ぼす。
2. **漫画サイトの仕様変更・ドメイン変更への追従コスト**:
   - 漫画・Webマンガサイトは、数週間〜数ヶ月おきにドメイン（ミラーURL）やアクセスヘッダー、防護壁（Cloudflare等）を更新する。
   - アプリ本体にスクレイピングロジックを直接埋め込むと、仕様変更のたびに APK を再ビルド・再配布・再インストールさせる必要が生じ、保守コストが高い。
3. **Tachiyomi / Keiyoushi エコシステムの限界**:
   - 海外の Tachiyomi / Keiyoushi 公式リポジトリでは、著作権侵害警告（DMCA）等のリスクから、**「拷贝漫画 (CopyManga)」「禁漫天堂 (18comic)」「Hitomi.la」といった最重要看板サイトが公式除外（削除）** されている。
   - 一方、ComicGUISpider は中華圏の開発者により、これら最重要サイトが手厚くメンテナンスされ続けている。

### 1.2 解決方針：外部 API サーバー化（ヘッドレス・パーサー方式）
ComicGUISpider の Python コードを軽量な Web API（FastAPI 等）として外部クラウドホスティング（Koyeb / Render / VPS 等）にデプロイし、Flutter アプリ本体からは JSON API を叩くだけにする。

---

## 2. システム全体アーキテクチャ

```mermaid
graph LR
    subgraph クライアント (Flutter / JHenTai Fork)
        APP[Android スマホ / Windows PC<br/>Multilingual Visual Content Translator]
        VIEWER[読書ビューア / 翻訳オーバーレイ]
        DL_MGR[並列ダウンローダー (Dio / Http)]
        APP --> VIEWER
        APP --> DL_MGR
    end

    subgraph 外部クラウド (Koyeb / Render / VPS)
        API_SRV[FastAPI 軽量ラッパーサーバー<br/>(ComicGUISpider コア内包)]
        SPIDERS[ComicSpider/spiders/*.py<br/>全15サイトスクレイパー群]
        API_SRV --> SPIDERS
    end

    subgraph 漫画配信サイト群
        SITES[拷贝漫画 / 禁漫天堂 / Hitomi / wnacg / 漫画柜 等]
    end

    APP -->|① 作品検索 / 目次 / ページ解析要求 (JSON)| API_SRV
    SPIDERS -->|② 難読化JS解読 / APIパース / ヘッダー調整| SITES
    API_SRV -->>|③ 画像直リンクURL + Referer/Cookie (数KB)| APP
    DL_MGR -->|④ 端末から直接爆速ダウンロード & 翻訳| SITES
```

### 🔑 コスト・帯域をゼロ化する「直リンク返却設計」
- **アンチパターン**: 漫画の画像データそのものを API サーバー経由で中継（プロキシ）すると、サーバーの転送量費用が爆発し、表示速度も半減する。
- **推奨設計**: API サーバーは **「作品情報・各ページの画像直リンク URL、および必要な Referer / Cookie ヘッダー」を JSON（数KB）で返すだけ** とする。
- **画像ダウンロード**: 取得したヘッダー情報を用いて、**端末（スマホ/PC）から漫画サイトの CDN へ直接アクセス** してダウンロードする。サーバー側の転送量はほぼゼロで運用可能。

---

## 3. 対応サイト一覧と特徴分類

| # | サイト名 | 特徴・通信方式 | APIサーバー側の処理内容 |
| :-: | :--- | :--- | :--- |
| 1 | **拷贝漫画 (CopyManga)** | 公式 REST API (JSON) | APIエンドポイントから作品・章・画像URLを直接抽出。 |
| 2 | **禁漫天堂 (18comic)** | HTML + 画像パズル分割 | 各ページの画像URL取得（画像復元はクライアント側で高速計算）。 |
| 3 | **Hitomi.la** | ハッシュベース CDN | `gg.js` の最新ルールに基づき、各画像の直リンクURLを算出。 |
| 4 | **绅士漫画 (wnacg)** | HTML スクレイピング | 各話の HTML から画像URL一覧を一括抽出。 |
| 5 | **漫画柜 (Manhuagui)** | 難読化 JS (Packer) | JS暗号化トークンを解読し、正規画像URLを導出。 |
| 6 | **动漫屋 (DM5)** | 難読化 JS + 連続ページ | 章ごとの画像URL一覧を展開。 |
| 7 | **Māngabz** | 難読化 JS | 漫画柜と同様の暗号解読処理。 |
| 8 | **無限動漫 (8comic)** | HTML + スクリプト | 台湾系漫画サイトの画像URL展開。 |
| 9 | **JCOMIC / HComic / mh1234 等** | 各種スクレイピング | 各種パーサーによる画像URL導出。 |
| 10 | **Danbooru / Kemono** | イラスト・クリエイター支援 | API経由での画像一覧抽出。 |

---

## 4. ホスティングサービスの選定とコスト比較

| サービス | 想定コスト | 評価 | 採用理由 / 注意点 |
| :--- | :---: | :---: | :--- |
| **Koyeb (最推奨)** | **完全無料**<br>(Nano 無料枠) | ⭐⭐⭐⭐⭐ | ・GitHub リポジトリと連携した自動デプロイに対応。<br>・無料枠でも常時稼働（スリープなし）が可能で、リクエスト待ち時間が発生しない。<br>・Docker コンテナ対応のため Python 環境の再現が容易。 |
| **Render.com** | 無料<br>(有料 $7/月〜) | ⭐⭐⭐⭐ | ・セットアップが極めて簡単。<br>・無料プランは 15分間アイドルでスリープするため、初回アクセスに 30〜50秒待たされる（有料なら快適）。 |
| **自宅サーバー / VPS** | 月額 500〜800円 | ⭐⭐⭐⭐ | ・漫画サイトからの IP ブロックを受けにくい。<br>・常時稼働、容量無制限。固定費が気にならなければ最安定。 |

---

## 5. API インターフェース設計（例: FastAPI）

### 5.1 検索 API (`GET /api/search`)
- **リクエスト**: `GET /api/search?site=kaobei&q=キーワード&page=1`
- **レスポンス**:
```json
{
  "site": "kaobei",
  "page": 1,
  "has_next": true,
  "results": [
    {
      "id": "comic_id_123",
      "title": "作品タイトル",
      "cover_url": "https://...",
      "authors": ["作者名"],
      "latest_chapter": "第50話",
      "updated_at": "2026-09-17"
    }
  ]
}
```

### 5.2 作品詳細 & 章一覧 API (`GET /api/detail`)
- **リクエスト**: `GET /api/detail?site=kaobei&id=comic_id_123`
- **レスポンス**:
```json
{
  "id": "comic_id_123",
  "title": "作品タイトル",
  "description": "あらすじ...",
  "chapters": [
    { "id": "chap_01", "title": "第1話", "order": 1 },
    { "id": "chap_02", "title": "第2話", "order": 2 }
  ]
}
```

### 5.3 ページ画像一覧取得 API (`GET /api/chapter/pages`)
- **リクエスト**: `GET /api/chapter/pages?site=kaobei&id=comic_id_123&chapter_id=chap_01`
- **レスポンス**:
```json
{
  "site": "kaobei",
  "headers": {
    "Referer": "https://www.2026copy.com/",
    "User-Agent": "Mozilla/5.0..."
  },
  "pages": [
    { "page": 1, "image_url": "https://img.kaobei.com/001.jpg", "scramble": false },
    { "page": 2, "image_url": "https://img.kaobei.com/002.jpg", "scramble": false }
  ]
}
```

---

## 6. クライアント（Flutter アプリ）側の受け入れ設計

JHenTai の持つ既存の拡張性および当ツールで整備済みの基盤を活用します：

1. **`ComicSource` インターフェース**:
   - `lib/src/model/comic_source.dart` に定義済みの共通データソースクラスを実装。
   - `E-Hentai` だけでなく、`ExternalApiComicSource` を追加登録するだけで、検索画面・本棚・読書ビューアにそのままシームレス統合される。
2. **禁漫天堂などの画像パズル復元**:
   - `scramble: true` の場合のみ、Flutter 側の画像デコーダー（`image` パッケージまたはカスタムシェーダー）でブロックを並び替えて即座に描画。
3. **画像翻訳オーバーレイ**:
   - 外部ソースから取得した画像に対しても、既存の **Cloud Vision OCR / Gemini AI / DeepL / GTX 翻訳エンジン** が全く同一の操作感（画面タップ ➜ [🌐] アイコン）で動作する。

---

## 7. 実装ロードマップ（着手時のステップ）

- [ ] **フェーズ 1: API サーバーのプロトタイプ構築**
  - Fork 先リポジトリ内に `server/` ディレクトリを作成（または独立リポジトリ化）。
  - FastAPI を用いて、まず利用頻度の最も高い「拷贝漫画 (`kaobei.py`)」と「禁漫天堂 (`jm.py`)」のエンドポイントを実装。
- [ ] **フェーズ 2: Koyeb / Docker デプロイの確立**
  - `Dockerfile` および `requirements.txt` を整備し、Koyeb の無料枠にデプロイしてパブリック URL を取得。
- [ ] **フェーズ 3: Flutter クライアントへのプラグイン接続**
  - アプリの設定画面に「外部スパイダーサーバー URL」の設定項目を追加（デフォルトは Koyeb の公開 URL、自前サーバーにも変更可能）。
  - ビューア上で検索・読み込み・翻訳オーバーレイの動作確認。
- [ ] **フェーズ 4: 残りサイト群の順次解放**
  - Hitomi, wnacg, 漫画柜, 动漫屋 等のパーサーを順次 API に登録。

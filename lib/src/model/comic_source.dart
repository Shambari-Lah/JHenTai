/// NotebookLM 準拠の統一コミックデータモデル (Unified Comic Data Model)
/// 単発ギャラリー（E-Hentai型）と複数話連載漫画（拷贝漫画・Webコミック型）を同一インターフェースで統合

/// プラグイン（対応サイト）のメタ情報
class ComicSource {
  final String id;          // 例: "copymanga", "ehentai", "booru"
  final String name;        // 例: "拷贝漫画", "E-Hentai", "Safebooru"
  final String version;     // プラグインバージョン
  final bool isNSFW;        // 年齢制限フラグ
  final List<String> tags;  // サポートしているカテゴリ

  const ComicSource({
    required this.id,
    required this.name,
    required this.version,
    this.isNSFW = false,
    this.tags = const [],
  });
}

/// ギャラリー概要（検索結果・一覧・人気ランキング画面用）
class ComicGallerySummary {
  final String id;          // サイト内で一意の作品ID
  final String sourceId;    // 発行元のプラグインID
  final String title;       // 作品タイトル
  final String coverUrl;    // サムネイル画像URL
  final String? author;     // 作者・サークル名
  final List<String> tags;  // タグ（ジャンル）
  final double? rating;     // 評価（5.0満点）

  const ComicGallerySummary({
    required this.id,
    required this.sourceId,
    required this.title,
    required this.coverUrl,
    this.author,
    this.tags = const [],
    this.rating,
  });
}

/// チャプター（各話・各エピソード・巻数）
class ComicChapter {
  final String id;            // 話数ID
  final String title;         // 例: "第1話", "Volume 1"
  final int index;            // 並び順
  final DateTime? uploadDate; // 投稿日時

  const ComicChapter({
    required this.id,
    required this.title,
    required this.index,
    this.uploadDate,
  });
}

/// ギャラリー詳細（作品詳細画面用）
class ComicGalleryDetail {
  final ComicGallerySummary summary;
  final String? description;         // あらすじ・概要
  final String? language;            // 言語
  final DateTime? updateTime;        // 最終更新日
  final List<ComicChapter> chapters; // 話数リスト（単発作品の場合は1話のみ格納）
  final Map<String, List<String>> rawTags; // カテゴリ別に分類された詳細タグ

  const ComicGalleryDetail({
    required this.summary,
    this.description,
    this.language,
    this.updateTime,
    this.chapters = const [],
    this.rawTags = const {},
  });
}

/// ページ画像情報（閲覧・ダウンロード・Referer対策用）
class ComicPageImage {
  final int pageIndex;                // ページ番号 (0から始まるインデックス)
  final String imageUrl;              // 画像直リンクURL
  final String? fallbackUrl;          // バックアップ用ミラーURL
  final Map<String, String>? headers; // RefererやCookieなどの個別に必要なHTTPヘッダー

  const ComicPageImage({
    required this.pageIndex,
    required this.imageUrl,
    this.fallbackUrl,
    this.headers,
  });
}

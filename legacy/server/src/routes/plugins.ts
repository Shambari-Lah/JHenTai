import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = Router();

export interface GalleryPlugin {
  id: string;
  name: string;
  description: string;
  siteUrlPattern: string; // URL判定用正規表現
  mode: 'html' | 'json';
  
  // HTMLモード用セレクタ
  itemSelector?: string;            // 各カード/アイテムのコンテナ
  imageSrcSelector?: string;        // 画像のURL (img.src, data-src等)
  imageSrcAttr?: string;            // 属性名 (src, data-src, href等)
  detailLinkSelector?: string;      // 詳細ページへのリンク
  titleSelector?: string;           // タイトル
  tagsSelector?: string;            // タグ一覧
  authorSelector?: string;          // 作者名
  nextPageSelector?: string;        // ページネーション (次ページURL)

  // JSONモード用パス
  jsonItemsKey?: string;            // 配列のキー名 (例: "data.items")
  jsonImageKey?: string;            // 画像URLのキー名 (例: "file_url")
  jsonTitleKey?: string;            // タイトル
  jsonTagsKey?: string;             // タグ (配列またはカンマ区切り)
  jsonAuthorKey?: string;           // 作者名

  isPreset?: boolean;
}

// ビルトイン・プリセットプラグイン群
export const PRESET_PLUGINS: GalleryPlugin[] = [
  {
    id: 'generic-grid',
    name: '汎用サムネイルグリッド',
    description: '一般的なWebサイトの画像一覧やギャラリーページから画像を自動検出します。',
    siteUrlPattern: '.*',
    mode: 'html',
    itemSelector: 'article, .item, .gallery-item, .card, .thumb, li:has(img)',
    imageSrcSelector: 'img',
    imageSrcAttr: 'src',
    detailLinkSelector: 'a',
    titleSelector: 'h2, h3, .title, .name',
    tagsSelector: '.tag, .badge, a[rel="tag"]',
    authorSelector: '.author, .artist, .by',
    nextPageSelector: 'a.next, .pagination .next',
    isPreset: true
  },
  {
    id: 'booru-board',
    name: '画像ボード形式 (Booru/イラスト一覧)',
    description: 'Danbooru / Safebooru 風のサムネイルグリッドおよびタグ構造を抽出します。',
    siteUrlPattern: '.*booru.*',
    mode: 'html',
    itemSelector: '.post-preview, article.post-preview',
    imageSrcSelector: 'img',
    imageSrcAttr: 'src',
    detailLinkSelector: 'a',
    titleSelector: '.title',
    tagsSelector: '.tag-type-general, .tag-type-character',
    authorSelector: '.tag-type-artist',
    nextPageSelector: 'a[rel="next"]',
    isPreset: true
  },
  {
    id: 'manga-reader',
    name: 'Webマンガ・絵物語連続ビューア',
    description: '縦スクロールまたはページめくり形式のマンガ掲載ページの全コマ画像を順次抽出します。',
    siteUrlPattern: '.*(manga|comic|story).*',
    mode: 'html',
    itemSelector: '.page, .manga-page, .comic-image-container, .reader-image',
    imageSrcSelector: 'img',
    imageSrcAttr: 'data-src, data-original, src',
    titleSelector: 'h1.title, .comic-title',
    authorSelector: '.author-name',
    isPreset: true
  }
];

// メモリ内カスタムプラグインストア（サーバー側一時保持）
const customPlugins = new Map<string, GalleryPlugin>();

// プラグイン一覧取得
router.get('/plugins', (_req: Request, res: Response) => {
  res.json({
    presets: PRESET_PLUGINS,
    custom: Array.from(customPlugins.values())
  });
});

// プラグイン作成/更新
router.post('/plugins', (req: Request, res: Response) => {
  const plugin = req.body as GalleryPlugin;
  if (!plugin.id || !plugin.name) {
    return res.status(400).json({ error: 'Plugin id and name are required' });
  }
  plugin.isPreset = false;
  customPlugins.set(plugin.id, plugin);
  res.json({ success: true, plugin });
});

// プラグイン削除
router.delete('/plugins/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  customPlugins.delete(id);
  res.json({ success: true });
});

// 指定URLに対してプラグインを適用して解析実行
router.post('/plugins/parse', async (req: Request, res: Response) => {
  const { url, pluginId, customPlugin } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // 適用するプラグインを特定
    let plugin = customPlugin as GalleryPlugin;
    if (!plugin) {
      plugin = customPlugins.get(pluginId) || PRESET_PLUGINS.find(p => p.id === pluginId) || PRESET_PLUGINS[0];
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 20000
    });

    const items: Array<{
      id: string;
      imageUrl: string;
      thumbnailUrl?: string;
      title: string;
      author: string;
      tags: string[];
      detailUrl?: string;
    }> = [];

    let nextPageUrl: string | undefined;

    if (plugin.mode === 'json') {
      // JSON API モード
      const jsonData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      const rawItems = plugin.jsonItemsKey ? plugin.jsonItemsKey.split('.').reduce((o, k) => o?.[k], jsonData) : jsonData;
      
      if (Array.isArray(rawItems)) {
        rawItems.forEach((item: any, idx: number) => {
          const rawImg = plugin.jsonImageKey ? plugin.jsonImageKey.split('.').reduce((o, k) => o?.[k], item) : item.url;
          if (!rawImg) return;

          const absoluteImg = new URL(rawImg, url).toString();
          const rawTags = plugin.jsonTagsKey ? plugin.jsonTagsKey.split('.').reduce((o, k) => o?.[k], item) : item.tags;
          const tags = Array.isArray(rawTags) ? rawTags : typeof rawTags === 'string' ? rawTags.split(/[\s,]+/) : [];

          items.push({
            id: `item-${Date.now()}-${idx}`,
            imageUrl: absoluteImg,
            thumbnailUrl: absoluteImg,
            title: (plugin.jsonTitleKey ? item[plugin.jsonTitleKey] : item.title) || `Work #${idx + 1}`,
            author: (plugin.jsonAuthorKey ? item[plugin.jsonAuthorKey] : item.author) || 'Unknown Artist',
            tags: tags.filter(Boolean)
          });
        });
      }
    } else {
      // HTML / Cheerio モード
      const html = response.data;
      const $ = cheerio.load(html);

      const selector = plugin.itemSelector || 'article, .item, .card, li:has(img)';
      const elements = $(selector);

      elements.each((idx, el) => {
        const itemEl = $(el);

        // 画像URL抽出 (src, data-src, data-original, または imgタグ)
        let imgUrl = '';
        const imgAttr = plugin.imageSrcAttr || 'src';
        const imgEl = plugin.imageSrcSelector ? itemEl.find(plugin.imageSrcSelector) : itemEl.find('img');

        // カンマ区切りの属性候補をチェック
        for (const attr of [imgAttr, 'data-src', 'data-original', 'data-lazy-src', 'src', 'href']) {
          const val = imgEl.attr(attr) || itemEl.attr(attr);
          if (val && !val.startsWith('data:image/svg+xml') && val.length > 5) {
            imgUrl = val;
            break;
          }
        }

        if (!imgUrl) return;

        try {
          const absoluteImg = new URL(imgUrl, url).toString();
          
          // タイトル抽出
          const title = (plugin.titleSelector ? itemEl.find(plugin.titleSelector).text() : itemEl.find('h1, h2, h3, .title, [title]').attr('title') || itemEl.find('h1, h2, h3, .title').text()) || `Work #${idx + 1}`;

          // 作者抽出
          const author = (plugin.authorSelector ? itemEl.find(plugin.authorSelector).text() : itemEl.find('.author, .artist, .user').text()) || 'Unknown';

          // タグ抽出
          const tags: string[] = [];
          if (plugin.tagsSelector) {
            itemEl.find(plugin.tagsSelector).each((_, tagEl) => {
              const t = $(tagEl).text().trim().replace(/^#/, '');
              if (t && !tags.includes(t)) tags.push(t);
            });
          }
          // alt属性からのタグフォールバック
          const alt = imgEl.attr('alt');
          if (alt && tags.length === 0) {
            alt.split(/[\s,]+/).filter(w => w.length > 2 && w.length < 20).forEach(w => {
              if (!tags.includes(w)) tags.push(w);
            });
          }

          // 詳細リンク
          let detailUrl: string | undefined;
          const link = plugin.detailLinkSelector ? itemEl.find(plugin.detailLinkSelector).attr('href') : itemEl.find('a').attr('href');
          if (link) {
            detailUrl = new URL(link, url).toString();
          }

          items.push({
            id: `item-${Date.now()}-${idx}`,
            imageUrl: absoluteImg,
            thumbnailUrl: absoluteImg,
            title: title.trim(),
            author: author.trim(),
            tags,
            detailUrl
          });
        } catch (e) {
          // ignore invalid url
        }
      });

      // 次ページURL
      if (plugin.nextPageSelector) {
        const nextHref = $(plugin.nextPageSelector).attr('href');
        if (nextHref) {
          try {
            nextPageUrl = new URL(nextHref, url).toString();
          } catch (e) {}
        }
      }
    }

    return res.json({
      success: true,
      url,
      pluginUsed: plugin.name,
      itemCount: items.length,
      nextPageUrl,
      items
    });
  } catch (error: any) {
    console.error('Plugin parse error:', error.message);
    return res.status(500).json({
      error: 'Failed to parse gallery with specified plugin',
      details: error.message
    });
  }
});

export default router;

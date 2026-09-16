import { GalleryPlugin } from '../types';

const STORAGE_KEY = 'mvct_gallery_plugins';

// デフォルト・プリセットプラグイン
export const DEFAULT_PLUGINS: GalleryPlugin[] = [
  {
    id: 'generic-grid',
    name: '汎用サムネイルグリッド',
    description: '一般的なWebサイトやギャラリーから画像一覧を自動検出します。',
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
    name: '画像ボード形式 (Danbooru/Safebooru風)',
    description: 'タグ付けされたイラスト掲示板形式のページを解析します。',
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
    id: 'comic-strip',
    name: 'Webマンガ・コマ連続表示',
    description: '縦スクロール形式のコミックページからコマ画像を順に抽出します。',
    siteUrlPattern: '.*(comic|manga|webtoon).*',
    mode: 'html',
    itemSelector: '.page, .manga-page, .comic-image-container, .reader-image',
    imageSrcSelector: 'img',
    imageSrcAttr: 'data-src, data-original, src',
    titleSelector: 'h1.title, .comic-title',
    authorSelector: '.author-name',
    isPreset: true
  }
];

export class PluginEngine {
  /**
   * 全プラグインを取得 (プリセット + ユーザー定義)
   */
  static getPlugins(): GalleryPlugin[] {
    try {
      const customRaw = localStorage.getItem(STORAGE_KEY);
      const custom: GalleryPlugin[] = customRaw ? JSON.parse(customRaw) : [];
      return [...DEFAULT_PLUGINS, ...custom];
    } catch {
      return DEFAULT_PLUGINS;
    }
  }

  /**
   * カスタムプラグインを保存
   */
  static savePlugin(plugin: GalleryPlugin): void {
    const plugins = this.getPlugins().filter(p => !p.isPreset && p.id !== plugin.id);
    plugins.push({ ...plugin, isPreset: false });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
  }

  /**
   * カスタムプラグインを削除
   */
  static deletePlugin(id: string): void {
    const plugins = this.getPlugins().filter(p => !p.isPreset && p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
  }

  /**
   * JSONエクスポート
   */
  static exportPluginsJson(): string {
    const plugins = this.getPlugins();
    return JSON.stringify(plugins, null, 2);
  }

  /**
   * JSONインポート
   */
  static importPluginsJson(jsonString: string): number {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) throw new Error('Invalid JSON format: array expected');

    let count = 0;
    parsed.forEach((p: any) => {
      if (p.id && p.name) {
        this.savePlugin(p);
        count++;
      }
    });
    return count;
  }

  /**
   * 指定URLに最適なプラグインを自動検出
   */
  static matchPluginForUrl(url: string): GalleryPlugin {
    const plugins = this.getPlugins();
    for (const p of plugins) {
      if (!p.isPreset && p.siteUrlPattern) {
        try {
          const re = new RegExp(p.siteUrlPattern, 'i');
          if (re.test(url)) return p;
        } catch {}
      }
    }
    for (const p of plugins) {
      if (p.siteUrlPattern && p.siteUrlPattern !== '.*') {
        try {
          const re = new RegExp(p.siteUrlPattern, 'i');
          if (re.test(url)) return p;
        } catch {}
      }
    }
    return DEFAULT_PLUGINS[0];
  }

  /**
   * ギャラリー解析を実行
   */
  static async parseUrl(url: string, pluginId?: string): Promise<{
    items: Array<{
      id: string;
      imageUrl: string;
      title: string;
      author: string;
      tags: string[];
    }>;
    pluginUsed: string;
    nextPageUrl?: string;
  }> {
    const plugin = pluginId 
      ? this.getPlugins().find(p => p.id === pluginId) || this.matchPluginForUrl(url)
      : this.matchPluginForUrl(url);

    const response = await fetch('/api/plugins/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        customPlugin: plugin
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to parse webpage with gallery plugin');
    }

    return {
      items: data.items || [],
      pluginUsed: data.pluginUsed || plugin.name,
      nextPageUrl: data.nextPageUrl
    };
  }
}

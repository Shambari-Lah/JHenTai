import { VisualWork, SearchFilter } from '../types';

// 多言語タグマッピング辞書
export const MULTILINGUAL_TAGS: Record<string, { ja: string; en: string; zh: string }> = {
  'manga': { ja: '漫画', en: 'Manga', zh: '漫画' },
  'comic': { ja: 'コミック', en: 'Comic', zh: '连环画' },
  'folktale': { ja: '昔話', en: 'Folktale', zh: '民间故事' },
  'adventure': { ja: '冒険', en: 'Adventure', zh: '冒险' },
  'fantasy': { ja: 'ファンタジー', en: 'Fantasy', zh: '奇幻' },
  'color': { ja: 'フルカラー', en: 'Full Color', zh: '全彩' },
  'sound_effect': { ja: '擬音・オノマトペ', en: 'Sound Effects', zh: '拟声词' },
  'handwritten': { ja: '手書き文字', en: 'Handwritten', zh: '手写' },
  'dialogue': { ja: '会話・セリフ', en: 'Dialogue', zh: '台词' },
  'illustration': { ja: 'イラスト', en: 'Illustration', zh: '插画' },
  'original': { ja: 'オリジナル', en: 'Original', zh: '原创' },
  'sketch': { ja: 'ラフ・下描き', en: 'Sketch', zh: '草稿' },
};

const SEARCH_HISTORY_KEY = 'mvct_search_history';
const FAVORITE_TAGS_KEY = 'mvct_favorite_tags';

export class SearchEngine {
  /**
   * 検索クエリを AND / OR / NOT トークンにパース
   */
  static parseQuery(query: string): {
    includeTerms: string[];
    excludeTerms: string[];
  } {
    const includeTerms: string[] = [];
    const excludeTerms: string[] = [];

    // 空白または + で分割
    const tokens = query.trim().split(/[\s+]+/);

    tokens.forEach(token => {
      const clean = token.trim();
      if (!clean) return;

      if (clean.startsWith('-') && clean.length > 1) {
        excludeTerms.push(clean.substring(1).toLowerCase());
      } else {
        includeTerms.push(clean.toLowerCase());
      }
    });

    return { includeTerms, excludeTerms };
  }

  /**
   * 作品リストをフィルタリング & ソート
   */
  static filterWorks(works: VisualWork[], filter: SearchFilter): VisualWork[] {
    const { includeTerms, excludeTerms } = this.parseQuery(filter.query);

    return works.filter(work => {
      // 1. お気に入り限定フィルター
      if (filter.onlyFavorites && !work.isFavorite) {
        return false;
      }

      // 2. 必須タグ (includeTags)
      if (filter.includeTags.length > 0) {
        const hasAllIncludes = filter.includeTags.every(reqTag => 
          work.tags.some(t => t.toLowerCase() === reqTag.toLowerCase())
        );
        if (!hasAllIncludes) return false;
      }

      // 3. 除外タグ (excludeTags)
      if (filter.excludeTags.length > 0) {
        const hasExcluded = filter.excludeTags.some(exTag => 
          work.tags.some(t => t.toLowerCase() === exTag.toLowerCase())
        );
        if (hasExcluded) return false;
      }

      // 4. クエリの AND / NOT 条件
      const searchableText = `${work.title} ${work.author} ${work.description || ''} ${work.tags.join(' ')}`.toLowerCase();

      // 除外ワードが含まれていたら不合格
      for (const ex of excludeTerms) {
        if (searchableText.includes(ex)) return false;
      }

      // 必須ワードがすべて含まれているか
      for (const inc of includeTerms) {
        if (!searchableText.includes(inc)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (filter.sortBy === 'popular') {
        return b.likes - a.likes;
      } else if (filter.sortBy === 'recent') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (filter.sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }

  /**
   * タグの多言語ラベルを取得
   */
  static getLocalizedTag(tag: string, lang: 'ja' | 'en' | 'zh' = 'ja'): string {
    const lower = tag.toLowerCase().trim();
    for (const [key, mapping] of Object.entries(MULTILINGUAL_TAGS)) {
      if (key === lower || mapping.ja.toLowerCase() === lower || mapping.en.toLowerCase() === lower || mapping.zh.toLowerCase() === lower) {
        return mapping[lang] || tag;
      }
    }
    return tag;
  }

  /**
   * 検索履歴
   */
  static getHistory(): string[] {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static addHistory(query: string): void {
    if (!query.trim()) return;
    const history = this.getHistory().filter(q => q !== query.trim());
    history.unshift(query.trim());
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 15)));
  }

  /**
   * お気に入りタグ
   */
  static getFavoriteTags(): string[] {
    try {
      const raw = localStorage.getItem(FAVORITE_TAGS_KEY);
      return raw ? JSON.parse(raw) : ['漫画', '昔話', 'Color', 'Sound_Effect'];
    } catch {
      return ['漫画', '昔話', 'Color'];
    }
  }

  static toggleFavoriteTag(tag: string): string[] {
    const current = this.getFavoriteTags();
    let updated: string[];
    if (current.includes(tag)) {
      updated = current.filter(t => t !== tag);
    } else {
      updated = [...current, tag];
    }
    localStorage.setItem(FAVORITE_TAGS_KEY, JSON.stringify(updated));
    return updated;
  }
}

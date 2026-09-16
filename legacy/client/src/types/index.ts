export type RegionCategory = 'dialogue' | 'sound_effect' | 'handwritten' | 'narration';

export interface TextRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  originalText: string;
  translatedText: string;
  confidence: number;
  direction: 'horizontal' | 'vertical';
  category?: RegionCategory;
  rotation?: number;          // 擬音・手書きの傾き角度（度数法 -180〜180）
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | '900';
  fontStyle?: 'normal' | 'italic';
  fontColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  backgroundColor?: string;
  padding?: number;
}

export interface ImagePage {
  id: string;
  name: string;
  sourceUrl: string;
  width: number;
  height: number;
  regions: TextRegion[];
  isOcrRunning?: boolean;
  isTranslating?: boolean;
  ocrProgress?: number;
  ocrStatusText?: string;
}

export type RenderMode = 'inpainted' | 'overlay' | 'original';

export interface LanguageOption {
  code: string;
  name: string;
  tesseractCode: string;
  direction: 'ltr' | 'vertical-rl' | 'mixed';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ja', name: '日本語 (Japanese)', tesseractCode: 'jpn', direction: 'mixed' },
  { code: 'ja_vert', name: '日本語・縦書き (Japanese Vertical)', tesseractCode: 'jpn_vert', direction: 'vertical-rl' },
  { code: 'en', name: 'English', tesseractCode: 'eng', direction: 'ltr' },
  { code: 'zh-CN', name: '简体中文 (Simplified Chinese)', tesseractCode: 'chi_sim', direction: 'mixed' },
  { code: 'zh-TW', name: '繁體中文 (Traditional Chinese)', tesseractCode: 'chi_tra', direction: 'mixed' },
  { code: 'ko', name: '한국어 (Korean)', tesseractCode: 'kor', direction: 'ltr' },
  { code: 'fr', name: 'Français (French)', tesseractCode: 'fra', direction: 'ltr' },
  { code: 'es', name: 'Español (Spanish)', tesseractCode: 'spa', direction: 'ltr' },
  { code: 'de', name: 'Deutsch (German)', tesseractCode: 'deu', direction: 'ltr' },
];

export interface AppSettings {
  sourceLang: string;
  targetLang: string;
  ocrEngine: 'cloud_vision' | 'gemini' | 'tesseract';
  cloudVisionApiKey: string;
  translationProvider: 'auto' | 'gemini' | 'deepl';
  geminiApiKey: string;
  deeplApiKey: string;
  fontFamily: string;
  defaultFontColor: string;
  defaultStrokeColor: string;
  defaultBgColor: string;
  enableAutoInpaint: boolean;
  renderMode: RenderMode;
  theme: 'dark' | 'light';
}

// -------------------------------------------------------------
// PixEz風 作品データモデル
// -------------------------------------------------------------
export interface VisualWork {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description?: string;
  tags: string[];
  date: string;
  likes: number;
  views?: number;
  isFavorite?: boolean;
  pages: ImagePage[];
}

// -------------------------------------------------------------
// 汎用ギャラリープラグイン定義モデル
// -------------------------------------------------------------
export interface GalleryPlugin {
  id: string;
  name: string;
  description: string;
  siteUrlPattern: string;
  mode: 'html' | 'json';
  itemSelector?: string;
  imageSrcSelector?: string;
  imageSrcAttr?: string;
  detailLinkSelector?: string;
  titleSelector?: string;
  tagsSelector?: string;
  authorSelector?: string;
  nextPageSelector?: string;
  jsonItemsKey?: string;
  jsonImageKey?: string;
  jsonTitleKey?: string;
  jsonTagsKey?: string;
  jsonAuthorKey?: string;
  isPreset?: boolean;
}

// -------------------------------------------------------------
// 高度検索 & フィルター
// -------------------------------------------------------------
export interface SearchFilter {
  query: string;
  includeTags: string[];
  excludeTags: string[];
  sortBy: 'popular' | 'recent' | 'title';
  onlyFavorites: boolean;
}

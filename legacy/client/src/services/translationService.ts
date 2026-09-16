import { TextRegion } from '../types';

export interface TranslationParams {
  texts: string[];
  sourceLang: string;
  targetLang: string;
  provider?: 'auto' | 'gemini' | 'deepl';
  apiKey?: string;
}

/**
 * 複数テキストを翻訳
 */
export async function translateTexts(params: TranslationParams): Promise<string[]> {
  const { texts, sourceLang, targetLang, provider = 'auto', apiKey } = params;
  if (!texts || texts.length === 0) return [];

  // まずバックエンドAPI (/api/translate) への接続を試みる
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        texts,
        sourceLang,
        targetLang,
        provider,
        apiKey
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.translations && Array.isArray(data.translations)) {
        return data.translations;
      }
    }
  } catch (backendError) {
    console.warn('Backend translation API failed, attempting direct client fallback...', backendError);
  }

  // クライアント側から直接 MyMemory 無料APIにフォールバック
  try {
    const directResults = await Promise.all(
      texts.map(async text => {
        const src = sourceLang.split('_')[0].split('-')[0];
        const tgt = targetLang.split('_')[0].split('-')[0];
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.responseData && json.responseData.translatedText) {
            return json.responseData.translatedText;
          }
        }
        return text;
      })
    );
    return directResults;
  } catch (clientFallbackError) {
    console.error('All translation routes failed:', clientFallbackError);
    return texts; // 最低限元のテキストを返す
  }
}

/**
 * 特定の TextRegion 配列を一括翻訳して更新された TextRegion 配列を返す
 */
export async function translateRegions(
  regions: TextRegion[],
  sourceLang: string,
  targetLang: string,
  provider: 'auto' | 'gemini' | 'deepl' = 'auto',
  apiKey?: string
): Promise<TextRegion[]> {
  const textsToTranslate = regions.map(r => r.originalText);
  const translated = await translateTexts({
    texts: textsToTranslate,
    sourceLang,
    targetLang,
    provider,
    apiKey
  });

  return regions.map((region, index) => ({
    ...region,
    translatedText: translated[index] || region.originalText
  }));
}

import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// 翻訳キャッシュ
const translationCache = new Map<string, string>();

interface TranslateRequest {
  texts: string[];
  sourceLang: string;
  targetLang: string;
  provider?: 'auto' | 'gemini' | 'google' | 'deepl';
  apiKey?: string;
}

// 言語コードのマッピング（Tesseract言語コードや標準コードの正規化）
function normalizeLang(lang: string, targetService: 'mymemory' | 'deepl' | 'gemini'): string {
  const code = lang.toLowerCase().trim();
  const map: Record<string, { iso2: string; name: string }> = {
    'jpn': { iso2: 'ja', name: 'Japanese' },
    'jpn_vert': { iso2: 'ja', name: 'Japanese' },
    'ja': { iso2: 'ja', name: 'Japanese' },
    'eng': { iso2: 'en', name: 'English' },
    'en': { iso2: 'en', name: 'English' },
    'chi_sim': { iso2: 'zh-CN', name: 'Simplified Chinese' },
    'chi_tra': { iso2: 'zh-TW', name: 'Traditional Chinese' },
    'zh': { iso2: 'zh-CN', name: 'Chinese' },
    'kor': { iso2: 'ko', name: 'Korean' },
    'ko': { iso2: 'ko', name: 'Korean' },
    'fra': { iso2: 'fr', name: 'French' },
    'fr': { iso2: 'fr', name: 'French' },
    'spa': { iso2: 'es', name: 'Spanish' },
    'es': { iso2: 'es', name: 'Spanish' },
    'deu': { iso2: 'de', name: 'German' },
    'de': { iso2: 'de', name: 'German' },
  };

  const entry = map[code] || { iso2: code, name: code };
  if (targetService === 'gemini') return entry.name;
  return entry.iso2;
}

// 無料フォールバック翻訳 (MyMemory Translation API)
async function translateViaMyMemory(text: string, src: string, tgt: string): Promise<string> {
  const srcIso = normalizeLang(src, 'mymemory');
  const tgtIso = normalizeLang(tgt, 'mymemory');

  const cacheKey = `mymemory:${srcIso}:${tgtIso}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcIso}|${tgtIso}`;
    const response = await axios.get(url, { timeout: 8000 });
    
    if (response.data && response.data.responseData && response.data.responseData.translatedText) {
      const translated = response.data.responseData.translatedText;
      // HTMLエンティティを簡易デコード
      const cleanText = translated
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      
      translationCache.set(cacheKey, cleanText);
      return cleanText;
    }
  } catch (error: any) {
    console.warn(`MyMemory translation failed for "${text}":`, error.message);
  }

  // フォールバック（返却）
  return text;
}

// Gemini API を用いた高品質コンテキスト翻訳
async function translateViaGemini(texts: string[], src: string, tgt: string, apiKey: string): Promise<string[]> {
  const srcName = normalizeLang(src, 'gemini');
  const tgtName = normalizeLang(tgt, 'gemini');

  const prompt = `You are a professional visual content and comic/story translator.
Translate the following array of text snippets from ${srcName} into natural, contextual ${tgtName}.
These are speech bubbles and captions in a visual story or comic. Keep the nuance lively and concise so they fit inside visual speech bubbles.

Input JSON array:
${JSON.stringify(texts, null, 2)}

Respond with ONLY a valid JSON array of strings corresponding to the translations, in the exact same order. Example:
["Translation 1", "Translation 2"]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json"
    }
  }, { timeout: 15000 });

  const rawJson = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (rawJson) {
    const parsed = JSON.parse(rawJson);
    if (Array.isArray(parsed) && parsed.length === texts.length) {
      return parsed;
    }
  }
  throw new Error('Invalid JSON structure from Gemini response');
}

// DeepL API
async function translateViaDeepL(texts: string[], src: string, tgt: string, apiKey: string): Promise<string[]> {
  const isFree = apiKey.endsWith(':fx');
  const host = isFree ? 'api-free.deepl.com' : 'api.deepl.com';
  const url = `https://${host}/v2/translate`;

  const tgtCode = normalizeLang(tgt, 'deepl').toUpperCase();
  const srcCode = normalizeLang(src, 'deepl').toUpperCase();

  const response = await axios.post(
    url,
    {
      text: texts,
      target_lang: tgtCode,
      source_lang: srcCode
    },
    {
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  return response.data.translations.map((t: any) => t.text);
}

// メイン翻訳ルート
router.post('/translate', async (req: Request, res: Response) => {
  const { texts, sourceLang = 'ja', targetLang = 'en', provider = 'auto', apiKey } = req.body as TranslateRequest;

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'texts array is required' });
  }

  try {
    let translations: string[] = [];

    if (provider === 'gemini' && apiKey) {
      translations = await translateViaGemini(texts, sourceLang, targetLang, apiKey);
    } else if (provider === 'deepl' && apiKey) {
      translations = await translateViaDeepL(texts, sourceLang, targetLang, apiKey);
    } else {
      // デフォルト: MyMemory 無料フォールバック
      translations = await Promise.all(
        texts.map(text => translateViaMyMemory(text, sourceLang, targetLang))
      );
    }

    return res.json({
      success: true,
      provider: provider === 'auto' ? 'mymemory_free' : provider,
      sourceLang,
      targetLang,
      translations
    });
  } catch (error: any) {
    console.error('Translation error:', error.message);
    
    // エラー時でも無料フォールバックを試みる
    try {
      const fallbackTranslations = await Promise.all(
        texts.map(text => translateViaMyMemory(text, sourceLang, targetLang))
      );
      return res.json({
        success: true,
        provider: 'mymemory_fallback',
        warning: `Specified provider failed: ${error.message}. Used fallback.`,
        translations: fallbackTranslations
      });
    } catch (fallbackError: any) {
      return res.status(500).json({
        error: 'Translation failed across all providers',
        details: error.message
      });
    }
  }
});

export default router;

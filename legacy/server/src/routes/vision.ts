import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// 定番オノマトペ・擬音・手書き効果音の日英・日中辞書
const ONOMATOPOEIA_DICTIONARY: Record<string, { en: string; zh: string }> = {
  // 衝撃・爆発
  'ドカン': { en: 'BOOM!', zh: '轰！' },
  'ドカーン': { en: 'KABOOM!', zh: '轰隆！' },
  'ドン': { en: 'BAM!', zh: '咚！' },
  'バシッ': { en: 'SMACK!', zh: '啪！' },
  'ズシン': { en: 'THUD!', zh: '沉重一声！' },
  'バーン': { en: 'BANG!', zh: '砰！' },
  'ガシャン': { en: 'CRASH!', zh: '哐当！' },
  'バキッ': { en: 'CRACK!', zh: '咔嚓！' },
  'パリン': { en: 'SHATTER!', zh: '啪嚓！' },
  
  // 心情・雰囲気
  'ドキドキ': { en: '*thump thump*', zh: '噗通噗通' },
  'バクバク': { en: '*heart racing*', zh: '心惊肉跳' },
  'ニコニコ': { en: '*beaming smile*', zh: '笑眯眯' },
  'ニヤリ': { en: '*smirk*', zh: '冷笑/咧嘴' },
  'ニッコリ': { en: '*warm smile*', zh: '微微一笑' },
  'ゾクッ': { en: '*shiver*', zh: '一阵发冷' },
  'ブルブル': { en: '*trembling*', zh: '瑟瑟发抖' },
  'シーン': { en: '*dead silence*', zh: '一片死寂' },
  'しーん': { en: '*silence*', zh: '静...' },
  'ガーン': { en: '*SHOCK!*', zh: '大受打击！' },
  'ギクッ': { en: '*startled!*', zh: '心中一惊！' },
  'チラッ': { en: '*glance*', zh: '偷瞄一眼' },
  
  // 動き・環境音
  'ゴゴゴ': { en: 'MENACING...', zh: '隆隆隆...' },
  'ゴゴゴゴ': { en: 'RUMBLE...', zh: '轰隆隆...' },
  'ドドド': { en: 'RUMBLE RUMBLE', zh: '隆隆疾驰' },
  'サッ': { en: '*quick move*', zh: '唰！' },
  'パッ': { en: '*snap / sudden*', zh: '啪！' },
  'テクテク': { en: '*trotting*', zh: '一步一步' },
  'スタスタ': { en: '*striding*', zh: '大步流星' },
  'サササ': { en: '*rustle rustle*', zh: '悉悉索索' },
  'キラキラ': { en: '*sparkle sparkle*', zh: '闪闪发光' },
  'ピカッ': { en: 'FLASH!', zh: '闪光！' },
  'ギラッ': { en: '*glint*', zh: '凶光一闪' },
  'ふわふわ': { en: '*fluffy / floaty*', zh: '轻飘飘' },
  'ぐったり': { en: '*exhausted*', zh: '瘫倒无力' },
};

/**
 * 擬音・オノマトペに特化した変換
 */
export function translateOnomatopoeia(text: string, targetLang: string): string {
  const clean = text.trim().replace(/[!！?？.・…]/g, '');
  const entry = ONOMATOPOEIA_DICTIONARY[clean];
  if (entry) {
    if (targetLang.startsWith('zh')) return entry.zh;
    return entry.en;
  }
  return text;
}

// 擬音辞書引き API
router.post('/translate-onomatopoeia', (req: Request, res: Response) => {
  const { text, targetLang = 'en' } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const translated = translateOnomatopoeia(text, targetLang);
  return res.json({ original: text, translated });
});

// Gemini Vision による手書き文字・擬音・吹き出しの高精度マルチモーダル検出
router.post('/vision-detect', async (req: Request, res: Response) => {
  const { imageBase64, imageUrl, apiKey, targetLang = 'en' } = req.body;

  if (!apiKey) {
    return res.status(400).json({ 
      error: 'Gemini API Key is required for multimodal handwriting & sound-effects detection.' 
    });
  }

  try {
    let base64Data = '';
    let mimeType = 'image/jpeg';

    if (imageBase64) {
      const match = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        base64Data = imageBase64;
      }
    } else if (imageUrl) {
      const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      mimeType = (imgRes.headers['content-type'] as string) || 'image/jpeg';
      base64Data = Buffer.from(imgRes.data).toString('base64');
    } else {
      return res.status(400).json({ error: 'imageBase64 or imageUrl is required' });
    }

    const prompt = `You are an expert at analyzing visual storytelling, comics, manga, and illustrated books.
Carefully examine this image and detect all text instances, ESPECIALLY:
1. Handwritten notes or diary entries or handwritten monologue.
2. Onomatopoeia / Sound effects (SFX) drawn directly in the scene (e.g. "BOOM", "ドキドキ", "ゴゴゴ", "CRASH").
3. Standard speech bubbles and narration boxes.

For each detected text item, determine:
- "originalText": the exact transcription of the characters.
- "translatedText": natural, vivid translation into ${targetLang} (for sound effects, use comic-accurate sound effect words like *Gasp*, *Rumble*, *BOOM!*).
- "category": choose one of ["sound_effect", "handwritten", "dialogue", "narration"]
- "direction": "horizontal" or "vertical"
- "approxBox": approximate relative coordinates as percentages of image [ymin, xmin, ymax, xmax] between 0 and 1000 (standard Gemini bounding box scale).
- "fontStyle": for sound effects or handwritten, describe if it is bold/italic or tilted (e.g. rotation degrees -30 to 30).

Return ONLY a JSON array with this exact format:
[
  {
    "originalText": "ドキドキ",
    "translatedText": "*Thump-thump*",
    "category": "sound_effect",
    "direction": "horizontal",
    "box_2d": [ymin, xmin, ymax, xmax],
    "rotation": 0
  }
]`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await axios.post(geminiUrl, {
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    }, { timeout: 25000 });

    const rawJson = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) {
      return res.status(500).json({ error: 'Empty response from Gemini Vision' });
    }

    const detected = JSON.parse(rawJson);
    return res.json({
      success: true,
      count: detected.length,
      regions: detected
    });
  } catch (error: any) {
    console.error('Vision detection error:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Vision detection failed', 
      details: error.response?.data || error.message 
    });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

interface VisionOcrRequest {
  imageBase64?: string;
  imageUrl?: string;
  apiKey?: string;
  features?: ('DOCUMENT_TEXT_DETECTION' | 'TEXT_DETECTION')[];
}

interface DetectedBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  originalText: string;
  confidence: number;
  direction: 'horizontal' | 'vertical';
  category: 'dialogue' | 'sound_effect' | 'handwritten' | 'narration';
}

router.post('/cloud-vision-ocr', async (req: Request, res: Response) => {
  const { imageBase64, imageUrl, apiKey, features = ['DOCUMENT_TEXT_DETECTION'] } = req.body as VisionOcrRequest;

  if (!apiKey) {
    return res.status(400).json({
      error: 'Google Cloud Vision API Key is required. Please configure your API key in Settings.'
    });
  }

  try {
    let rawBase64 = '';

    if (imageBase64) {
      const match = imageBase64.match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
      rawBase64 = match ? match[1] : imageBase64;
    } else if (imageUrl) {
      // 外部URLの画像をバイナリ取得してBase64化
      const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
      rawBase64 = Buffer.from(imgRes.data).toString('base64');
    } else {
      return res.status(400).json({ error: 'imageBase64 or imageUrl is required' });
    }

    const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    const requestBody = {
      requests: [
        {
          image: { content: rawBase64 },
          features: features.map(type => ({
            type,
            maxResults: 100
          })),
          imageContext: {
            languageHints: ['ja', 'en', 'zh-CN', 'zh-TW', 'ko']
          }
        }
      ]
    };

    const response = await axios.post(visionApiUrl, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    const result = response.data.responses?.[0];
    if (!result) {
      return res.status(500).json({ error: 'Empty response from Google Cloud Vision API' });
    }

    if (result.error) {
      return res.status(400).json({
        error: 'Google Cloud Vision API error',
        details: result.error.message
      });
    }

    const detectedBlocks: DetectedBlock[] = [];
    const fullTextAnnotation = result.fullTextAnnotation;

    if (fullTextAnnotation && fullTextAnnotation.pages) {
      fullTextAnnotation.pages.forEach((page: any) => {
        (page.blocks || []).forEach((block: any, bIdx: number) => {
          (block.paragraphs || []).forEach((paragraph: any, pIdx: number) => {
            // パラグラフの全単語・シンボルを結合
            const wordsText: string[] = [];
            let totalConfidence = 0;
            let symbolCount = 0;

            (paragraph.words || []).forEach((word: any) => {
              const chars = (word.symbols || []).map((s: any) => {
                if (s.confidence) {
                  totalConfidence += s.confidence;
                  symbolCount++;
                }
                return s.text || '';
              }).join('');
              wordsText.push(chars);
            });

            const text = wordsText.join('').trim();
            if (!text) return;

            // バウンディングポリゴンから座標・矩形を計算
            const vertices = paragraph.boundingBox?.vertices || block.boundingBox?.vertices || [];
            if (vertices.length >= 2) {
              const xs = vertices.map((v: any) => v.x || 0);
              const ys = vertices.map((v: any) => v.y || 0);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);

              const width = Math.max(16, maxX - minX);
              const height = Math.max(16, maxY - minY);
              const isVertical = height > width * 1.3;

              // 擬音（オノマトペ）の簡易判定
              const isSoundEffect = /(?:[ドン|バン|ドド|ゴゴ|バキ|ズシ|ドキ|ニコ|シーン|キラ|ピカ|ガーン|Boom|Crash|Bang|Thump|Gasp])/i.test(text) && text.length <= 8;

              const avgConfidence = symbolCount > 0 ? Math.round((totalConfidence / symbolCount) * 100) : 95;

              detectedBlocks.push({
                id: `cv-region-${Date.now()}-${bIdx}-${pIdx}`,
                x: Math.max(0, minX - 4),
                y: Math.max(0, minY - 4),
                width: width + 8,
                height: height + 8,
                originalText: text,
                confidence: avgConfidence,
                direction: isVertical ? 'vertical' : 'horizontal',
                category: isSoundEffect ? 'sound_effect' : 'dialogue'
              });
            }
          });
        });
      });
    } else if (result.textAnnotations && result.textAnnotations.length > 1) {
      // DOCUMENT_TEXT_DETECTION が空の場合の TEXT_DETECTION フォールバック
      // 0番目は全文、1番目以降が個別の行/単語
      result.textAnnotations.slice(1).forEach((ann: any, idx: number) => {
        const text = (ann.description || '').trim();
        if (!text) return;

        const vertices = ann.boundingPoly?.vertices || [];
        if (vertices.length >= 2) {
          const xs = vertices.map((v: any) => v.x || 0);
          const ys = vertices.map((v: any) => v.y || 0);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          const width = Math.max(16, maxX - minX);
          const height = Math.max(16, maxY - minY);

          detectedBlocks.push({
            id: `cv-text-${Date.now()}-${idx}`,
            x: Math.max(0, minX - 4),
            y: Math.max(0, minY - 4),
            width: width + 8,
            height: height + 8,
            originalText: text,
            confidence: 90,
            direction: height > width * 1.3 ? 'vertical' : 'horizontal',
            category: 'dialogue'
          });
        }
      });
    }

    return res.json({
      success: true,
      provider: 'google_cloud_vision',
      count: detectedBlocks.length,
      fullText: fullTextAnnotation?.text || result.textAnnotations?.[0]?.description || '',
      regions: detectedBlocks
    });
  } catch (error: any) {
    console.error('Cloud Vision OCR error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Google Cloud Vision OCR failed',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

export default router;

import { createWorker, Worker } from 'tesseract.js';
import { TextRegion } from '../types';

let currentWorker: Worker | null = null;
let currentLanguage = '';

export interface OcrProgressCallback {
  (progress: number, status: string): void;
}

// 近接するバウンディングボックスを吹き出し/ブロック単位にマージする関数
function mergeBoundingBoxes(
  boxes: { bbox: { x0: number; y0: number; x1: number; y1: number }; text: string; confidence: number }[],
  imageWidth: number,
  imageHeight: number
): TextRegion[] {
  if (boxes.length === 0) return [];

  // 有効なテキストのみフィルタ
  const validBoxes = boxes.filter(b => {
    const t = b.text.trim();
    const w = b.bbox.x1 - b.bbox.x0;
    const h = b.bbox.y1 - b.bbox.y0;
    return t.length > 0 && w > 8 && h > 8;
  });

  if (validBoxes.length === 0) return [];

  const clusters: typeof validBoxes[] = [];
  const distanceThresholdY = imageHeight * 0.04; // 縦方向の近接判定
  const distanceThresholdX = imageWidth * 0.05;  // 横方向の近接判定

  validBoxes.forEach(box => {
    let added = false;
    for (const cluster of clusters) {
      // クラスタの境界
      const minX = Math.min(...cluster.map(c => c.bbox.x0));
      const maxX = Math.max(...cluster.map(c => c.bbox.x1));
      const minY = Math.min(...cluster.map(c => c.bbox.y0));
      const maxY = Math.max(...cluster.map(c => c.bbox.y1));

      // 水平・垂直の重複または近接を検査
      const xOverlap = box.bbox.x0 <= maxX + distanceThresholdX && box.bbox.x1 >= minX - distanceThresholdX;
      const yOverlap = box.bbox.y0 <= maxY + distanceThresholdY && box.bbox.y1 >= minY - distanceThresholdY;

      if (xOverlap && yOverlap) {
        cluster.push(box);
        added = true;
        break;
      }
    }
    if (!added) {
      clusters.push([box]);
    }
  });

  return clusters.map((cluster, index) => {
    const x0 = Math.min(...cluster.map(c => c.bbox.x0));
    const y0 = Math.min(...cluster.map(c => c.bbox.y0));
    const x1 = Math.max(...cluster.map(c => c.bbox.x1));
    const y1 = Math.max(...cluster.map(c => c.bbox.y1));

    // Y座標順にソートしてテキストを結合
    cluster.sort((a, b) => a.bbox.y0 - b.bbox.y0);
    const combinedText = cluster
      .map(c => c.text.trim())
      .filter(Boolean)
      .join(' ');

    const avgConfidence = cluster.reduce((sum, c) => sum + c.confidence, 0) / cluster.length;
    const width = x1 - x0;
    const height = y1 - y0;

    // 縦長か横長か
    const isVertical = height > width * 1.5;

    return {
      id: `region-${Date.now()}-${index}`,
      x: Math.max(0, Math.round(x0 - 4)),
      y: Math.max(0, Math.round(y0 - 4)),
      width: Math.min(imageWidth - x0, Math.round(width + 8)),
      height: Math.min(imageHeight - y0, Math.round(height + 8)),
      originalText: combinedText,
      translatedText: '',
      confidence: Math.round(avgConfidence),
      direction: isVertical ? 'vertical' : 'horizontal'
    };
  });
}

/**
 * 画像からテキスト領域を検出・認識する
 */
export async function runOcrOnImage(
  imageSource: string | HTMLImageElement | HTMLCanvasElement,
  tesseractLang: string = 'jpn',
  onProgress?: OcrProgressCallback
): Promise<TextRegion[]> {
  try {
    if (onProgress) onProgress(0.05, 'OCRエンジンを初期化中...');

    // 言語が変わった場合はワーカー再生成
    if (currentWorker && currentLanguage !== tesseractLang) {
      await currentWorker.terminate();
      currentWorker = null;
    }

    if (!currentWorker) {
      currentWorker = await createWorker(tesseractLang, 1, {
        logger: m => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(0.2 + m.progress * 0.75, `テキスト認識中: ${Math.round(m.progress * 100)}%`);
          } else if (onProgress) {
            onProgress(0.1, `${m.status || '準備中'}...`);
          }
        }
      });
      currentLanguage = tesseractLang;
    }

    if (onProgress) onProgress(0.2, '画像解析を開始します...');

    const ret = await currentWorker.recognize(imageSource);
    
    // 画像サイズの取得
    let imgW = 800;
    let imgH = 600;
    if (imageSource instanceof HTMLImageElement) {
      imgW = imageSource.naturalWidth || 800;
      imgH = imageSource.naturalHeight || 600;
    } else if (imageSource instanceof HTMLCanvasElement) {
      imgW = imageSource.width;
      imgH = imageSource.height;
    }

    // パラグラフまたは行単位で抽出
    const lines = ret.data.lines || [];
    const boxes = lines.map(line => ({
      bbox: line.bbox,
      text: line.text,
      confidence: line.confidence
    }));

    if (onProgress) onProgress(0.95, 'テキスト領域の統合中...');
    const regions = mergeBoundingBoxes(boxes, imgW, imgH);

    if (onProgress) onProgress(1.0, `認識完了: ${regions.length} 箇所のテキストを検出`);
    return regions;
  } catch (error: any) {
    console.error('OCR Error:', error);
    if (onProgress) onProgress(1.0, `OCRエラー: ${error.message || error}`);
    throw error;
  }
}

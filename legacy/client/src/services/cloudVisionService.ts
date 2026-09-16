import { TextRegion } from '../types';

export interface CloudVisionOcrResult {
  regions: TextRegion[];
  fullText: string;
}

/**
 * 画像URLまたはBlobからBase64文字列を抽出
 */
async function toBase64(source: string | HTMLImageElement | HTMLCanvasElement): Promise<string> {
  if (typeof source === 'string') {
    if (source.startsWith('data:image')) {
      return source;
    }
    // blob: または http: の場合、fetchしてBase64化
    const res = await fetch(source);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else if (source instanceof HTMLCanvasElement) {
    return source.toDataURL('image/png');
  } else if (source instanceof HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = source.naturalWidth || source.width;
    canvas.height = source.naturalHeight || source.height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(source, 0, 0);
    return canvas.toDataURL('image/png');
  }
  throw new Error('Unsupported image source');
}

/**
 * Google Cloud Vision API を用いた高精度文字認識
 */
export async function runCloudVisionOcr(
  imageSource: string | HTMLImageElement | HTMLCanvasElement,
  apiKey: string
): Promise<CloudVisionOcrResult> {
  if (!apiKey) {
    throw new Error('Google Cloud Vision APIキーが設定されていません。設定画面で入力してください。');
  }

  const base64 = await toBase64(imageSource);

  const response = await fetch('/api/cloud-vision-ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      apiKey
    })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.details || 'Cloud Vision API による文字認識に失敗しました');
  }

  const regions: TextRegion[] = (data.regions || []).map((r: any) => ({
    id: r.id,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    originalText: r.originalText,
    translatedText: '',
    confidence: r.confidence || 95,
    direction: r.direction || 'horizontal',
    category: r.category || 'dialogue',
    rotation: 0
  }));

  return {
    regions,
    fullText: data.fullText || ''
  };
}

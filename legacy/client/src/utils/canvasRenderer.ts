import { TextRegion, RenderMode, AppSettings } from '../types';

/**
 * 周囲のピクセル色をサンプリングして最も適切な背景色を算出
 */
export function sampleSurroundingColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): string {
  const margin = 4;
  const samplePoints: [number, number][] = [];

  // 上端と下端の周囲
  for (let sx = x; sx <= x + w; sx += Math.max(4, Math.floor(w / 10))) {
    samplePoints.push([sx, Math.max(0, y - margin)]);
    samplePoints.push([sx, Math.min(ctx.canvas.height - 1, y + h + margin)]);
  }
  // 左端と右端の周囲
  for (let sy = y; sy <= y + h; sy += Math.max(4, Math.floor(h / 10))) {
    samplePoints.push([Math.max(0, x - margin), sy]);
    samplePoints.push([Math.min(ctx.canvas.width - 1, x + w + margin), sy]);
  }

  let rTotal = 0, gTotal = 0, bTotal = 0, count = 0;
  for (const [px, py] of samplePoints) {
    try {
      const pixel = ctx.getImageData(Math.floor(px), Math.floor(py), 1, 1).data;
      if (pixel[3] > 50) { // 透明ピクセルを除外
        rTotal += pixel[0];
        gTotal += pixel[1];
        bTotal += pixel[2];
        count++;
      }
    } catch (e) {
      // ignore boundary errors
    }
  }

  if (count === 0) return 'rgba(255, 255, 255, 0.95)';
  const r = Math.round(rTotal / count);
  const g = Math.round(gTotal / count);
  const b = Math.round(bTotal / count);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 縦書き用の文字変換（長音符や括弧）
 */
function prepareVerticalChars(text: string): string[] {
  const chars: string[] = [];
  for (const char of text) {
    if (char === 'ー' || char === '—' || char === 'ｰ') {
      chars.push('丨');
    } else if (char === '…') {
      chars.push('︰');
    } else if (char === '（' || char === '(') {
      chars.push('︵');
    } else if (char === '）' || char === ')') {
      chars.push('︶');
    } else {
      chars.push(char);
    }
  }
  return chars;
}

/**
 * 横書きテキストの自動折り返し
 */
function wrapHorizontalText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const hasSpaces = text.includes(' ');
  
  if (hasSpaces) {
    const words = text.split(' ');
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  } else {
    let currentLine = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

/**
 * 縦書きテキストの折り返し
 */
function wrapVerticalText(
  _ctx: CanvasRenderingContext2D,
  text: string,
  maxHeight: number,
  fontSize: number
): string[][] {
  const chars = prepareVerticalChars(text);
  const columns: string[][] = [];
  let currentColumn: string[] = [];
  let currentY = 0;
  const charSpacing = fontSize * 1.05;

  for (const char of chars) {
    if (currentY + charSpacing > maxHeight && currentColumn.length > 0) {
      columns.push(currentColumn);
      currentColumn = [char];
      currentY = charSpacing;
    } else {
      currentColumn.push(char);
      currentY += charSpacing;
    }
  }
  if (currentColumn.length > 0) {
    columns.push(currentColumn);
  }

  return columns;
}

/**
 * ボックス内に美しく収まるフォントサイズとレイアウトを算出
 */
function fitTextInBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  boxWidth: number,
  boxHeight: number,
  direction: 'horizontal' | 'vertical',
  fontFamily: string,
  category?: string
): { fontSize: number; lines: string[]; columns?: string[][] } {
  // 擬音（sound_effect）の場合は大きめのフォントを許容
  const minFontSize = category === 'sound_effect' ? 14 : 10;
  const maxFontSize = category === 'sound_effect' ? 64 : 42;
  const availableWidth = Math.max(10, boxWidth - 8);
  const availableHeight = Math.max(10, boxHeight - 8);

  let bestFontSize = minFontSize;
  let bestLines: string[] = [text];
  let bestColumns: string[][] | undefined;

  let low = minFontSize;
  let high = maxFontSize;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    ctx.font = `bold ${mid}px ${fontFamily}`;

    if (direction === 'horizontal') {
      const lines = wrapHorizontalText(ctx, text, availableWidth);
      const totalHeight = lines.length * (mid * 1.25);
      if (totalHeight <= availableHeight) {
        bestFontSize = mid;
        bestLines = lines;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    } else {
      const columns = wrapVerticalText(ctx, text, availableHeight, mid);
      const totalWidth = columns.length * (mid * 1.3);
      if (totalWidth <= availableWidth) {
        bestFontSize = mid;
        bestColumns = columns;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
  }

  return { fontSize: bestFontSize, lines: bestLines, columns: bestColumns };
}

/**
 * メイン描画エンジン
 */
export function renderCanvasPage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  regions: TextRegion[],
  mode: RenderMode,
  settings: AppSettings,
  selectedRegionId?: string | null
) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight) {
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
  }

  // 1. 元画像の描画
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (mode === 'original' || regions.length === 0) {
    return;
  }

  // 2. 各領域の描画
  regions.forEach(region => {
    const textToDraw = region.translatedText || region.originalText;
    if (!textToDraw) return;

    const { x, y, width, height, direction, category = 'dialogue', rotation = 0 } = region;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // カテゴリに応じたフォントとスタイルの自動選択
    let fontFamily = region.fontFamily || settings.fontFamily || '"M PLUS Rounded 1c", sans-serif';
    let fontWeight = region.fontWeight || 'bold';
    let fontStyle = region.fontStyle || 'normal';
    let fontColor = region.fontColor || settings.defaultFontColor || '#111827';
    let strokeColor = region.strokeColor || settings.defaultStrokeColor || '#ffffff';
    let defaultStrokeWidth = 3;

    if (category === 'sound_effect') {
      // 擬音・効果音: インパクト大、太字・斜体、ド派手なストローク
      fontFamily = region.fontFamily || '"Impact", "M PLUS Rounded 1c", sans-serif';
      fontWeight = '900';
      fontStyle = 'italic';
      fontColor = region.fontColor || '#e11d48'; // 鮮烈な赤/ピンク
      strokeColor = region.strokeColor || '#ffffff';
      defaultStrokeWidth = 5;
    } else if (category === 'handwritten') {
      // 手書き文字: 丸文字・手書きフォント
      fontFamily = region.fontFamily || '"Kosugi Maru", cursive, sans-serif';
      fontWeight = 'normal';
      fontColor = region.fontColor || '#334155';
      strokeColor = region.strokeColor || 'rgba(255, 255, 255, 0.8)';
      defaultStrokeWidth = 2;
    }

    const strokeWidth = region.strokeWidth ?? defaultStrokeWidth;

    ctx.save();

    // 回転 (rotation) の適用
    if (rotation !== 0) {
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    if (mode === 'inpainted') {
      // 背景サンプリング & 消去
      const bgColor = region.backgroundColor || sampleSurroundingColor(ctx, x, y, width, height);

      ctx.save();
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      // 角丸
      const radius = category === 'sound_effect' ? 4 : 8;
      ctx.roundRect ? ctx.roundRect(x, y, width, height, radius) : ctx.rect(x, y, width, height);
      ctx.fill();
      ctx.restore();

      // フィッティング計算
      const fit = fitTextInBox(ctx, textToDraw, width, height, direction, fontFamily, category);
      const fontSize = region.fontSize || fit.fontSize;

      ctx.save();
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = fontColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineJoin = 'round';
      ctx.textBaseline = 'middle';

      // 擬音・オノマトペならシャドウ効果も付加
      if (category === 'sound_effect') {
        ctx.shadowColor = region.shadowColor || 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = region.shadowBlur ?? 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
      }

      if (direction === 'horizontal') {
        ctx.textAlign = 'center';
        const lineHeight = fontSize * 1.25;
        const totalHeight = fit.lines.length * lineHeight;
        let startY = y + (height - totalHeight) / 2 + lineHeight / 2;

        fit.lines.forEach(line => {
          if (strokeWidth > 0) {
            ctx.strokeText(line, centerX, startY);
          }
          ctx.fillText(line, centerX, startY);
          startY += lineHeight;
        });
      } else {
        // 縦書き
        ctx.textAlign = 'center';
        const columns = fit.columns || [prepareVerticalChars(textToDraw)];
        const columnWidth = fontSize * 1.25;
        const totalWidth = columns.length * columnWidth;
        let startX = x + width - (width - totalWidth) / 2 - columnWidth / 2;

        columns.forEach(col => {
          const charSpacing = fontSize * 1.05;
          const totalColHeight = col.length * charSpacing;
          let startY = y + (height - totalColHeight) / 2 + charSpacing / 2;

          col.forEach(char => {
            if (strokeWidth > 0) {
              ctx.strokeText(char, startX, startY);
            }
            ctx.fillText(char, startX, startY);
            startY += charSpacing;
          });
          startX -= columnWidth;
        });
      }
      ctx.restore();

    } else if (mode === 'overlay') {
      // オーバーレイ表示
      ctx.save();
      ctx.fillStyle = category === 'sound_effect' ? 'rgba(225, 29, 72, 0.85)' : 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const radius = 6;
      ctx.roundRect ? ctx.roundRect(x, y, width, height, radius) : ctx.rect(x, y, width, height);
      ctx.fill();
      ctx.stroke();

      const fit = fitTextInBox(ctx, textToDraw, width, height, 'horizontal', fontFamily, category);
      const fontSize = Math.max(12, fit.fontSize);
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lineHeight = fontSize * 1.25;
      const totalHeight = fit.lines.length * lineHeight;
      let startY = y + (height - totalHeight) / 2 + lineHeight / 2;

      fit.lines.forEach(line => {
        ctx.fillText(line, centerX, startY);
        startY += lineHeight;
      });
      ctx.restore();
    }

    ctx.restore(); // end rotation

    // 選択中領域の枠線ハイライト
    if (region.id === selectedRegionId) {
      ctx.save();
      if (rotation !== 0) {
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }
      ctx.strokeStyle = category === 'sound_effect' ? '#f43f5e' : '#06b6d4';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);

      // バッジ表示 (カテゴリと角度)
      ctx.fillStyle = category === 'sound_effect' ? '#f43f5e' : '#06b6d4';
      ctx.font = 'bold 11px sans-serif';
      const label = category === 'sound_effect' ? '💥 擬音' : category === 'handwritten' ? '✍️ 手書き' : '💬 会話';
      ctx.fillRect(x - 2, y - 20, 60, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 4, y - 7);

      ctx.restore();
    }
  });
}

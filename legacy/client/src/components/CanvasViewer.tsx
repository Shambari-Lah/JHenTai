import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Eye, 
  PlusCircle, 
  Move,
  MousePointer,
  Volume2,
  PenTool
} from 'lucide-react';
import { TextRegion, ImagePage, RenderMode, AppSettings } from '../types';
import { renderCanvasPage } from '../utils/canvasRenderer';

interface CanvasViewerProps {
  page: ImagePage | null;
  selectedRegionId: string | null;
  onSelectRegion: (id: string | null) => void;
  onAddRegion: (region: Omit<TextRegion, 'id'>) => void;
  onUpdateRegionCoords: (id: string, x: number, y: number, width: number, height: number) => void;
  settings: AppSettings;
  onRenderReady?: (canvas: HTMLCanvasElement) => void;
}

type ToolMode = 'select' | 'add_dialogue' | 'add_sfx' | 'add_handwritten';

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  page,
  selectedRegionId,
  onSelectRegion,
  onAddRegion,
  onUpdateRegionCoords,
  settings,
  onRenderReady
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // ビューポート状態
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // 原文一時チラ見せ（ホールド比較）状態
  const [isPeekingOriginal, setIsPeekingOriginal] = useState(false);

  // ツールモード
  const [toolMode, setToolMode] = useState<ToolMode>('select');

  // ドラッグ矩形作成状態
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // 既存領域のドラッグ移動状態
  const [draggingRegionId, setDraggingRegionId] = useState<string | null>(null);
  const [regionDragOffset, setRegionDragOffset] = useState({ x: 0, y: 0 });

  // タッチ操作用
  const touchDistanceRef = useRef<number | null>(null);

  // 画像のロード
  useEffect(() => {
    if (!page) {
      imageRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      // コンテナに合わせて全体フィット
      fitToScreen(img.naturalWidth, img.naturalHeight);
      render();
    };
    img.src = page.sourceUrl;
  }, [page?.sourceUrl]);

  // 全体フィット
  const fitToScreen = useCallback((imgWidth?: number, imgHeight?: number) => {
    if (!containerRef.current) return;
    const w = imgWidth || imageRef.current?.naturalWidth || 800;
    const h = imgHeight || imageRef.current?.naturalHeight || 600;
    const cw = containerRef.current.clientWidth - 40;
    const ch = containerRef.current.clientHeight - 40;

    const scaleX = cw / w;
    const scaleY = ch / h;
    const fitScale = Math.min(scaleX, scaleY, 1.2);

    setScale(fitScale);
    setOffset({
      x: (containerRef.current.clientWidth - w * fitScale) / 2,
      y: (containerRef.current.clientHeight - h * fitScale) / 2
    });
  }, []);

  // レンダリング実行
  const render = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !page) return;
    
    // ホールド比較中は強制的に 'original' モード
    const effectiveMode: RenderMode = isPeekingOriginal ? 'original' : settings.renderMode;

    renderCanvasPage(
      canvasRef.current,
      imageRef.current,
      page.regions,
      effectiveMode,
      settings,
      selectedRegionId
    );

    if (onRenderReady) {
      onRenderReady(canvasRef.current);
    }
  }, [page, settings, selectedRegionId, isPeekingOriginal, onRenderReady]);

  useEffect(() => {
    render();
  }, [render]);

  // スクリーン座標から画像ピクセル座標への変換
  const screenToImageCoords = (screenX: number, screenY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - offset.x) / scale;
    const y = (screenY - rect.top - offset.y) / scale;
    return { x: Math.round(x), y: Math.round(y) };
  };

  // マウスホイールズーム
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.min(Math.max(scale * zoomFactor, 0.2), 5.0);

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setOffset({
      x: mouseX - (mouseX - offset.x) * (newScale / scale),
      y: mouseY - (mouseY - offset.y) * (newScale / scale)
    });
    setScale(newScale);
  };

  // マウス押下
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.altKey || (e.button === 0 && e.shiftKey)) {
      // パン操作 (ホイールクリック、Alt+クリック、Shift+クリック)
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    if (e.button !== 0) return;

    const { x, y } = screenToImageCoords(e.clientX, e.clientY);

    if (toolMode.startsWith('add_')) {
      // 矩形ドラッグ追加モード
      setIsDrawing(true);
      setDrawStart({ x, y });
      setDrawCurrent({ x, y });
      return;
    }

    // 選択ツール: クリック位置にある既存領域を判定
    if (page) {
      const clicked = page.regions.slice().reverse().find(r => 
        x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height
      );

      if (clicked) {
        onSelectRegion(clicked.id);
        setDraggingRegionId(clicked.id);
        setRegionDragOffset({ x: x - clicked.x, y: y - clicked.y });
        return;
      }
    }

    // 何もヒットしない場合は選択解除、またはパン開始
    onSelectRegion(null);
    setIsPanning(true);
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  // マウス移動
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (isDrawing && drawStart) {
      const { x, y } = screenToImageCoords(e.clientX, e.clientY);
      setDrawCurrent({ x, y });
      return;
    }

    if (draggingRegionId && page) {
      const { x, y } = screenToImageCoords(e.clientX, e.clientY);
      const reg = page.regions.find(r => r.id === draggingRegionId);
      if (reg) {
        const newX = Math.max(0, x - regionDragOffset.x);
        const newY = Math.max(0, y - regionDragOffset.y);
        onUpdateRegionCoords(reg.id, newX, newY, reg.width, reg.height);
      }
    }
  };

  // マウス離脱/完了
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (isDrawing && drawStart && drawCurrent && page) {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);

      // 最低限のサイズがある場合のみ追加
      if (width > 15 && height > 15) {
        let category: 'dialogue' | 'sound_effect' | 'handwritten' = 'dialogue';
        if (toolMode === 'add_sfx') category = 'sound_effect';
        if (toolMode === 'add_handwritten') category = 'handwritten';

        onAddRegion({
          x,
          y,
          width,
          height,
          originalText: category === 'sound_effect' ? 'ドン！' : category === 'handwritten' ? '手書きメモ' : '新しいテキスト',
          translatedText: '',
          confidence: 100,
          direction: height > width * 1.5 ? 'vertical' : 'horizontal',
          category,
          rotation: 0
        });
      }

      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
      setToolMode('select'); // 選択モードに戻す
    }

    if (draggingRegionId) {
      setDraggingRegionId(null);
    }
  };

  // タッチ操作（ピンチズーム & パン）
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      setPanStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
      setIsPanning(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist / touchDistanceRef.current;
      setScale(s => Math.min(Math.max(s * delta, 0.2), 5.0));
      touchDistanceRef.current = dist;
    } else if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      setOffset({
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
    setIsPanning(false);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col select-none">
      {/* ツールバー (ズーム、ツールモード、比較) */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
        {/* モード選択 */}
        <div className="flex items-center space-x-1 border-r border-slate-700 pr-1.5 mr-1">
          <button
            onClick={() => setToolMode('select')}
            className={`p-2 rounded-lg transition ${
              toolMode === 'select' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="選択・移動ツール"
          >
            <MousePointer className="w-4 h-4" />
          </button>
          <button
            onClick={() => setToolMode('add_dialogue')}
            className={`p-2 rounded-lg transition ${
              toolMode === 'add_dialogue' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="吹き出し会話領域を追加（ドラッグで囲む）"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setToolMode('add_sfx')}
            className={`p-2 rounded-lg transition ${
              toolMode === 'add_sfx' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="💥 擬音・オノマトペ領域を追加（ドラッグで囲む）"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setToolMode('add_handwritten')}
            className={`p-2 rounded-lg transition ${
              toolMode === 'add_handwritten' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="✍️ 手書き文字領域を追加（ドラッグで囲む）"
          >
            <PenTool className="w-4 h-4" />
          </button>
        </div>

        {/* ズーム系 */}
        <button
          onClick={() => setScale(s => Math.min(s * 1.2, 5.0))}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
          title="拡大"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScale(s => Math.max(s * 0.8, 0.2))}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
          title="縮小"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => fitToScreen()}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
          title="画面に全体表示"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setScale(1); setOffset({ x: 40, y: 40 }); }}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition text-xs font-mono"
          title="原寸 (100%)"
        >
          100%
        </button>

        {/* 原文チラ見せ比較 (ホールド) */}
        <div className="border-l border-slate-700 pl-1.5 ml-1">
          <button
            onMouseDown={() => setIsPeekingOriginal(true)}
            onMouseUp={() => setIsPeekingOriginal(false)}
            onMouseLeave={() => setIsPeekingOriginal(false)}
            onTouchStart={() => setIsPeekingOriginal(true)}
            onTouchEnd={() => setIsPeekingOriginal(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition select-none ${
              isPeekingOriginal ? 'bg-amber-500 text-black font-bold' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="押している間だけ原文画像を表示（ビフォーアフター比較）"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>長押しで原文比較</span>
          </button>
        </div>
      </div>

      {/* ドラッグ追加モードのヒントガイド */}
      {toolMode.startsWith('add_') && (
        <div className="absolute top-16 left-4 z-20 bg-indigo-950/90 border border-indigo-500/50 text-indigo-200 text-xs px-3 py-1.5 rounded-lg shadow-lg">
          画像上の追加したいエリアをマウスでドラッグして囲んでください
        </div>
      )}

      {/* キャンバス表示領域 */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden touch-pan-zoom"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0
          }}
          className="shadow-2xl transition-transform duration-75"
        >
          <canvas ref={canvasRef} className="block rounded" />

          {/* ドラッグ中の新規矩形プレビュー */}
          {isDrawing && drawStart && drawCurrent && (
            <div
              className={`absolute border-2 pointer-events-none ${
                toolMode === 'add_sfx' ? 'border-rose-500 bg-rose-500/20' : 
                toolMode === 'add_handwritten' ? 'border-amber-500 bg-amber-500/20' : 
                'border-teal-400 bg-teal-400/20'
              }`}
              style={{
                left: `${Math.min(drawStart.x, drawCurrent.x)}px`,
                top: `${Math.min(drawStart.y, drawCurrent.y)}px`,
                width: `${Math.abs(drawCurrent.x - drawStart.x)}px`,
                height: `${Math.abs(drawCurrent.y - drawStart.y)}px`
              }}
            />
          )}
        </div>
      </div>

      {/* 画像がない場合のプレースホルダー */}
      {!page && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-6 pointer-events-none">
          <Maximize2 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base font-medium">画像が読み込まれていません</p>
          <p className="text-xs text-slate-600 mt-1">
            上部の「作品 / 画像を開く」からサンプル絵物語や画像ファイルを読み込んでください
          </p>
        </div>
      )}
    </div>
  );
};

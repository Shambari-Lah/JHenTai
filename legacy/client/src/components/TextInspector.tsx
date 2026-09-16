import React from 'react';
import { 
  Trash2, 
  RefreshCw, 
  RotateCw, 
  Sparkles, 
  AlignLeft, 
  AlignJustify, 
  Type, 
  Palette, 
  Volume2, 
  PenTool, 
  MessageSquare, 
  FileText,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { TextRegion, RegionCategory } from '../types';

interface TextInspectorProps {
  selectedRegion: TextRegion | null;
  allRegions: TextRegion[];
  onSelectRegion: (id: string) => void;
  onUpdateRegion: (id: string, updates: Partial<TextRegion>) => void;
  onDeleteRegion: (id: string) => void;
  onTranslateSingle: (region: TextRegion) => void;
  targetLang: string;
}

export const TextInspector: React.FC<TextInspectorProps> = ({
  selectedRegion,
  allRegions,
  onSelectRegion,
  onUpdateRegion,
  onDeleteRegion,
  onTranslateSingle,
  targetLang
}) => {
  // オノマトペ特化辞書引き
  const handleConvertOnomatopoeia = async () => {
    if (!selectedRegion) return;
    try {
      const res = await fetch('/api/translate-onomatopoeia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedRegion.originalText, targetLang })
      });
      if (res.ok) {
        const data = await res.json();
        onUpdateRegion(selectedRegion.id, { 
          translatedText: data.translated,
          category: 'sound_effect',
          fontWeight: '900',
          fontStyle: 'italic'
        });
      }
    } catch (e) {
      console.warn('Failed onomatopoeia lookup:', e);
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 select-none overflow-hidden shadow-2xl">
      {/* パネルヘッダー */}
      <div className="p-3.5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            {selectedRegion ? 'テキスト編集インスペクター' : 'テキスト領域一覧'}
          </h2>
        </div>
        <span className="text-xs bg-slate-700/80 text-slate-300 px-2 py-0.5 rounded-full font-mono">
          {allRegions.length} 件
        </span>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedRegion ? (
          <>
            {/* カテゴリプリセット切替 (会話 / 擬音 / 手書き / ナレーション) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                テキストの種類・スタイル
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateRegion(selectedRegion.id, { 
                    category: 'dialogue', 
                    fontStyle: 'normal',
                    fontWeight: 'bold' 
                  })}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition ${
                    selectedRegion.category === 'dialogue' || !selectedRegion.category
                      ? 'bg-teal-950/80 border-teal-500 text-teal-300 shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>💬 会話・吹き出し</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdateRegion(selectedRegion.id, { 
                      category: 'sound_effect',
                      fontStyle: 'italic',
                      fontWeight: '900',
                      fontColor: '#e11d48',
                      strokeColor: '#ffffff'
                    });
                    handleConvertOnomatopoeia();
                  }}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition ${
                    selectedRegion.category === 'sound_effect'
                      ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>💥 擬音・オノマトペ</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateRegion(selectedRegion.id, { 
                    category: 'handwritten',
                    fontFamily: '"Kosugi Maru", cursive, sans-serif',
                    fontStyle: 'normal',
                    fontWeight: 'normal'
                  })}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition ${
                    selectedRegion.category === 'handwritten'
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5 text-amber-400" />
                  <span>✍️ 手書き・メモ</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateRegion(selectedRegion.id, { 
                    category: 'narration',
                    fontStyle: 'normal',
                    fontWeight: 'bold'
                  })}
                  className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition ${
                    selectedRegion.category === 'narration'
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>📜 ナレーション</span>
                </button>
              </div>
            </div>

            {/* 原文 (OCRテキスト) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">原文テキスト</label>
                {selectedRegion.category === 'sound_effect' && (
                  <button
                    onClick={handleConvertOnomatopoeia}
                    className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium underline"
                    title="擬音辞書から音訳"
                  >
                    <Sparkles className="w-3 h-3" />
                    擬音辞書変換
                  </button>
                )}
              </div>
              <textarea
                value={selectedRegion.originalText}
                onChange={(e) => onUpdateRegion(selectedRegion.id, { originalText: e.target.value })}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                placeholder="OCRで読み取ったテキスト"
              />
            </div>

            {/* 翻訳文 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-teal-300 flex items-center gap-1">
                  <span>翻訳テキスト</span>
                  <Sparkles className="w-3 h-3" />
                </label>
                <button
                  onClick={() => onTranslateSingle(selectedRegion)}
                  className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  再翻訳
                </button>
              </div>
              <textarea
                value={selectedRegion.translatedText}
                onChange={(e) => onUpdateRegion(selectedRegion.id, { translatedText: e.target.value })}
                rows={3}
                className="w-full bg-slate-800 border border-teal-600/50 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 ring-1 ring-teal-500/20"
                placeholder="翻訳されたテキスト"
              />
            </div>

            {/* スタイリング詳細設定 (折りたたみ/アコーディオン) */}
            <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-3">
              {/* 方向 & 傾き (回転) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">文字方向</label>
                  <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => onUpdateRegion(selectedRegion.id, { direction: 'horizontal' })}
                      className={`flex-1 py-1 text-[11px] rounded flex items-center justify-center gap-1 ${
                        selectedRegion.direction === 'horizontal' ? 'bg-teal-600 text-white font-medium' : 'text-slate-400'
                      }`}
                    >
                      <AlignLeft className="w-3 h-3" />
                      横書き
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateRegion(selectedRegion.id, { direction: 'vertical' })}
                      className={`flex-1 py-1 text-[11px] rounded flex items-center justify-center gap-1 ${
                        selectedRegion.direction === 'vertical' ? 'bg-teal-600 text-white font-medium' : 'text-slate-400'
                      }`}
                    >
                      <AlignJustify className="w-3 h-3" />
                      縦書き
                    </button>
                  </div>
                </div>

                {/* 擬音・手書き用: 傾き (回転角度) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400 flex items-center gap-1">
                      <RotateCw className="w-3 h-3 text-teal-400" />
                      傾き角度
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">{selectedRegion.rotation || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    step="5"
                    value={selectedRegion.rotation || 0}
                    onChange={(e) => onUpdateRegion(selectedRegion.id, { rotation: parseInt(e.target.value) })}
                    className="w-full accent-teal-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* フォント色 & 輪郭線色 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">文字色</label>
                  <div className="flex items-center space-x-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                    <input
                      type="color"
                      value={selectedRegion.fontColor || '#111827'}
                      onChange={(e) => onUpdateRegion(selectedRegion.id, { fontColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-[10px] font-mono text-slate-300">
                      {selectedRegion.fontColor || '#111827'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">輪郭線 (フチ)</label>
                  <div className="flex items-center space-x-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                    <input
                      type="color"
                      value={selectedRegion.strokeColor || '#ffffff'}
                      onChange={(e) => onUpdateRegion(selectedRegion.id, { strokeColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-[10px] font-mono text-slate-300">
                      {selectedRegion.strokeColor || '#ffffff'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 削除ボタン */}
            <button
              onClick={() => onDeleteRegion(selectedRegion.id)}
              className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-semibold rounded-lg border border-rose-500/30 flex items-center justify-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>この領域を削除</span>
            </button>
          </>
        ) : (
          /* 未選択時: 領域一覧リスト */
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-2">
              キャンバス上のテキスト領域をクリックするか、以下の一覧から選択して編集できます。
            </p>

            {allRegions.map((region, idx) => (
              <div
                key={region.id}
                onClick={() => onSelectRegion(region.id)}
                className="p-2.5 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 rounded-lg cursor-pointer transition flex items-start justify-between group"
              >
                <div className="space-y-1 overflow-hidden pr-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded">
                      #{idx + 1}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {region.category === 'sound_effect' ? '💥 擬音' : 
                       region.category === 'handwritten' ? '✍️ 手書き' : '💬 会話'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 truncate font-medium">
                    {region.translatedText || region.originalText || '(空テキスト)'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition flex-shrink-0 mt-1" />
              </div>
            ))}

            {allRegions.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                テキスト領域がまだありません。<br />
                上部の「文字認識」を実行するか、キャンバス上のツールで領域を追加してください。
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

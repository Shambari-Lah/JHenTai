import React, { useRef } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { ImagePage } from '../types';

interface ThumbnailStripProps {
  pages: ImagePage[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onDeletePage: (index: number) => void;
}

export const ThumbnailStrip: React.FC<ThumbnailStripProps> = ({
  pages,
  currentPageIndex,
  onSelectPage,
  onAddFiles,
  onDeletePage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
  };

  return (
    <div className="h-20 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between z-20 select-none shadow-inner">
      {/* ページ送りナビゲーション */}
      <div className="flex items-center space-x-1">
        <button
          disabled={currentPageIndex <= 0}
          onClick={() => onSelectPage(currentPageIndex - 1)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition"
          title="前のページ (←)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono text-slate-400 px-1">
          {pages.length > 0 ? `${currentPageIndex + 1} / ${pages.length}` : '0 / 0'}
        </span>
        <button
          disabled={currentPageIndex >= pages.length - 1}
          onClick={() => onSelectPage(currentPageIndex + 1)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition"
          title="次のページ (→)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* サムネイルリスト */}
      <div className="flex items-center space-x-3 overflow-x-auto py-1 px-2 mx-4 max-w-2xl">
        {pages.map((page, idx) => {
          const isSelected = idx === currentPageIndex;
          const translatedCount = page.regions.filter(r => r.translatedText).length;

          return (
            <div
              key={page.id}
              onClick={() => onSelectPage(idx)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition group shadow ${
                isSelected
                  ? 'border-teal-400 ring-2 ring-teal-500/30'
                  : 'border-slate-700 hover:border-slate-500 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={page.sourceUrl}
                alt={page.name}
                className="w-full h-full object-cover"
              />

              {/* ページ番号バッジ */}
              <div className="absolute top-0.5 left-0.5 bg-black/75 text-[10px] font-bold text-white px-1.5 py-0.2 rounded font-mono">
                {idx + 1}
              </div>

              {/* 翻訳完了/処理中ステータス */}
              <div className="absolute bottom-0.5 right-0.5">
                {page.isOcrRunning || page.isTranslating ? (
                  <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                ) : translatedCount > 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 drop-shadow" />
                ) : null}
              </div>

              {/* 削除ボタン */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePage(idx);
                }}
                className="absolute top-0.5 right-0.5 p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded opacity-0 group-hover:opacity-100 transition shadow"
                title="このページを削除"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        {/* ページ追加ボタン */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-slate-700 hover:border-teal-500/70 hover:bg-slate-800/60 flex flex-col items-center justify-center text-slate-500 hover:text-teal-400 transition"
          title="画像ファイルを追加"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">追加</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* 右側余白/ヒント */}
      <div className="text-[11px] text-slate-500 hidden sm:block">
        ドラッグ＆ドロップで画像追加可能
      </div>
    </div>
  );
};

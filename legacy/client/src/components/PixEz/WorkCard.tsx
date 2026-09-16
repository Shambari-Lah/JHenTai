import React from 'react';
import { Heart, Layers, Sparkles, User, Tag } from 'lucide-react';
import { VisualWork } from '../../types';
import { SearchEngine } from '../../services/searchEngine';

interface WorkCardProps {
  work: VisualWork;
  onSelectWork: (work: VisualWork) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onTagClick?: (tag: string, e: React.MouseEvent) => void;
  lang?: 'ja' | 'en' | 'zh';
}

export const WorkCard: React.FC<WorkCardProps> = ({
  work,
  onSelectWork,
  onToggleFavorite,
  onTagClick,
  lang = 'ja'
}) => {
  return (
    <div
      onClick={() => onSelectWork(work)}
      className="group relative bg-slate-900 dark:bg-slate-900/90 rounded-2xl overflow-hidden border border-slate-800/80 hover:border-teal-500/60 shadow-lg hover:shadow-teal-500/10 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      {/* カバー画像 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
        <img
          src={work.coverUrl}
          alt={work.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* グラデーションオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

        {/* ページ数バッジ */}
        <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-200 flex items-center gap-1 border border-white/10">
          <Layers className="w-3 h-3 text-teal-400" />
          <span>{work.pages.length} P</span>
        </div>

        {/* お気に入りハートボタン */}
        <button
          onClick={(e) => onToggleFavorite(work.id, e)}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition shadow-md ${
            work.isFavorite
              ? 'bg-rose-500 text-white scale-110 shadow-rose-500/30'
              : 'bg-black/50 text-slate-300 hover:text-rose-400 hover:bg-black/70'
          }`}
          title={work.isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
        >
          <Heart className={`w-3.5 h-3.5 ${work.isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* 翻訳・エディタアクション */}
        <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="bg-teal-600/90 hover:bg-teal-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg">
            <Sparkles className="w-3 h-3" />
            <span>翻訳する</span>
          </span>
        </div>
      </div>

      {/* カード詳細情報 */}
      <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
        <div>
          <h3 className="text-xs md:text-sm font-bold text-white group-hover:text-teal-300 transition line-clamp-1">
            {work.title}
          </h3>

          {/* 作者名 */}
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
            <User className="w-3 h-3 text-slate-500" />
            <span className="truncate">{work.author}</span>
          </div>
        </div>

        {/* タグリスト */}
        <div className="flex flex-wrap gap-1 pt-1">
          {work.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              onClick={(e) => {
                if (onTagClick) onTagClick(tag, e);
              }}
              className="text-[10px] px-1.5 py-0.5 bg-slate-800 hover:bg-teal-950/80 hover:text-teal-300 text-slate-400 rounded-md border border-slate-700/60 transition"
            >
              #{SearchEngine.getLocalizedTag(tag, lang)}
            </span>
          ))}
          {work.tags.length > 3 && (
            <span className="text-[10px] text-slate-500 px-1 py-0.5">
              +{work.tags.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

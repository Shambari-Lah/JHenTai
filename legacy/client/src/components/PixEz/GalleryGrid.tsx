import React, { useState } from 'react';
import { 
  Search, 
  RotateCw, 
  Tag, 
  Filter, 
  X, 
  Layers, 
  Sparkles, 
  Flame, 
  Plus, 
  Minus 
} from 'lucide-react';
import { VisualWork, SearchFilter } from '../../types';
import { WorkCard } from './WorkCard';
import { SearchEngine } from '../../services/searchEngine';

interface GalleryGridProps {
  works: VisualWork[];
  onSelectWork: (work: VisualWork) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  filter: SearchFilter;
  onUpdateFilter: (updates: Partial<SearchFilter>) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  works,
  onSelectWork,
  onToggleFavorite,
  filter,
  onUpdateFilter,
  onRefresh,
  isRefreshing
}) => {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const favoriteTags = SearchEngine.getFavoriteTags();

  // フィルタリング適用後の作品
  const filteredWorks = SearchEngine.filterWorks(works, filter);

  // タグクリックハンドラ
  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!filter.includeTags.includes(tag)) {
      onUpdateFilter({
        includeTags: [...filter.includeTags, tag]
      });
    }
  };

  const handleRemoveIncludeTag = (tag: string) => {
    onUpdateFilter({
      includeTags: filter.includeTags.filter(t => t !== tag)
    });
  };

  const handleRemoveExcludeTag = (tag: string) => {
    onUpdateFilter({
      excludeTags: filter.excludeTags.filter(t => t !== tag)
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6 space-y-4 select-none">
      {/* 検索・フィルターヘッダー */}
      <div className="max-w-4xl mx-auto space-y-3">
        {/* 検索入力ボックス */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-2 shadow-lg focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filter.query}
            onChange={(e) => onUpdateFilter({ query: e.target.value })}
            placeholder="タイトル・作者・キーワード（例: 桃太郎 +color -rough）"
            className="flex-1 bg-transparent text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {filter.query && (
            <button
              onClick={() => onUpdateFilter({ query: '' })}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              showAdvancedSearch || filter.includeTags.length > 0 || filter.excludeTags.length > 0
                ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="タグ絞り込み・詳細条件"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">条件</span>
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`p-1.5 text-slate-400 hover:text-teal-400 transition ${isRefreshing ? 'animate-spin text-teal-400' : ''}`}
              title="作品一覧を更新"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 選択中のタグバッジ一覧 */}
        {(filter.includeTags.length > 0 || filter.excludeTags.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] text-slate-400 mr-1">適用中のタグ:</span>
            {filter.includeTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-950 border border-teal-500/60 text-teal-300 text-[11px] font-medium shadow-sm"
              >
                <span>+{tag}</span>
                <button onClick={() => handleRemoveIncludeTag(tag)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {filter.excludeTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-500/60 text-rose-300 text-[11px] font-medium shadow-sm"
              >
                <span>-{tag}</span>
                <button onClick={() => handleRemoveExcludeTag(tag)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => onUpdateFilter({ includeTags: [], excludeTags: [] })}
              className="text-[10px] text-slate-400 hover:text-slate-200 underline ml-2"
            >
              すべてクリア
            </button>
          </div>
        )}

        {/* クイックタグセレクター（おすすめ・お気に入りタグ） */}
        {showAdvancedSearch && (
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-teal-400" />
                <span>クイックタグフィルター</span>
              </span>
              <span className="text-[10px] text-slate-500">クリックで追加 / Alt+クリックで除外</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {favoriteTags.map(tag => {
                const isIncluded = filter.includeTags.includes(tag);
                const isExcluded = filter.excludeTags.includes(tag);

                return (
                  <button
                    key={tag}
                    onClick={(e) => {
                      if (e.altKey) {
                        // 除外タグに追加
                        if (isExcluded) {
                          handleRemoveExcludeTag(tag);
                        } else {
                          onUpdateFilter({
                            includeTags: filter.includeTags.filter(t => t !== tag),
                            excludeTags: [...filter.excludeTags, tag]
                          });
                        }
                      } else {
                        // 含むタグに追加
                        if (isIncluded) {
                          handleRemoveIncludeTag(tag);
                        } else {
                          onUpdateFilter({
                            includeTags: [...filter.includeTags, tag],
                            excludeTags: filter.excludeTags.filter(t => t !== tag)
                          });
                        }
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      isIncluded
                        ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                        : isExcluded
                        ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-teal-500/50'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 作品カードグリッド (PixEz風レスポンシブレイアウト) */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
          <span>{filteredWorks.length} 件の作品</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onUpdateFilter({ sortBy: 'popular' })}
              className={`hover:text-white transition ${filter.sortBy === 'popular' ? 'text-teal-400 font-bold' : ''}`}
            >
              人気順
            </button>
            <span>•</span>
            <button
              onClick={() => onUpdateFilter({ sortBy: 'recent' })}
              className={`hover:text-white transition ${filter.sortBy === 'recent' ? 'text-teal-400 font-bold' : ''}`}
            >
              新着順
            </button>
          </div>
        </div>

        {filteredWorks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {filteredWorks.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                onSelectWork={onSelectWork}
                onToggleFavorite={onToggleFavorite}
                onTagClick={handleTagClick}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 space-y-2">
            <Layers className="w-12 h-12 opacity-30" />
            <p className="text-sm font-semibold">該当する作品が見つかりませんでした</p>
            <p className="text-xs text-slate-600">検索条件を変更するか、タグをリセットしてください</p>
          </div>
        )}
      </div>
    </div>
  );
};

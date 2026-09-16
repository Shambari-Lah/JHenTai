import React from 'react';
import { Flame, Sparkles, Search, Heart, Edit3 } from 'lucide-react';

export type MainTabType = 'popular' | 'recent' | 'search' | 'favorites' | 'editor';

interface TabBarProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  favoritesCount?: number;
  hasActiveWork?: boolean;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onSelectTab,
  favoritesCount = 0,
  hasActiveWork = false
}) => {
  const tabs: { id: MainTabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'popular', label: '人気', icon: <Flame className="w-4 h-4 text-amber-400" /> },
    { id: 'recent', label: '新着', icon: <Sparkles className="w-4 h-4 text-teal-400" /> },
    { id: 'search', label: '検索', icon: <Search className="w-4 h-4 text-sky-400" /> },
    { id: 'favorites', label: 'お気に入り', icon: <Heart className="w-4 h-4 text-rose-400" />, badge: favoritesCount },
    { id: 'editor', label: '翻訳エディタ', icon: <Edit3 className="w-4 h-4 text-indigo-400" /> }
  ];

  return (
    <nav className="flex items-center justify-around sm:justify-start sm:space-x-2 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-3 py-1.5 z-30 select-none shadow-sm">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all relative ${
              isActive
                ? 'bg-teal-600/20 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>

            {/* バッジ表示 */}
            {typeof tab.badge === 'number' && tab.badge > 0 && (
              <span className="ml-1 text-[9px] bg-rose-500 text-white font-mono px-1.5 py-0.2 rounded-full font-bold">
                {tab.badge}
              </span>
            )}

            {/* エディタ編集中インジケーター */}
            {tab.id === 'editor' && hasActiveWork && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

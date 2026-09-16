import React from 'react';
import { 
  X, 
  Flame, 
  Sparkles, 
  Search, 
  Heart, 
  Edit3, 
  Puzzle, 
  Settings, 
  Smartphone, 
  ShieldCheck, 
  Moon, 
  Sun, 
  Globe 
} from 'lucide-react';
import { MainTabType } from './TabBar';
import { AppSettings } from '../../types';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  onOpenPlugins: () => void;
  onOpenSettings: () => void;
  onOpenAndroidGuide: () => void;
  onOpenTerms: () => void;
  settings: AppSettings;
  onToggleTheme: () => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenPlugins,
  onOpenSettings,
  onOpenAndroidGuide,
  onOpenTerms,
  settings,
  onToggleTheme
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex select-none">
      {/* 背景オーバーレイ */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* スライドメニュー本体 */}
      <div className="relative w-72 sm:w-80 bg-slate-900 border-r border-slate-800 h-full flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
        <div>
          {/* ヘッダー */}
          <div className="p-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">視覚翻訳 PixEz</h2>
                <p className="text-[10px] text-slate-400">Visual Content Translator</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* メインナビゲーション */}
          <div className="p-3 space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase px-3 py-1 tracking-wider">
              コンテンツ・閲覧
            </div>

            <button
              onClick={() => { onSelectTab('popular'); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'popular' ? 'bg-teal-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-400" />
              <span>人気作品 (Popular)</span>
            </button>

            <button
              onClick={() => { onSelectTab('recent'); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'recent' ? 'bg-teal-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>新着作品 (Recent)</span>
            </button>

            <button
              onClick={() => { onSelectTab('search'); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'search' ? 'bg-teal-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4 text-sky-400" />
              <span>タグ検索・絞り込み</span>
            </button>

            <button
              onClick={() => { onSelectTab('favorites'); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'favorites' ? 'bg-teal-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Heart className="w-4 h-4 text-rose-400" />
              <span>お気に入り作品</span>
            </button>

            <button
              onClick={() => { onSelectTab('editor'); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'editor' ? 'bg-teal-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Edit3 className="w-4 h-4 text-indigo-400" />
              <span>翻訳キャンバスエディタ</span>
            </button>

            {/* プラグイン & ツール */}
            <div className="text-[10px] font-bold text-slate-500 uppercase px-3 pt-3 pb-1 tracking-wider">
              拡張システム & 設定
            </div>

            <button
              onClick={() => { onOpenPlugins(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              <Puzzle className="w-4 h-4 text-purple-400" />
              <span>ギャラリー解析プラグイン</span>
            </button>

            <button
              onClick={() => { onOpenSettings(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              <Settings className="w-4 h-4 text-teal-400" />
              <span>Cloud Vision / 翻訳設定</span>
            </button>

            <button
              onClick={() => { onOpenAndroidGuide(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Android APK ダウンロード</span>
            </button>

            <button
              onClick={() => { onOpenTerms(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>利用規約 & 著作権について</span>
            </button>
          </div>
        </div>

        {/* フッター (テーマ切替 & バージョン) */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            {settings.theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>ライトテーマ</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-sky-300" />
                <span>ダークテーマ</span>
              </>
            )}
          </button>
          <span className="text-[10px] font-mono text-slate-500">v2.0 PixEz</span>
        </div>
      </div>
    </div>
  );
};

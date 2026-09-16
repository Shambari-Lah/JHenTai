import React from 'react';
import { 
  Globe, 
  Languages, 
  Settings, 
  Download, 
  Sparkles, 
  BookOpen, 
  Layers, 
  ShieldCheck, 
  Smartphone,
  ScanText,
  Menu,
  Sun,
  Moon,
  Puzzle
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, RenderMode, AppSettings } from '../types';

interface HeaderProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenSettings: () => void;
  onOpenTerms: () => void;
  onOpenGallery: () => void;
  onOpenPlugins: () => void;
  onOpenAndroidGuide: () => void;
  onOpenDrawer: () => void;
  onToggleTheme: () => void;
  onRunOcr: () => void;
  onRunTranslate: () => void;
  onExportImage: () => void;
  isOcrRunning?: boolean;
  isTranslating?: boolean;
  hasActiveImage: boolean;
  isEditorActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  onOpenSettings,
  onOpenTerms,
  onOpenGallery,
  onOpenPlugins,
  onOpenAndroidGuide,
  onOpenDrawer,
  onToggleTheme,
  onRunOcr,
  onRunTranslate,
  onExportImage,
  isOcrRunning,
  isTranslating,
  hasActiveImage,
  isEditorActive = false
}) => {
  return (
    <header className="h-16 bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-800 px-3 md:px-5 flex items-center justify-between z-30 select-none shadow-md">
      {/* 左側: ドロワーボタン & ロゴ */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={onOpenDrawer}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
          title="メニューを開く"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>多言語視覚コンテンツ翻訳</span>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 font-semibold px-2 py-0.2 rounded-full border border-teal-500/30">
                PixEz Edition
              </span>
            </h1>
          </div>
        </div>
      </div>

      {/* 中央/右側: 言語選択・モード・アクション */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* 言語ペアセレクター (エディタ表示時) */}
        {isEditorActive && (
          <div className="hidden lg:flex items-center bg-slate-950/80 rounded-xl p-1 border border-slate-800 text-xs">
            <div className="flex items-center px-2 py-1 text-slate-300">
              <span className="text-[11px] text-slate-400 mr-1.5">原文:</span>
              <select
                value={settings.sourceLang}
                onChange={(e) => onUpdateSettings({ sourceLang: e.target.value })}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-800 text-white">
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-teal-400 font-bold px-1">➔</div>

            <div className="flex items-center px-2 py-1 text-slate-300">
              <span className="text-[11px] text-slate-400 mr-1.5">訳文:</span>
              <select
                value={settings.targetLang}
                onChange={(e) => onUpdateSettings({ targetLang: e.target.value })}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-800 text-white">
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 表示モードセレクター (エディタ表示時) */}
        {isEditorActive && (
          <div className="hidden sm:flex bg-slate-950/80 rounded-xl p-1 border border-slate-800 text-xs">
            <button
              onClick={() => onUpdateSettings({ renderMode: 'inpainted' })}
              className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                settings.renderMode === 'inpainted' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="スマート背景インペインティング合成"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>合成</span>
            </button>
            <button
              onClick={() => onUpdateSettings({ renderMode: 'overlay' })}
              className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                settings.renderMode === 'overlay' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="オーバーレイ字幕"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>字幕</span>
            </button>
            <button
              onClick={() => onUpdateSettings({ renderMode: 'original' })}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                settings.renderMode === 'original' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="原文表示"
            >
              原文
            </button>
          </div>
        )}

        {/* エディタ専用アクションボタン */}
        {isEditorActive && (
          <div className="flex items-center space-x-1 md:space-x-2">
            {/* 文字認識 (Cloud Vision API / Tesseract) */}
            <button
              disabled={!hasActiveImage || isOcrRunning}
              onClick={onRunOcr}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl shadow transition ${
                hasActiveImage && !isOcrRunning
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              title={settings.ocrEngine === 'cloud_vision' ? 'Google Cloud Vision API で高精度文字認識' : '文字認識を実行'}
            >
              <ScanText className={`w-3.5 h-3.5 ${isOcrRunning ? 'animate-spin' : ''}`} />
              <span>{isOcrRunning ? '認識中...' : settings.ocrEngine === 'cloud_vision' ? 'Cloud Vision' : '文字認識'}</span>
            </button>

            {/* 一括翻訳 */}
            <button
              disabled={!hasActiveImage || isTranslating}
              onClick={onRunTranslate}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl shadow transition ${
                hasActiveImage && !isTranslating
                  ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              title="全テキストを一括翻訳"
            >
              <Languages className={`w-3.5 h-3.5 ${isTranslating ? 'animate-pulse' : ''}`} />
              <span>{isTranslating ? '翻訳中...' : '翻訳'}</span>
            </button>

            {/* ダウンロード */}
            <button
              disabled={!hasActiveImage}
              onClick={onExportImage}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="画像をダウンロード (PNG)"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 共通アクション */}
        <div className="flex items-center space-x-1">
          {/* プラグイン管理 */}
          <button
            onClick={onOpenPlugins}
            className="p-2 text-slate-300 hover:text-purple-400 hover:bg-slate-800 rounded-xl transition"
            title="ギャラリー解析プラグイン管理"
          >
            <Puzzle className="w-4 h-4 text-purple-400" />
          </button>

          {/* Android APK */}
          <button
            onClick={onOpenAndroidGuide}
            className="p-2 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition"
            title="Android APK をダウンロード"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
          </button>

          {/* 設定 */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="Cloud Vision / 翻訳設定"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* テーマ切替 */}
          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-300 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition"
            title="テーマ切り替え (ダーク/ライト)"
          >
            {settings.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};

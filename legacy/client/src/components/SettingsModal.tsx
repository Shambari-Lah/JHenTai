import React from 'react';
import { X, Key, Type, Palette, Sparkles, Check, ScanText, Eye } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) => {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ヘッダー */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">OCR & 翻訳エンジン設定</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 設定フォーム */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* 1. OCR エンジン選択 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ScanText className="w-4 h-4 text-teal-400" />
              <span>文字認識 (OCR) エンジン</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, ocrEngine: 'cloud_vision' })}
                className={`p-3 rounded-xl border text-left transition ${
                  localSettings.ocrEngine === 'cloud_vision'
                    ? 'bg-teal-950/80 border-teal-500 text-teal-300 ring-1 ring-teal-500/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-teal-300">Cloud Vision</div>
                <div className="text-[10px] text-slate-400 mt-0.5">最高精度 (推奨)</div>
              </button>

              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, ocrEngine: 'gemini' })}
                className={`p-3 rounded-xl border text-left transition ${
                  localSettings.ocrEngine === 'gemini'
                    ? 'bg-teal-950/80 border-teal-500 text-teal-300 ring-1 ring-teal-500/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-indigo-300">Gemini Vision</div>
                <div className="text-[10px] text-slate-400 mt-0.5">擬音・手書き特化</div>
              </button>

              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, ocrEngine: 'tesseract' })}
                className={`p-3 rounded-xl border text-left transition ${
                  localSettings.ocrEngine === 'tesseract'
                    ? 'bg-teal-950/80 border-teal-500 text-teal-300 ring-1 ring-teal-500/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold">Tesseract.js</div>
                <div className="text-[10px] text-slate-400 mt-0.5">ローカル無料 (キー不要)</div>
              </button>
            </div>
          </div>

          {/* Cloud Vision API キー入力 */}
          {localSettings.ocrEngine === 'cloud_vision' && (
            <div className="p-3.5 bg-teal-950/40 border border-teal-800/60 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-teal-300 text-xs font-semibold">
                <Key className="w-4 h-4 text-teal-400" />
                <span>Google Cloud Vision API Key</span>
              </div>
              <input
                type="password"
                value={localSettings.cloudVisionApiKey || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, cloudVisionApiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full bg-slate-900 border border-teal-700/60 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 font-mono"
              />
              <p className="text-[10px] text-teal-300/80">
                Google Cloud Console で発行した Vision API キーを入力してください。未入力時はローカルOCRに自動フォールバックします。
              </p>
            </div>
          )}

          {/* 2. 翻訳プロバイダ選択 */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-300 block">
              翻訳エンジン (プロバイダ)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, translationProvider: 'auto' })}
                className={`p-3 rounded-xl border text-left transition ${
                  localSettings.translationProvider === 'auto'
                    ? 'bg-teal-950/80 border-teal-500 text-teal-300 ring-1 ring-teal-500/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold">無料自動</div>
                <div className="text-[10px] text-slate-400 mt-0.5">MyMemory (キー不要)</div>
              </button>

              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, translationProvider: 'gemini' })}
                className={`p-3 rounded-xl border text-left transition ${
                  localSettings.translationProvider === 'gemini'
                    ? 'bg-teal-950/80 border-teal-500 text-teal-300 ring-1 ring-teal-500/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-indigo-300">Gemini AI</div>
                <div className="text-[10px] text-slate-400 mt-0.5">文脈・ストーリー翻訳</div>
              </button>

              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, translationProvider: 'deepl' })}
                className={`p-3 rounded-xl border text-left transition ${
                  localSettings.translationProvider === 'deepl'
                    ? 'bg-teal-950/80 border-teal-500 text-teal-300 ring-1 ring-teal-500/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-sky-300">DeepL</div>
                <div className="text-[10px] text-slate-400 mt-0.5">高品位な訳文</div>
              </button>
            </div>
          </div>

          {/* Gemini API キー入力 */}
          {(localSettings.translationProvider === 'gemini' || localSettings.ocrEngine === 'gemini') && (
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold">
                <Key className="w-4 h-4" />
                <span>Google Gemini API Key</span>
              </div>
              <input
                type="password"
                value={localSettings.geminiApiKey}
                onChange={(e) => setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full bg-slate-900 border border-indigo-700/60 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
              />
            </div>
          )}

          {/* DeepL API キー入力 */}
          {localSettings.translationProvider === 'deepl' && (
            <div className="p-3.5 bg-sky-950/40 border border-sky-800/60 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-sky-300 text-xs font-semibold">
                <Key className="w-4 h-4" />
                <span>DeepL API Key (Free / Pro)</span>
              </div>
              <input
                type="password"
                value={localSettings.deeplApiKey}
                onChange={(e) => setLocalSettings({ ...localSettings, deeplApiKey: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx"
                className="w-full bg-slate-900 border border-sky-700/60 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
              />
            </div>
          )}

          {/* フォント設定 */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <Type className="w-4 h-4 text-teal-400" />
              <span>標準合成フォント</span>
            </div>
            <select
              value={localSettings.fontFamily}
              onChange={(e) => setLocalSettings({ ...localSettings, fontFamily: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
            >
              <option value='"M PLUS Rounded 1c", sans-serif'>コミック丸ゴシック (M PLUS Rounded 1c)</option>
              <option value='"Kosugi Maru", sans-serif'>手書き風丸ゴシック (Kosugi Maru)</option>
              <option value='"Noto Sans JP", sans-serif'>標準ゴシック (Noto Sans JP)</option>
              <option value='sans-serif'>システム標準サンセリフ</option>
            </select>
          </div>

          {/* デフォルト色設定 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">文字色</label>
              <div className="flex items-center space-x-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                <input
                  type="color"
                  value={localSettings.defaultFontColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, defaultFontColor: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs font-mono text-slate-300">{localSettings.defaultFontColor}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">縁取り色</label>
              <div className="flex items-center space-x-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                <input
                  type="color"
                  value={localSettings.defaultStrokeColor}
                  onChange={(e) => setLocalSettings({ ...localSettings, defaultStrokeColor: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs font-mono text-slate-300">{localSettings.defaultStrokeColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5 transition shadow-lg shadow-teal-600/30"
          >
            <Check className="w-4 h-4" />
            <span>設定を保存</span>
          </button>
        </div>
      </div>
    </div>
  );
};

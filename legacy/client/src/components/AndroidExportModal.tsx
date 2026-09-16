import React, { useState } from 'react';
import { X, Smartphone, Copy, Check, Terminal, ShieldCheck, PlayCircle } from 'lucide-react';

interface AndroidExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidExportModal: React.FC<AndroidExportModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: '1. フロントエンドのプロダクションビルド',
      desc: 'Reactアプリケーションを Capacitor 用の静的ファイルにコンパイルします。',
      cmd: 'cd client\nnpm run build'
    },
    {
      title: '2. Android プラットフォームの初期化と同期',
      desc: 'Capacitor Android プロジェクトを生成し、最新のビルド成果物とプラグインを同期します。',
      cmd: 'npx cap add android\nnpx cap sync'
    },
    {
      title: '3. Android Studio でプロジェクトを開く',
      desc: 'Android Studio が起動し、実機やエミュレータでの実行、および APK / AAB の署名ビルドが可能になります。',
      cmd: 'npx cap open android'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* ヘッダー */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Android アプリ化・APKビルド手順</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ガイド本文 */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/60 rounded-xl text-emerald-200 space-y-3">
            <div>
              <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5 text-emerald-300">
                <span>🎉 Android APK (Debug) ビルド完了！</span>
              </h3>
              <p className="text-slate-300 text-xs">
                本マシン上で直接コンパイルされた Android 用 APK ファイルが用意されています。下のボタンから直接ダウンロードして Android 端末にインストールできます。
              </p>
            </div>
            <div>
              <a
                href="/app-debug.apk"
                download="VisualTranslator-debug.apk"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-600/40 transition"
              >
                <Smartphone className="w-4 h-4" />
                <span>📥 APKファイルを直接ダウンロード (約3.8MB)</span>
              </a>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {steps.map((step, idx) => (
              <div key={idx} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200">{step.title}</h4>
                  <button
                    onClick={() => copyToClipboard(step.cmd, idx)}
                    className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-medium"
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIndex === idx ? 'コピー完了' : 'コマンドをコピー'}</span>
                  </button>
                </div>
                <p className="text-slate-400 text-[11px]">{step.desc}</p>
                <pre className="bg-slate-950 p-2.5 rounded-lg font-mono text-emerald-300 text-[11px] overflow-x-auto border border-slate-800">
                  {step.cmd}
                </pre>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Androidパーミッションと最適化</span>
            </h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              端末のカメラやアルバム写真の読み込みには、`android/app/src/main/AndroidManifest.xml` にて `READ_EXTERNAL_STORAGE` および `CAMERA` 権限が付与されます。また、ハードウェアアクセラレーション Canvas API により、スマホ画面でも高速かつ滑らかな描画が可能です。
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/30"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

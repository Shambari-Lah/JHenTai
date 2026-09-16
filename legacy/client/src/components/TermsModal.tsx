import React from 'react';
import { X, ShieldCheck, HeartHandshake, AlertCircle } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* ヘッダー */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">利用規約・著作権ガイドライン</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 本文 */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-3.5 bg-teal-950/40 border border-teal-800/60 rounded-xl flex items-start space-x-3 text-teal-200">
            <HeartHandshake className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm mb-1">開発目的と理念</h3>
              <p>
                本ツール「多言語視覚コンテンツ翻訳ツール (Multilingual Visual Content Translator)」は、世界中の優れた絵物語や視覚的ストーリーテリング作品を通じた<strong>多文化理解の促進および言語学習の支援</strong>を目的として開発されています。
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1">
              1. 著作権の尊重と適法利用について
            </h4>
            <p>
              コンテンツの翻訳・合成機能を利用する際は、著作権法および関係法令を遵守してください。パブリックドメイン作品、クリエイティブ・コモンズ等の許諾を受けた作品、または個人的・家庭内での私的使用の範囲内でご利用ください。
            </p>

            <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1">
              2. ユーザーの責任
            </h4>
            <p>
              本ツールを介して読み込まれた画像、取得したテキスト、生成された翻訳画像について、第三者の知的財産権を侵害する行為や、権利者の許諾のない無断再配布・商業利用は禁止されています。利用者がご自身の責任と判断においてご利用ください。
            </p>

            <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1">
              3. 翻訳結果の正確性と免責
            </h4>
            <p>
              本ツールで提供される自動OCR（文字認識）および機械翻訳・AI翻訳は、その完全性や正確性を保証するものではありません。特に手書き文字や擬音・オノマトペ等の表現には独自の文化的ニュアンスが含まれるため、学習や文化理解の補助ツールとしてご利用ください。
            </p>
          </div>

          <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center space-x-2 text-slate-400 text-[11px]">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>上記の内容をご理解の上、適切な範囲でお楽しみください。</span>
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-end space-x-2">
          <button
            onClick={() => {
              if (onAccept) onAccept();
              onClose();
            }}
            className="px-6 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition shadow-lg shadow-teal-600/30"
          >
            同意して閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

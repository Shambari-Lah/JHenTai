import React, { useState, useEffect } from 'react';
import { X, BookOpen, Link, Globe, Upload, Check, Loader2, Sparkles } from 'lucide-react';
import { ImagePage } from '../types';

interface VisualStorySample {
  id: string;
  title: string;
  language: string;
  description: string;
  pages: {
    pageNumber: number;
    title: string;
    imageUrl: string;
    initialRegions?: any[];
  }[];
}

interface GalleryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadStory: (pages: ImagePage[]) => void;
  onAddFromUrl: (url: string) => Promise<void>;
  onAddFiles: (files: FileList | File[]) => void;
}

export const GalleryImportModal: React.FC<GalleryImportModalProps> = ({
  isOpen,
  onClose,
  onLoadStory,
  onAddFromUrl,
  onAddFiles
}) => {
  const [activeTab, setActiveTab] = useState<'samples' | 'url' | 'scrape' | 'local'>('samples');
  const [samples, setSamples] = useState<VisualStorySample[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [pageUrlInput, setPageUrlInput] = useState('');
  const [scrapedImages, setScrapedImages] = useState<{ url: string; alt?: string }[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // サンプルデータの取得
  useEffect(() => {
    if (!isOpen) return;
    setLoadingSamples(true);
    fetch('/api/samples')
      .then(res => res.json())
      .then(data => {
        if (data.stories) setSamples(data.stories);
      })
      .catch(err => console.error('Failed to load samples:', err))
      .finally(() => setLoadingSamples(false));
  }, [isOpen]);

  if (!isOpen) return null;

  // サンプルストーリーをロード
  const handleSelectSample = (story: VisualStorySample) => {
    const pages: ImagePage[] = story.pages.map((p, idx) => ({
      id: `sample-${story.id}-${idx}-${Date.now()}`,
      name: `${story.title} - P.${p.pageNumber}`,
      sourceUrl: p.imageUrl,
      width: 800,
      height: 600,
      regions: (p.initialRegions || []).map((r, rIdx) => ({
        id: `reg-${Date.now()}-${rIdx}`,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        originalText: r.originalText,
        translatedText: r.translatedText || '',
        confidence: 99,
        direction: r.direction || 'horizontal',
        category: r.category || 'dialogue',
        rotation: 0
      }))
    }));
    onLoadStory(pages);
    onClose();
  };

  // 画像URLの読み込み
  const handleLoadUrl = async () => {
    if (!imageUrlInput.trim()) return;
    setIsProcessing(true);
    try {
      // CORS回避用プロキシURLを生成
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrlInput.trim())}`;
      await onAddFromUrl(proxyUrl);
      setImageUrlInput('');
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Webページギャラリースクレイピング
  const handleScrapeGallery = async () => {
    if (!pageUrlInput.trim()) return;
    setIsScraping(true);
    setScrapeError('');
    try {
      const res = await fetch('/api/scrape-gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pageUrlInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scrape');
      setScrapedImages(data.images || []);
    } catch (err: any) {
      setScrapeError(err.message);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* モーダルヘッダー */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">視覚コンテンツを開く・読み込む</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('samples')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'samples'
                ? 'border-teal-400 text-teal-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>サンプル絵物語 (推奨)</span>
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'url'
                ? 'border-teal-400 text-teal-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>画像URLから</span>
          </button>
          <button
            onClick={() => setActiveTab('scrape')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'scrape'
                ? 'border-teal-400 text-teal-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Webギャラリー解析</span>
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'local'
                ? 'border-teal-400 text-teal-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>ローカルファイル</span>
          </button>
        </div>

        {/* タブコンテンツ */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 1. サンプル絵物語タブ */}
          {activeTab === 'samples' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                あらかじめ日本語と英語の絵物語サンプルが内蔵されています。クリックすると即座に読み込まれ、OCRやテキスト合成・擬音翻訳をすぐに試すことができます。
              </p>

              {loadingSamples ? (
                <div className="flex items-center justify-center py-12 text-teal-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {samples.map((story) => (
                    <div
                      key={story.id}
                      onClick={() => handleSelectSample(story)}
                      className="p-3.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500/50 rounded-xl cursor-pointer transition group shadow-lg flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-32 bg-slate-900 rounded-lg overflow-hidden mb-3 border border-slate-700 relative">
                          {story.pages[0] && (
                            <img
                              src={story.pages[0].imageUrl}
                              alt={story.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            />
                          )}
                          <div className="absolute top-2 right-2 bg-slate-900/80 text-[10px] font-mono text-teal-300 px-2 py-0.5 rounded-full border border-slate-700">
                            全 {story.pages.length} ページ
                          </div>
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition">
                          {story.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {story.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-teal-400 font-semibold">
                        <span>この作品を開く</span>
                        <span>➔</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. 画像URLタブ */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Web上に公開されている画像の直リンクURLを入力してください。バックエンドのプロキシ経由でCORS制限を回避して読み込みます。
              </p>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://example.com/story-page.jpg"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
                <button
                  disabled={!imageUrlInput.trim() || isProcessing}
                  onClick={handleLoadUrl}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>読み込む</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. ギャラリースクレイパータブ */}
          {activeTab === 'scrape' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                絵物語やWebコミックが掲載されているWebページのURLを入力すると、ページ内の画像を自動解析して一覧表示します。
              </p>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={pageUrlInput}
                  onChange={(e) => setPageUrlInput(e.target.value)}
                  placeholder="https://example.com/gallery"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
                <button
                  disabled={!pageUrlInput.trim() || isScraping}
                  onClick={handleScrapeGallery}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                >
                  {isScraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  <span>解析</span>
                </button>
              </div>

              {scrapeError && (
                <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-lg">
                  {scrapeError}
                </div>
              )}

              {scrapedImages.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-slate-300 font-semibold">
                    検出された画像 ({scrapedImages.length} 枚) - クリックして取り込み
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                    {scrapedImages.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(img.url)}`;
                          onAddFromUrl(proxyUrl);
                          onClose();
                        }}
                        className="h-24 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-teal-400 cursor-pointer transition group relative"
                      >
                        <img src={`/api/proxy-image?url=${encodeURIComponent(img.url)}`} alt={img.alt || ''} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-teal-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. ローカルファイルタブ */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    onAddFiles(e.dataTransfer.files);
                    onClose();
                  }
                }}
                className="border-2 border-dashed border-slate-700 hover:border-teal-500/70 bg-slate-800/40 rounded-xl p-8 flex flex-col items-center justify-center text-center transition cursor-pointer"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = 'image/*';
                  input.onchange = (e: any) => {
                    if (e.target.files && e.target.files.length > 0) {
                      onAddFiles(e.target.files);
                      onClose();
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="w-10 h-10 text-teal-400 mb-2" />
                <p className="text-sm font-bold text-white">画像ファイルをドラッグ＆ドロップ</p>
                <p className="text-xs text-slate-400 mt-1">またはクリックしてファイルを選択（複数選択対応）</p>
                <p className="text-[10px] text-slate-500 mt-3">対応形式: PNG, JPEG, WebP, GIF, SVG</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

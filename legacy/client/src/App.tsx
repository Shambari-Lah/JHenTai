import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { TabBar, MainTabType } from './components/PixEz/TabBar';
import { GalleryGrid } from './components/PixEz/GalleryGrid';
import { SideDrawer } from './components/PixEz/SideDrawer';
import { PluginManagerModal } from './components/PixEz/PluginManagerModal';
import { CanvasViewer } from './components/CanvasViewer';
import { ThumbnailStrip } from './components/ThumbnailStrip';
import { TextInspector } from './components/TextInspector';
import { SettingsModal } from './components/SettingsModal';
import { GalleryImportModal } from './components/GalleryImportModal';
import { TermsModal } from './components/TermsModal';
import { AndroidExportModal } from './components/AndroidExportModal';
import { ImagePage, TextRegion, AppSettings, VisualWork, SearchFilter, SUPPORTED_LANGUAGES } from './types';
import { runOcrOnImage } from './services/ocrService';
import { runCloudVisionOcr } from './services/cloudVisionService';
import { translateRegions, translateTexts } from './services/translationService';
import { SearchEngine } from './services/searchEngine';
import { saveAs } from 'file-saver';
import { Loader2, ArrowLeft } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  sourceLang: 'ja',
  targetLang: 'en',
  ocrEngine: 'cloud_vision',
  cloudVisionApiKey: '',
  translationProvider: 'auto',
  geminiApiKey: '',
  deeplApiKey: '',
  fontFamily: '"M PLUS Rounded 1c", sans-serif',
  defaultFontColor: '#111827',
  defaultStrokeColor: '#ffffff',
  defaultBgColor: '#ffffff',
  enableAutoInpaint: true,
  renderMode: 'inpainted',
  theme: 'dark'
};

export const App: React.FC = () => {
  // 設定
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('mvct_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // PixEz タブ
  const [activeTab, setActiveTab] = useState<MainTabType>('popular');

  // 作品一覧
  const [works, setWorks] = useState<VisualWork[]>([]);
  const [activeWork, setActiveWork] = useState<VisualWork | null>(null);

  // 検索フィルター
  const [searchFilter, setSearchFilter] = useState<SearchFilter>({
    query: '',
    includeTags: [],
    excludeTags: [],
    sortBy: 'popular',
    onlyFavorites: false
  });

  // エディタ内部状態 (現在開いている作品のページと選択領域)
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  // モーダル・ドロワー状態
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPluginManagerOpen, setIsPluginManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isAndroidGuideOpen, setIsAndroidGuideOpen] = useState(false);

  // レンダリング用Canvas参照
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // テーマ反映
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // 初回規約表示
  useEffect(() => {
    const accepted = localStorage.getItem('mvct_terms_accepted');
    if (!accepted) {
      setIsTermsOpen(true);
    }
  }, []);

  // 設定保存
  const handleUpdateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('mvct_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // テーマ切替
  const handleToggleTheme = () => {
    handleUpdateSettings({
      theme: settings.theme === 'dark' ? 'light' : 'dark'
    });
  };

  // 初期サンプル作品データの読み込み
  useEffect(() => {
    fetch('/api/samples')
      .then(res => res.json())
      .then(data => {
        if (data.stories && data.stories.length > 0) {
          const loadedWorks: VisualWork[] = data.stories.map((story: any, idx: number) => ({
            id: story.id,
            title: story.title,
            author: story.id.includes('jp') ? '日本の伝統伝承' : 'Global Adventurer',
            coverUrl: story.pages[0]?.imageUrl || '',
            description: story.description,
            tags: story.id.includes('jp') 
              ? ['漫画', '昔話', 'Folktale', 'Color', 'Sound_Effect'] 
              : ['Comic', 'Adventure', 'Fantasy', 'Color'],
            date: '2026-09-14',
            likes: idx === 0 ? 1280 : 890,
            isFavorite: idx === 0,
            pages: story.pages.map((p: any, pIdx: number) => ({
              id: `page-${story.id}-${pIdx}`,
              name: `${story.title} - P.${p.pageNumber}`,
              sourceUrl: p.imageUrl,
              width: 800,
              height: 600,
              regions: (p.initialRegions || []).map((r: any, rIdx: number) => ({
                id: `reg-${story.id}-${pIdx}-${rIdx}`,
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height,
                originalText: r.originalText,
                translatedText: r.translatedText || '',
                confidence: 98,
                direction: r.direction || 'horizontal',
                category: r.category || 'dialogue',
                rotation: 0
              }))
            }))
          }));

          setWorks(loadedWorks);
          // デフォルトで最初の作品をエディタにもロード
          setActiveWork(loadedWorks[0]);
        }
      })
      .catch(e => console.warn('Sample load error:', e));
  }, []);

  // お気に入りトグル
  const handleToggleFavorite = (workId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorks(prev => prev.map(w => w.id === workId ? { ...w, isFavorite: !w.isFavorite } : w));
    if (activeWork?.id === workId) {
      setActiveWork(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  // 作品選択 -> エディタへ移動
  const handleSelectWork = (work: VisualWork) => {
    setActiveWork(work);
    setCurrentPageIndex(0);
    setSelectedRegionId(null);
    setActiveTab('editor');
  };

  // プラグインで解析したアイテムを作品として取り込み
  const handleSelectParsedWorks = (parsedItems: any[]) => {
    const newWorks: VisualWork[] = parsedItems.map((item, idx) => ({
      id: `parsed-${Date.now()}-${idx}`,
      title: item.title || `Parsed Work #${idx + 1}`,
      author: item.author || 'Web Gallery',
      coverUrl: item.imageUrl,
      description: `URLからプラグイン解析された作品: ${item.detailUrl || ''}`,
      tags: item.tags?.length > 0 ? item.tags : ['WebGallery', 'Parsed'],
      date: new Date().toISOString().split('T')[0],
      likes: Math.floor(Math.random() * 500) + 50,
      isFavorite: false,
      pages: [
        {
          id: `parsed-page-${Date.now()}-${idx}`,
          name: item.title || `Page 1`,
          sourceUrl: `/api/proxy-image?url=${encodeURIComponent(item.imageUrl)}`,
          width: 800,
          height: 600,
          regions: []
        }
      ]
    }));

    setWorks(prev => [...newWorks, ...prev]);
    if (newWorks.length > 0) {
      handleSelectWork(newWorks[0]);
    }
  };

  // ----------------------------------------------------
  // OCR テキスト認識実行 (Cloud Vision API / Tesseract)
  // ----------------------------------------------------
  const currentPage = activeWork?.pages[currentPageIndex] || null;

  const handleRunOcr = async () => {
    if (!currentPage || !activeWork) return;

    // ステータス更新
    updateCurrentPage({
      isOcrRunning: true,
      ocrProgress: 0.1,
      ocrStatusText: settings.ocrEngine === 'cloud_vision' 
        ? 'Google Cloud Vision API で高精度解析中...' 
        : 'Tesseract OCR 実行中...'
    });

    try {
      let detectedRegions: TextRegion[] = [];

      // Google Cloud Vision API が指定され、キーがある場合
      if (settings.ocrEngine === 'cloud_vision' && settings.cloudVisionApiKey) {
        updateCurrentPage({ ocrProgress: 0.3, ocrStatusText: 'Cloud Vision API へリクエスト送信中...' });
        const res = await runCloudVisionOcr(currentPage.sourceUrl, settings.cloudVisionApiKey);
        detectedRegions = res.regions;
      } else {
        // Tesseract.js ローカルフォールバック
        const langOption = SUPPORTED_LANGUAGES.find(l => l.code === settings.sourceLang);
        const tesseractCode = langOption ? langOption.tesseractCode : 'jpn';

        detectedRegions = await runOcrOnImage(
          currentPage.sourceUrl,
          tesseractCode,
          (progress, status) => {
            updateCurrentPage({ ocrProgress: progress, ocrStatusText: status });
          }
        );
      }

      updateCurrentPage({
        regions: detectedRegions,
        isOcrRunning: false,
        ocrProgress: 1.0,
        ocrStatusText: `完了: ${detectedRegions.length} 箇所を検出`
      });

      if (detectedRegions.length > 0) {
        setSelectedRegionId(detectedRegions[0].id);
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      updateCurrentPage({
        isOcrRunning: false,
        ocrStatusText: `エラー: ${err.message}`
      });
      alert(`文字認識エラー: ${err.message}`);
    }
  };

  // ----------------------------------------------------
  // 一括翻訳実行
  // ----------------------------------------------------
  const handleRunTranslate = async () => {
    if (!currentPage || currentPage.regions.length === 0) return;

    updateCurrentPage({ isTranslating: true });

    try {
      const apiKey = settings.translationProvider === 'gemini' 
        ? settings.geminiApiKey 
        : settings.translationProvider === 'deepl' 
        ? settings.deeplApiKey 
        : undefined;

      const updatedRegions = await translateRegions(
        currentPage.regions,
        settings.sourceLang,
        settings.targetLang,
        settings.translationProvider,
        apiKey
      );

      updateCurrentPage({ regions: updatedRegions, isTranslating: false });
    } catch (err: any) {
      console.error('Translation Error:', err);
      updateCurrentPage({ isTranslating: false });
    }
  };

  // 単一テキスト再翻訳
  const handleTranslateSingle = async (region: TextRegion) => {
    try {
      const apiKey = settings.translationProvider === 'gemini' 
        ? settings.geminiApiKey 
        : settings.translationProvider === 'deepl' 
        ? settings.deeplApiKey 
        : undefined;

      const [translated] = await translateTexts({
        texts: [region.originalText],
        sourceLang: settings.sourceLang,
        targetLang: settings.targetLang,
        provider: settings.translationProvider,
        apiKey
      });

      handleUpdateRegion(region.id, { translatedText: translated || region.originalText });
    } catch (e) {
      console.error('Single translation failed:', e);
    }
  };

  // 現在のページヘルパー
  const updateCurrentPage = (updates: Partial<ImagePage>) => {
    if (!activeWork) return;
    const updatedPages = activeWork.pages.map((p, idx) => 
      idx === currentPageIndex ? { ...p, ...updates } : p
    );
    const updatedWork = { ...activeWork, pages: updatedPages };
    setActiveWork(updatedWork);
    setWorks(prev => prev.map(w => w.id === updatedWork.id ? updatedWork : w));
  };

  const handleUpdateRegion = (id: string, updates: Partial<TextRegion>) => {
    if (!currentPage) return;
    const newRegions = currentPage.regions.map(r => r.id === id ? { ...r, ...updates } : r);
    updateCurrentPage({ regions: newRegions });
  };

  const handleUpdateRegionCoords = (id: string, x: number, y: number, width: number, height: number) => {
    handleUpdateRegion(id, { x, y, width, height });
  };

  const handleAddRegion = (newRegion: Omit<TextRegion, 'id'>) => {
    if (!currentPage) return;
    const id = `user-reg-${Date.now()}`;
    const fullRegion: TextRegion = { ...newRegion, id };
    updateCurrentPage({ regions: [...currentPage.regions, fullRegion] });
    setSelectedRegionId(id);
  };

  const handleDeleteRegion = (id: string) => {
    if (!currentPage) return;
    updateCurrentPage({ regions: currentPage.regions.filter(r => r.id !== id) });
    if (selectedRegionId === id) setSelectedRegionId(null);
  };

  // 画像エクスポート
  const handleExportImage = () => {
    if (!activeCanvasRef.current || !currentPage) return;
    activeCanvasRef.current.toBlob(blob => {
      if (blob) {
        saveAs(blob, `translated_${currentPage.name.replace(/[^a-zA-Z0-9_\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '_')}.png`);
      }
    }, 'image/png');
  };

  // ページ追加/削除
  const handleAddFiles = (files: FileList | File[]) => {
    if (!activeWork) return;
    const newPages: ImagePage[] = Array.from(files).map((file, idx) => ({
      id: `local-page-${Date.now()}-${idx}`,
      name: file.name,
      sourceUrl: URL.createObjectURL(file),
      width: 800,
      height: 600,
      regions: []
    }));

    const updatedPages = [...activeWork.pages, ...newPages];
    const updatedWork = { ...activeWork, pages: updatedPages };
    setActiveWork(updatedWork);
    setWorks(prev => prev.map(w => w.id === updatedWork.id ? updatedWork : w));
  };

  const handleDeletePage = (index: number) => {
    if (!activeWork || activeWork.pages.length <= 1) return;
    const updatedPages = activeWork.pages.filter((_, idx) => idx !== index);
    const updatedWork = { ...activeWork, pages: updatedPages };
    setActiveWork(updatedWork);
    setWorks(prev => prev.map(w => w.id === updatedWork.id ? updatedWork : w));
    if (currentPageIndex >= updatedPages.length) {
      setCurrentPageIndex(Math.max(0, updatedPages.length - 1));
    }
  };

  const selectedRegion = currentPage?.regions.find(r => r.id === selectedRegionId) || null;
  const favoritesCount = works.filter(w => w.isFavorite).length;

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. トップヘッダー */}
      <Header
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTerms={() => setIsTermsOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenPlugins={() => setIsPluginManagerOpen(true)}
        onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onToggleTheme={handleToggleTheme}
        onRunOcr={handleRunOcr}
        onRunTranslate={handleRunTranslate}
        onExportImage={handleExportImage}
        isOcrRunning={currentPage?.isOcrRunning}
        isTranslating={currentPage?.isTranslating}
        hasActiveImage={!!currentPage}
        isEditorActive={activeTab === 'editor'}
      />

      {/* 2. PixEz タブバー */}
      <TabBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'favorites') {
            setSearchFilter(prev => ({ ...prev, onlyFavorites: true }));
          } else if (activeTab === 'favorites') {
            setSearchFilter(prev => ({ ...prev, onlyFavorites: false }));
          }
          if (tab === 'popular') {
            setSearchFilter(prev => ({ ...prev, sortBy: 'popular', onlyFavorites: false }));
          } else if (tab === 'recent') {
            setSearchFilter(prev => ({ ...prev, sortBy: 'recent', onlyFavorites: false }));
          }
          setActiveTab(tab);
        }}
        favoritesCount={favoritesCount}
        hasActiveWork={!!activeWork}
      />

      {/* OCR/翻訳ステータスバナー */}
      {activeTab === 'editor' && currentPage?.isOcrRunning && (
        <div className="bg-indigo-900/90 text-indigo-100 text-xs py-1.5 px-4 flex items-center justify-between z-20 border-b border-indigo-700 shadow">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
            <span>{currentPage.ocrStatusText || 'OCR実行中...'}</span>
          </div>
          <span className="font-mono">{Math.round((currentPage.ocrProgress || 0) * 100)}%</span>
        </div>
      )}

      {/* 3. メインビュー (タブ切り替え) */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeTab === 'editor' ? (
          /* --- 翻訳キャンバスエディタビュー --- */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            {/* キャンバスエリア */}
            <div className="flex-1 relative h-full flex flex-col">
              {/* 作品タイトルバー */}
              <div className="h-8 bg-slate-900/90 border-b border-slate-800 px-3 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('popular')}
                    className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-bold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>作品一覧へ</span>
                  </button>
                  <span className="text-slate-600">|</span>
                  <span className="font-bold truncate max-w-xs">{activeWork?.title}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  P. {currentPageIndex + 1} / {activeWork?.pages.length || 0}
                </div>
              </div>

              {/* キャンバスビューア */}
              <div className="flex-1 relative overflow-hidden">
                <CanvasViewer
                  page={currentPage}
                  selectedRegionId={selectedRegionId}
                  onSelectRegion={setSelectedRegionId}
                  onAddRegion={handleAddRegion}
                  onUpdateRegionCoords={handleUpdateRegionCoords}
                  settings={settings}
                  onRenderReady={(canvas) => {
                    activeCanvasRef.current = canvas;
                  }}
                />
              </div>

              {/* ボトムサムネイル */}
              <ThumbnailStrip
                pages={activeWork?.pages || []}
                currentPageIndex={currentPageIndex}
                onSelectPage={setCurrentPageIndex}
                onAddFiles={handleAddFiles}
                onDeletePage={handleDeletePage}
              />
            </div>

            {/* テキストインスペクター (右側) */}
            <TextInspector
              selectedRegion={selectedRegion}
              allRegions={currentPage?.regions || []}
              onSelectRegion={setSelectedRegionId}
              onUpdateRegion={handleUpdateRegion}
              onDeleteRegion={handleDeleteRegion}
              onTranslateSingle={handleTranslateSingle}
              targetLang={settings.targetLang}
            />
          </div>
        ) : (
          /* --- PixEz カードグリッドビュー (人気 / 新着 / 検索 / お気に入り) --- */
          <GalleryGrid
            works={works}
            onSelectWork={handleSelectWork}
            onToggleFavorite={handleToggleFavorite}
            filter={searchFilter}
            onUpdateFilter={(updates) => setSearchFilter(prev => ({ ...prev, ...updates }))}
          />
        )}
      </div>

      {/* サイドメニュー (Drawer) */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenPlugins={() => setIsPluginManagerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
        onOpenTerms={() => setIsTermsOpen(true)}
        settings={settings}
        onToggleTheme={handleToggleTheme}
      />

      {/* プラグイン管理モーダル */}
      <PluginManagerModal
        isOpen={isPluginManagerOpen}
        onClose={() => setIsPluginManagerOpen(false)}
        onSelectParsedWorks={handleSelectParsedWorks}
      />

      {/* 各種モーダル */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleUpdateSettings}
      />

      <GalleryImportModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onLoadStory={(storyPages) => {
          if (activeWork) {
            setActiveWork({ ...activeWork, pages: storyPages });
          }
        }}
        onAddFromUrl={async (url) => {
          if (activeWork) {
            const newPage: ImagePage = {
              id: `page-url-${Date.now()}`,
              name: `Imported Image`,
              sourceUrl: url,
              width: 800,
              height: 600,
              regions: []
            };
            setActiveWork({ ...activeWork, pages: [...activeWork.pages, newPage] });
          }
        }}
        onAddFiles={handleAddFiles}
      />

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        onAccept={() => localStorage.setItem('mvct_terms_accepted', 'true')}
      />

      <AndroidExportModal
        isOpen={isAndroidGuideOpen}
        onClose={() => setIsAndroidGuideOpen(false)}
      />
    </div>
  );
};

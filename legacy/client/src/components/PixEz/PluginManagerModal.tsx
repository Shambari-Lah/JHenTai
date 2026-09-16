import React, { useState, useEffect } from 'react';
import { 
  X, 
  Puzzle, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Play, 
  Check, 
  HelpCircle, 
  Code, 
  Loader2 
} from 'lucide-react';
import { GalleryPlugin } from '../../types';
import { PluginEngine } from '../../services/pluginEngine';

interface PluginManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectParsedWorks?: (works: any[]) => void;
}

export const PluginManagerModal: React.FC<PluginManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectParsedWorks
}) => {
  const [plugins, setPlugins] = useState<GalleryPlugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<GalleryPlugin | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // テスト実行用
  const [testUrl, setTestUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testError, setTestError] = useState('');

  // 編集用バッファ
  const [editForm, setEditForm] = useState<Partial<GalleryPlugin>>({
    id: '',
    name: '',
    description: '',
    siteUrlPattern: '',
    mode: 'html',
    itemSelector: '',
    imageSrcSelector: '',
    imageSrcAttr: 'src',
    titleSelector: '',
    tagsSelector: '',
    authorSelector: ''
  });

  const refreshPlugins = () => {
    setPlugins(PluginEngine.getPlugins());
  };

  useEffect(() => {
    if (isOpen) {
      refreshPlugins();
      setSelectedPlugin(PluginEngine.getPlugins()[0] || null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 新規作成開始
  const handleStartNew = () => {
    const newId = `custom-plugin-${Date.now()}`;
    setEditForm({
      id: newId,
      name: '新しいギャラリー解析ルール',
      description: '対象サイトのCSSセレクタを指定して画像とメタデータを抽出します',
      siteUrlPattern: '.*example\\.com.*',
      mode: 'html',
      itemSelector: '.gallery-item',
      imageSrcSelector: 'img',
      imageSrcAttr: 'src',
      titleSelector: '.title',
      tagsSelector: '.tag',
      authorSelector: '.author'
    });
    setIsEditing(true);
  };

  // 編集開始
  const handleStartEdit = (plugin: GalleryPlugin) => {
    setEditForm({ ...plugin });
    setIsEditing(true);
  };

  // 保存
  const handleSave = () => {
    if (!editForm.name || !editForm.id) return;
    PluginEngine.savePlugin(editForm as GalleryPlugin);
    refreshPlugins();
    setIsEditing(false);
    setSelectedPlugin(editForm as GalleryPlugin);
  };

  // 削除
  const handleDelete = (id: string) => {
    PluginEngine.deletePlugin(id);
    refreshPlugins();
    setSelectedPlugin(PluginEngine.getPlugins()[0] || null);
  };

  // テスト実行
  const handleRunTest = async () => {
    if (!testUrl.trim()) return;
    setIsTesting(true);
    setTestError('');
    setTestResult(null);

    try {
      const activeRule = isEditing ? (editForm as GalleryPlugin) : selectedPlugin;
      const result = await PluginEngine.parseUrl(testUrl.trim(), activeRule?.id);
      setTestResult(result);
    } catch (err: any) {
      setTestError(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  // JSONエクスポート
  const handleExport = () => {
    const json = PluginEngine.exportPluginsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gallery-plugins-${Date.now()}.json`;
    a.click();
  };

  // JSONインポート
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const count = PluginEngine.importPluginsJson(event.target?.result as string);
          refreshPlugins();
          alert(`${count} 件のプラグインルールをインポートしました。`);
        } catch (err: any) {
          alert(`インポート失敗: ${err.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ヘッダー */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Puzzle className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">ギャラリー解析プラグイン・ルール管理</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExport}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1 transition"
              title="ルールをJSONエクスポート"
            >
              <Download className="w-4 h-4 text-teal-400" />
              <span className="hidden sm:inline">書き出し</span>
            </button>
            <button
              onClick={handleImport}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1 transition"
              title="ルールをJSONインポート"
            >
              <Upload className="w-4 h-4 text-teal-400" />
              <span className="hidden sm:inline">読み込み</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2カラムボディ */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左側: プラグイン一覧 */}
          <div className="w-64 sm:w-72 bg-slate-950/60 border-r border-slate-800 flex flex-col justify-between p-3">
            <div className="space-y-1.5 overflow-y-auto flex-1">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">利用可能なルール</span>
                <button
                  onClick={handleStartNew}
                  className="p-1 text-teal-400 hover:bg-teal-950/80 rounded transition flex items-center gap-0.5 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新規</span>
                </button>
              </div>

              {plugins.map(plugin => {
                const isSelected = selectedPlugin?.id === plugin.id && !isEditing;
                return (
                  <div
                    key={plugin.id}
                    onClick={() => {
                      setSelectedPlugin(plugin);
                      setIsEditing(false);
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                      isSelected
                        ? 'bg-purple-950/70 border-purple-500 text-purple-200 shadow'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold truncate">{plugin.name}</h4>
                        {plugin.isPreset && (
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono">
                            公式
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{plugin.description}</p>
                    </div>

                    {!plugin.isPreset && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(plugin.id);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右側: プラグイン詳細/編集 & ライブテスト */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {isEditing ? (
              /* 編集フォーム */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-purple-400" />
                    <span>解析ルールの定義 (CSSセレクタ)</span>
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow transition"
                    >
                      保存する
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">ルール名</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">対象URLパターン (正規表現)</label>
                    <input
                      type="text"
                      value={editForm.siteUrlPattern || ''}
                      onChange={(e) => setEditForm({ ...editForm, siteUrlPattern: e.target.value })}
                      placeholder=".*example\\.com.*"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-slate-400 block mb-1">説明・メモ</label>
                    <input
                      type="text"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">アイテム要素セレクタ (itemSelector)</label>
                    <input
                      type="text"
                      value={editForm.itemSelector || ''}
                      onChange={(e) => setEditForm({ ...editForm, itemSelector: e.target.value })}
                      placeholder=".card, article, .item"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">画像タグ & 属性 (imageSrcSelector / Attr)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editForm.imageSrcSelector || ''}
                        onChange={(e) => setEditForm({ ...editForm, imageSrcSelector: e.target.value })}
                        placeholder="img"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                      />
                      <input
                        type="text"
                        value={editForm.imageSrcAttr || 'src'}
                        onChange={(e) => setEditForm({ ...editForm, imageSrcAttr: e.target.value })}
                        placeholder="src, data-src"
                        className="w-24 bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">タイトルセレクタ (titleSelector)</label>
                    <input
                      type="text"
                      value={editForm.titleSelector || ''}
                      onChange={(e) => setEditForm({ ...editForm, titleSelector: e.target.value })}
                      placeholder=".title, h2"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">タグ要素セレクタ (tagsSelector)</label>
                    <input
                      type="text"
                      value={editForm.tagsSelector || ''}
                      onChange={(e) => setEditForm({ ...editForm, tagsSelector: e.target.value })}
                      placeholder=".tag, a[rel='tag']"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : selectedPlugin ? (
              /* プラグイン閲覧 & ライブテスト */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{selectedPlugin.name}</span>
                      {selectedPlugin.isPreset ? (
                        <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-600 px-2 py-0.5 rounded-full">
                          公式ビルトイン
                        </span>
                      ) : (
                        <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-600 px-2 py-0.5 rounded-full">
                          カスタムルール
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{selectedPlugin.description}</p>
                  </div>

                  {!selectedPlugin.isPreset && (
                    <button
                      onClick={() => handleStartEdit(selectedPlugin)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition"
                    >
                      ルールを編集
                    </button>
                  )}
                </div>

                {/* ルール仕様カード */}
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block">URL Pattern:</span>
                    <span className="text-slate-300 truncate block">{selectedPlugin.siteUrlPattern}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Item Selector:</span>
                    <span className="text-teal-300 truncate block">{selectedPlugin.itemSelector || '(自動)'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Image Selector:</span>
                    <span className="text-teal-300 truncate block">{selectedPlugin.imageSrcSelector || 'img'}</span>
                  </div>
                </div>

                {/* ライブテスト実行セクション */}
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>このルールでライブテスト実行</span>
                  </h4>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                      placeholder="https://example.com/gallery"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                    />
                    <button
                      disabled={!testUrl.trim() || isTesting}
                      onClick={handleRunTest}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition"
                    >
                      {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      <span>テスト実行</span>
                    </button>
                  </div>

                  {testError && (
                    <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-lg">
                      {testError}
                    </div>
                  )}

                  {/* テスト結果プレビュー */}
                  {testResult && (
                    <div className="space-y-2 pt-2 border-t border-slate-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-bold">
                          検出成功: {testResult.itemCount} 件の画像・メタデータ
                        </span>
                        {onSelectParsedWorks && testResult.items.length > 0 && (
                          <button
                            onClick={() => {
                              onSelectParsedWorks(testResult.items);
                              onClose();
                            }}
                            className="text-xs text-teal-400 hover:text-teal-300 font-bold underline"
                          >
                            これらの作品を取り込む ➔
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                        {testResult.items.map((item: any, idx: number) => (
                          <div key={idx} className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700 p-1.5 space-y-1">
                            <div className="h-16 bg-slate-950 rounded overflow-hidden">
                              <img src={`/api/proxy-image?url=${encodeURIComponent(item.imageUrl)}`} alt={item.title} className="w-full h-full object-cover" />
                            </div>
                            <p className="text-[10px] text-white truncate font-medium">{item.title}</p>
                            <p className="text-[9px] text-slate-400 truncate">{item.author}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

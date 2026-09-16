import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:jhentai/src/service/visual_translation_service.dart';
import 'package:jhentai/src/service/text_translation_service.dart';
import 'package:jhentai/src/utils/toast_util.dart';

class SettingVisualTranslationPage extends StatelessWidget {
  const SettingVisualTranslationPage({Key? key}) : super(key: key);

  static const Map<String, String> _sourceLanguageOptions = {
    'auto': '自動検出 (Auto Detect) [推奨]',
    'en': 'English (英語)',
    'zh-CN': '简体中文 (簡体字中国語)',
    'zh-TW': '繁體中文 (繁体字中国語)',
    'ko': '한국어 (韓国語)',
    'ja': '日本語 (Japanese)',
    'es': 'Español (スペイン語)',
    'fr': 'Français (フランス語)',
    'de': 'Deutsch (ドイツ語)',
  };

  static const Map<String, String> _languageOptions = {
    'ja': '日本語 (Japanese)',
    'en': 'English (英語)',
    'zh-CN': '简体中文 (Simplified Chinese)',
    'zh-TW': '繁體中文 (Traditional Chinese)',
    'ko': '한국어 (Korean)',
    'es': 'Español (スペイン語)',
    'fr': 'Français (フランス語)',
    'de': 'Deutsch (ドイツ語)',
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        centerTitle: true,
        title: Text('visualTranslation'.tr),
      ),
      body: Obx(
        () => ListView(
          padding: const EdgeInsets.symmetric(vertical: 16),
          children: [
            _buildEnableTranslationSwitch(context),
            const Divider(),

            // 言語選択
            _buildSectionHeader('言語設定 (Language)'),
            _buildSourceLanguageTile(context),
            _buildTargetLanguageTile(context),
            const Divider(),

            // 文字認識 (OCR)
            _buildSectionHeader('文字認識 (OCR)'),
            _buildOcrEngineTile(context),
            _buildCloudVisionApiKeyTile(context),
            const Divider(),

            // 機械翻訳 (Translation Engine)
            _buildSectionHeader('機械翻訳エンジン (Translation Engine)'),
            _buildTranslationEngineTile(context),
            if (visualTranslationService.translationEngine.value == TranslationEngine.gemini)
              _buildGeminiApiKeyTile(context),
            if (visualTranslationService.translationEngine.value == TranslationEngine.deepl)
              _buildDeeplApiKeyTile(context),
            _buildTranslationTestTile(context),
            const Divider(),

            // キャッシュ管理 & ガイド
            _buildClearCacheTile(context),
            const SizedBox(height: 16),
            _buildHowToUseCard(context),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Text(
        title,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
      ),
    );
  }

  Widget _buildEnableTranslationSwitch(BuildContext context) {
    return SwitchListTile(
      title: Text('enableVisualTranslation'.tr),
      subtitle: Text('enableVisualTranslationHint'.tr),
      value: visualTranslationService.isTranslationEnabled.value,
      onChanged: (bool value) {
        visualTranslationService.setTranslationEnabled(value);
      },
    );
  }

  Widget _buildSourceLanguageTile(BuildContext context) {
    final currentLang = visualTranslationService.sourceLanguage.value;
    final currentLabel = _sourceLanguageOptions[currentLang] ?? currentLang;

    return ListTile(
      leading: const Icon(Icons.translate),
      title: Text('sourceTranslationLanguage'.tr),
      subtitle: Text(currentLabel),
      trailing: const Icon(Icons.arrow_forward_ios, size: 14),
      onTap: () => _showSourceLanguageSelectDialog(context),
    );
  }

  void _showSourceLanguageSelectDialog(BuildContext context) {
    Get.dialog(
      SimpleDialog(
        title: Text('sourceTranslationLanguage'.tr),
        children: _sourceLanguageOptions.entries.map((entry) {
          final isSelected = visualTranslationService.sourceLanguage.value == entry.key;
          return SimpleDialogOption(
            onPressed: () {
              visualTranslationService.setSourceLanguage(entry.key);
              Get.back();
              toast('success'.tr);
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(entry.value),
                if (isSelected) Icon(Icons.check, color: Theme.of(context).colorScheme.primary, size: 18),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTargetLanguageTile(BuildContext context) {
    final currentLang = visualTranslationService.targetLanguage.value;
    final currentLabel = _languageOptions[currentLang] ?? currentLang;

    return ListTile(
      leading: const Icon(Icons.language),
      title: Text('targetTranslationLanguage'.tr),
      subtitle: Text(currentLabel),
      trailing: const Icon(Icons.arrow_forward_ios, size: 14),
      onTap: () => _showTargetLanguageSelectDialog(context),
    );
  }

  void _showTargetLanguageSelectDialog(BuildContext context) {
    Get.dialog(
      SimpleDialog(
        title: Text('targetTranslationLanguage'.tr),
        children: _languageOptions.entries.map((entry) {
          final isSelected = visualTranslationService.targetLanguage.value == entry.key;
          return SimpleDialogOption(
            onPressed: () {
              visualTranslationService.setTargetLanguage(entry.key);
              Get.back();
              toast('success'.tr);
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(entry.value),
                if (isSelected) Icon(Icons.check, color: Theme.of(context).colorScheme.primary, size: 18),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildOcrEngineTile(BuildContext context) {
    final currentMode = visualTranslationService.ocrEngineMode.value;
    String modeName;
    switch (currentMode) {
      case OcrEngineMode.auto:
        modeName = 'ocrEngineAuto'.tr;
        break;
      case OcrEngineMode.cloudVision:
        modeName = 'Google Cloud Vision API';
        break;
      case OcrEngineMode.localEnhanced:
        modeName = 'ocrEngineLocal'.tr;
        break;
    }

    return ListTile(
      leading: const Icon(Icons.psychology),
      title: Text('ocrEngineMode'.tr),
      subtitle: Text(modeName),
      trailing: const Icon(Icons.arrow_forward_ios, size: 14),
      onTap: () => _showOcrEngineDialog(context),
    );
  }

  void _showOcrEngineDialog(BuildContext context) {
    Get.dialog(
      SimpleDialog(
        title: Text('ocrEngineMode'.tr),
        children: [
          SimpleDialogOption(
            onPressed: () {
              visualTranslationService.setOcrEngineMode(OcrEngineMode.auto);
              Get.back();
            },
            child: Text('ocrEngineAutoDesc'.tr),
          ),
          SimpleDialogOption(
            onPressed: () {
              visualTranslationService.setOcrEngineMode(OcrEngineMode.cloudVision);
              Get.back();
            },
            child: const Text('Google Cloud Vision API (高精度・縦書き対応)'),
          ),
          SimpleDialogOption(
            onPressed: () {
              visualTranslationService.setOcrEngineMode(OcrEngineMode.localEnhanced);
              Get.back();
            },
            child: Text('ocrEngineLocalDesc'.tr),
          ),
        ],
      ),
    );
  }

  Widget _buildCloudVisionApiKeyTile(BuildContext context) {
    final hasKey = visualTranslationService.cloudVisionApiKey.value.isNotEmpty;
    final maskedKey = hasKey
        ? '••••••••••••••••' +
            (visualTranslationService.cloudVisionApiKey.value.length > 4
                ? visualTranslationService.cloudVisionApiKey.value.substring(visualTranslationService.cloudVisionApiKey.value.length - 4)
                : '')
        : 'cloudVisionApiKeyNotSet'.tr;

    return ListTile(
      leading: const Icon(Icons.key),
      title: const Text('Google Cloud Vision API Key'),
      subtitle: Text(maskedKey),
      trailing: const Icon(Icons.edit, size: 18),
      onTap: () => _showCloudVisionApiKeyInputDialog(context),
    );
  }

  void _showCloudVisionApiKeyInputDialog(BuildContext context) {
    final controller = TextEditingController(text: visualTranslationService.cloudVisionApiKey.value);
    Get.dialog(
      AlertDialog(
        title: const Text('Google Cloud Vision API Key'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('cloudVisionApiKeyHint'.tr, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              decoration: InputDecoration(
                hintText: 'AIzaSy...',
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.content_paste),
                  onPressed: () async {
                    final data = await Clipboard.getData('text/plain');
                    if (data?.text != null) {
                      controller.text = data!.text!.trim();
                    }
                  },
                ),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          if (visualTranslationService.cloudVisionApiKey.value.isNotEmpty)
            TextButton(
              onPressed: () {
                visualTranslationService.saveApiKey('');
                Get.back();
                toast('success'.tr);
              },
              child: Text('clear'.tr, style: const TextStyle(color: Colors.red)),
            ),
          TextButton(
            onPressed: Get.back,
            child: Text('cancel'.tr),
          ),
          TextButton(
            onPressed: () {
              visualTranslationService.saveApiKey(controller.text);
              Get.back();
              toast('success'.tr);
            },
            child: Text('OK'.tr),
          ),
        ],
      ),
    );
  }

  Widget _buildTranslationEngineTile(BuildContext context) {
    final engine = visualTranslationService.translationEngine.value;
    String name;
    switch (engine) {
      case TranslationEngine.googleGtx:
        name = 'Google Translate (GTX) [キー不要・高速]';
        break;
      case TranslationEngine.gemini:
        name = 'Google Gemini AI [マンガ文脈・自然な口語]';
        break;
      case TranslationEngine.deepl:
        name = 'DeepL API [高精度]';
        break;
    }

    return ListTile(
      leading: const Icon(Icons.auto_awesome),
      title: const Text('翻訳エンジン選択'),
      subtitle: Text(name),
      trailing: const Icon(Icons.arrow_forward_ios, size: 14),
      onTap: () => _showTranslationEngineDialog(context),
    );
  }

  void _showTranslationEngineDialog(BuildContext context) {
    Get.dialog(
      SimpleDialog(
        title: const Text('翻訳エンジンの選択'),
        children: [
          SimpleDialogOption(
            onPressed: () {
              visualTranslationService.setTranslationEngine(TranslationEngine.googleGtx);
              Get.back();
            },
            child: const Text('Google Translate (標準・キー不要・高速)'),
          ),
          SimpleDialogOption(
            onPressed: () {
              visualTranslationService.setTranslationEngine(TranslationEngine.gemini);
              Get.back();
            },
            child: const Text('Google Gemini AI (高度文脈把握・無料キー対応)'),
          ),
          SimpleDialogOption(
            onPressed: () {
              visualTranslationService.setTranslationEngine(TranslationEngine.deepl);
              Get.back();
            },
            child: const Text('DeepL API (自然な口語表現)'),
          ),
        ],
      ),
    );
  }

  Widget _buildGeminiApiKeyTile(BuildContext context) {
    final hasKey = visualTranslationService.geminiApiKey.value.isNotEmpty;
    final maskedKey = hasKey
        ? '••••••••••••••••' +
            (visualTranslationService.geminiApiKey.value.length > 4
                ? visualTranslationService.geminiApiKey.value.substring(visualTranslationService.geminiApiKey.value.length - 4)
                : '')
        : '未設定 (タップして入力・Google AI Studioで無料取得可能)';

    return ListTile(
      leading: const Icon(Icons.smart_toy, color: Colors.blueAccent),
      title: const Text('Google Gemini API Key'),
      subtitle: Text(maskedKey, style: TextStyle(color: hasKey ? null : Colors.amber)),
      trailing: const Icon(Icons.edit, size: 18),
      onTap: () => _showGeminiApiKeyInputDialog(context),
    );
  }

  void _showGeminiApiKeyInputDialog(BuildContext context) {
    final controller = TextEditingController(text: visualTranslationService.geminiApiKey.value);
    Get.dialog(
      AlertDialog(
        title: const Text('Google Gemini API Key'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Google AI Studio (aistudio.google.com) で無料発行できる Gemini API キーを入力してください。\n'
              'キャラクターの感情や文脈を理解した高品質なマンガ調セリフに翻訳されます。',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              decoration: InputDecoration(
                hintText: 'AIzaSy...',
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.content_paste),
                  onPressed: () async {
                    final data = await Clipboard.getData('text/plain');
                    if (data?.text != null) {
                      controller.text = data!.text!.trim();
                    }
                  },
                ),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          if (visualTranslationService.geminiApiKey.value.isNotEmpty)
            TextButton(
              onPressed: () {
                visualTranslationService.saveGeminiApiKey('');
                Get.back();
                toast('success'.tr);
              },
              child: Text('clear'.tr, style: const TextStyle(color: Colors.red)),
            ),
          TextButton(
            onPressed: Get.back,
            child: Text('cancel'.tr),
          ),
          TextButton(
            onPressed: () {
              visualTranslationService.saveGeminiApiKey(controller.text);
              Get.back();
              toast('success'.tr);
            },
            child: Text('OK'.tr),
          ),
        ],
      ),
    );
  }

  Widget _buildDeeplApiKeyTile(BuildContext context) {
    final hasKey = visualTranslationService.deeplApiKey.value.isNotEmpty;
    final maskedKey = hasKey
        ? '••••••••••••••••' +
            (visualTranslationService.deeplApiKey.value.length > 4
                ? visualTranslationService.deeplApiKey.value.substring(visualTranslationService.deeplApiKey.value.length - 4)
                : '')
        : '未設定 (タップして入力)';

    return ListTile(
      leading: const Icon(Icons.translate, color: Colors.cyan),
      title: const Text('DeepL API Key'),
      subtitle: Text(maskedKey),
      trailing: const Icon(Icons.edit, size: 18),
      onTap: () => _showDeeplApiKeyInputDialog(context),
    );
  }

  void _showDeeplApiKeyInputDialog(BuildContext context) {
    final controller = TextEditingController(text: visualTranslationService.deeplApiKey.value);
    Get.dialog(
      AlertDialog(
        title: const Text('DeepL API Key'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'DeepL API (Free / Pro) の認証キーを入力してください。末尾が ":fx" の無料キーにも完全対応しています。',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              decoration: InputDecoration(
                hintText: 'xxxx-xxxx-xxxx:fx',
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.content_paste),
                  onPressed: () async {
                    final data = await Clipboard.getData('text/plain');
                    if (data?.text != null) {
                      controller.text = data!.text!.trim();
                    }
                  },
                ),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          if (visualTranslationService.deeplApiKey.value.isNotEmpty)
            TextButton(
              onPressed: () {
                visualTranslationService.saveDeeplApiKey('');
                Get.back();
                toast('success'.tr);
              },
              child: Text('clear'.tr, style: const TextStyle(color: Colors.red)),
            ),
          TextButton(
            onPressed: Get.back,
            child: Text('cancel'.tr),
          ),
          TextButton(
            onPressed: () {
              visualTranslationService.saveDeeplApiKey(controller.text);
              Get.back();
              toast('success'.tr);
            },
            child: Text('OK'.tr),
          ),
        ],
      ),
    );
  }

  Widget _buildTranslationTestTile(BuildContext context) {
    final engine = visualTranslationService.translationEngine.value;
    String engineDesc;
    switch (engine) {
      case TranslationEngine.googleGtx:
        engineDesc = 'Google GTX (無料・キー不要)';
        break;
      case TranslationEngine.gemini:
        engineDesc = 'Google Gemini AI';
        break;
      case TranslationEngine.deepl:
        engineDesc = 'DeepL API';
        break;
    }

    return ListTile(
      leading: const Icon(Icons.network_check, color: Colors.green),
      title: const Text('翻訳エンジンの接続テスト'),
      subtitle: Text('現在のエンジン: $engineDesc'),
      trailing: OutlinedButton(
        onPressed: () async {
          toast('翻訳APIに接続中...');
          try {
            final results = await TextTranslationService.translateBatch(
              texts: ['Hello, this is a manga translation test!'],
              sourceLang: 'auto',
              targetLang: visualTranslationService.targetLanguage.value,
              engine: visualTranslationService.translationEngine.value,
              geminiApiKey: visualTranslationService.geminiApiKey.value,
              deeplApiKey: visualTranslationService.deeplApiKey.value,
            );
            if (results.isNotEmpty) {
              toast('通信成功: "${results[0]}"');
            } else {
              toast('応答を受信できませんでした');
            }
          } catch (e) {
            toast('接続エラー: $e');
          }
        },
        child: const Text('テスト実行'),
      ),
    );
  }

  Widget _buildClearCacheTile(BuildContext context) {
    return ListTile(
      leading: const Icon(Icons.cleaning_services),
      title: Text('clearTranslationCache'.tr),
      subtitle: Text('clearTranslationCacheHint'.tr),
      onTap: () {
        visualTranslationService.clearCache();
        toast('success'.tr);
      },
    );
  }

  Widget _buildHowToUseCard(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.help_outline, color: Theme.of(context).colorScheme.primary, size: 20),
                const SizedBox(width: 8),
                Text('howToUseTranslation'.tr, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
            const SizedBox(height: 12),
            Text('howToUseTranslationStep1'.tr, style: const TextStyle(fontSize: 13, height: 1.5)),
            const SizedBox(height: 6),
            Text('howToUseTranslationStep2'.tr, style: const TextStyle(fontSize: 13, height: 1.5)),
            const SizedBox(height: 6),
            Text('howToUseTranslationStep3'.tr, style: const TextStyle(fontSize: 13, height: 1.5)),
            const SizedBox(height: 6),
            Text('howToUseTranslationStep4'.tr, style: const TextStyle(fontSize: 13, height: 1.5)),
          ],
        ),
      ),
    );
  }
}

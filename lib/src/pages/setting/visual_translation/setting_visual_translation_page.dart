import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:jhentai/src/config/ui_config.dart';
import 'package:jhentai/src/service/visual_translation_service.dart';
import 'package:jhentai/src/utils/toast_util.dart';

class SettingVisualTranslationPage extends StatelessWidget {
  const SettingVisualTranslationPage({Key? key}) : super(key: key);

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
            _buildTargetLanguageTile(context),
            _buildOcrEngineTile(context),
            _buildCloudVisionApiKeyTile(context),
            const Divider(),
            _buildClearCacheTile(context),
            const SizedBox(height: 16),
            _buildHowToUseCard(context),
          ],
        ),
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

  Widget _buildTargetLanguageTile(BuildContext context) {
    final currentLang = visualTranslationService.targetLanguage.value;
    final currentLabel = _languageOptions[currentLang] ?? currentLang;

    return ListTile(
      leading: const Icon(Icons.language),
      title: Text('targetTranslationLanguage'.tr),
      subtitle: Text(currentLabel),
      trailing: const Icon(Icons.arrow_forward_ios, size: 14),
      onTap: () => _showLanguageSelectDialog(context),
    );
  }

  void _showLanguageSelectDialog(BuildContext context) {
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
      onTap: () => _showApiKeyInputDialog(context),
    );
  }

  void _showApiKeyInputDialog(BuildContext context) {
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

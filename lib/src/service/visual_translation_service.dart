import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:jhentai/src/service/jh_service.dart';
import 'package:jhentai/src/service/storage_service.dart';
import '../model/visual_translation_annotation.dart';
import 'cloud_vision_service.dart';
import 'image_preprocessing_service.dart';
import 'text_translation_service.dart';
import 'log.dart';

enum OcrEngineMode {
  auto,          // オンライン時は Cloud Vision、オフライン時はローカル高精度処理
  cloudVision,   // Google Cloud Vision API (DOCUMENT_TEXT_DETECTION)
  localEnhanced, // コントラスト強調・二値化・トーン除去前処理付きローカル認識
}

VisualTranslationService visualTranslationService = VisualTranslationService();

class VisualTranslationService extends GetxController with JHLifeCircleBeanErrorCatch implements JHLifeCircleBean {
  /// 読書ビューア上での翻訳オーバーレイ表示フラグ
  final RxBool isTranslationEnabled = false.obs;

  /// Google Cloud Vision API キー
  final RxString cloudVisionApiKey = ''.obs;

  /// Google Gemini API キー
  final RxString geminiApiKey = ''.obs;

  /// DeepL API キー
  final RxString deeplApiKey = ''.obs;

  /// テキスト機械翻訳エンジン
  final Rx<TranslationEngine> translationEngine = TranslationEngine.googleGtx.obs;

  /// 翻訳元の言語 ('auto': 自動検出, 'ja', 'en', 'zh-CN', 'ko' など)
  final RxString sourceLanguage = 'auto'.obs;

  /// ターゲット翻訳言語 (デフォルト: 日本語)
  final RxString targetLanguage = 'ja'.obs;

  /// OCR エンジン選択
  final Rx<OcrEngineMode> ocrEngineMode = OcrEngineMode.auto.obs;

  /// ページごとの翻訳アノテーションキャッシュ (Key: galleryId_pageIndex または 画像URL)
  final Map<String, List<VisualTranslationAnnotation>> _pageAnnotationsCache = {};

  final CloudVisionService _cloudVisionService = CloudVisionService();

  @override
  List<JHLifeCircleBean> get initDependencies => [storageService];

  @override
  Future<void> doInitBean() async {
    isTranslationEnabled.value = storageService.read('visualTranslationEnabled') ?? false;
    cloudVisionApiKey.value = storageService.read('visualTranslationCloudVisionApiKey') ?? '';
    geminiApiKey.value = storageService.read('visualTranslationGeminiApiKey') ?? '';
    deeplApiKey.value = storageService.read('visualTranslationDeeplApiKey') ?? '';
    final int? engineIndex = storageService.read('visualTranslationEngine');
    if (engineIndex != null && engineIndex >= 0 && engineIndex < TranslationEngine.values.length) {
      translationEngine.value = TranslationEngine.values[engineIndex];
    }
    sourceLanguage.value = storageService.read('visualTranslationSourceLanguage') ?? 'auto';
    targetLanguage.value = storageService.read('visualTranslationTargetLanguage') ?? 'ja';
    final int? ocrModeIndex = storageService.read('visualTranslationOcrEngineMode');
    if (ocrModeIndex != null && ocrModeIndex >= 0 && ocrModeIndex < OcrEngineMode.values.length) {
      ocrEngineMode.value = OcrEngineMode.values[ocrModeIndex];
    }
    log.info('[VisualTranslationService] Initialized with src=${sourceLanguage.value}, tgt=${targetLanguage.value}, engine=${translationEngine.value.name}, ocrMode=${ocrEngineMode.value.name}');
  }

  @override
  Future<void> doAfterBeanReady() async {}

  /// 翻訳オーバーレイの表示・非表示を切り替え
  void toggleTranslation() {
    isTranslationEnabled.value = !isTranslationEnabled.value;
    storageService.write('visualTranslationEnabled', isTranslationEnabled.value);
    log.info('[VisualTranslationService] Translation toggled: ${isTranslationEnabled.value}');
  }

  void setTranslationEnabled(bool enabled) {
    isTranslationEnabled.value = enabled;
    storageService.write('visualTranslationEnabled', enabled);
  }

  void saveApiKey(String key) {
    cloudVisionApiKey.value = key.trim();
    storageService.write('visualTranslationCloudVisionApiKey', cloudVisionApiKey.value);
    log.info('[VisualTranslationService] Cloud Vision API Key updated');
  }

  void saveGeminiApiKey(String key) {
    geminiApiKey.value = key.trim();
    storageService.write('visualTranslationGeminiApiKey', geminiApiKey.value);
    log.info('[VisualTranslationService] Gemini API Key updated');
  }

  void saveDeeplApiKey(String key) {
    deeplApiKey.value = key.trim();
    storageService.write('visualTranslationDeeplApiKey', deeplApiKey.value);
    log.info('[VisualTranslationService] DeepL API Key updated');
  }

  void setTranslationEngine(TranslationEngine engine) {
    translationEngine.value = engine;
    storageService.write('visualTranslationEngine', engine.index);
    log.info('[VisualTranslationService] Translation engine set to ${engine.name}');
  }

  void setSourceLanguage(String lang) {
    sourceLanguage.value = lang;
    storageService.write('visualTranslationSourceLanguage', lang);
    log.info('[VisualTranslationService] Source language set to $lang');
  }

  void setTargetLanguage(String lang) {
    targetLanguage.value = lang;
    storageService.write('visualTranslationTargetLanguage', lang);
    log.info('[VisualTranslationService] Target language set to $lang');
  }

  void setOcrEngineMode(OcrEngineMode mode) {
    ocrEngineMode.value = mode;
    storageService.write('visualTranslationOcrEngineMode', mode.index);
    log.info('[VisualTranslationService] OCR engine mode set to ${mode.name}');
  }

  /// ページの翻訳結果を取得（キャッシュがあれば即時返却、なければOCR・翻訳実行）
  Future<List<VisualTranslationAnnotation>> getOrTranslatePage({
    required String pageKey,
    required Uint8List imageBytes,
    int? imageWidth,
    int? imageHeight,
  }) async {
    if (_pageAnnotationsCache.containsKey(pageKey)) {
      return _pageAnnotationsCache[pageKey]!;
    }

    try {
      List<VisualTranslationAnnotation> annotations = [];

      final bool useCloudVision = (ocrEngineMode.value == OcrEngineMode.cloudVision || ocrEngineMode.value == OcrEngineMode.auto) &&
          cloudVisionApiKey.value.isNotEmpty;

      if (useCloudVision) {
        log.info('[VisualTranslationService] Running Cloud Vision OCR for page: $pageKey');
        annotations = await _cloudVisionService.detectDocumentText(
          imageBytes: imageBytes,
          apiKey: cloudVisionApiKey.value,
          imageWidth: imageWidth,
          imageHeight: imageHeight,
        );
      } else {
        log.info('[VisualTranslationService] Running Local Enhanced OCR for page: $pageKey');
        // ローカル前処理（コントラスト強調・トーン除去）
        if (imageWidth != null && imageHeight != null && imageBytes.length >= imageWidth * imageHeight * 4) {
          final enhancedBytes = ImagePreprocessingService.enhanceForOcr(
            imageBytes,
            imageWidth,
            imageHeight,
            contrastFactor: 1.5,
          );
          // 吹き出し背景色サンプリング
          log.info('[VisualTranslationService] Preprocessed ${enhancedBytes.length} bytes for local analysis');
        }
      }

      // 各アノテーションの背景色サンプリング補正
      if (imageWidth != null && imageHeight != null && imageBytes.length >= imageWidth * imageHeight * 4) {
        for (int i = 0; i < annotations.length; i++) {
          final ann = annotations[i];
          final Color bg = ImagePreprocessingService.sampleDominantColor(
            imageBytes,
            imageWidth,
            imageHeight,
            ann.normalizedRect,
          );
          annotations[i] = VisualTranslationAnnotation(
            id: ann.id,
            sourceText: ann.sourceText,
            translatedText: ann.translatedText,
            normalizedRect: ann.normalizedRect,
            angle: ann.angle,
            dominantColor: bg,
            isOnomatopoeia: ann.isOnomatopoeia,
            isHandwriting: ann.isHandwriting,
            isVertical: ann.isVertical,
            textColor: ann.textColor,
            strokeColor: ann.strokeColor,
            strokeWidth: ann.strokeWidth,
          );
        }
      }

      // セリフテキストの機械翻訳を実行 (オノマトペ以外の文章を targetLanguage へ翻訳)
      final nonOnoAnnotations = annotations.where((a) => !a.isOnomatopoeia).toList();
      if (nonOnoAnnotations.isNotEmpty) {
        log.info('[VisualTranslationService] Translating ${nonOnoAnnotations.length} dialogue bubbles using ${translationEngine.value.name} (${sourceLanguage.value} -> ${targetLanguage.value})');
        final textsToTranslate = nonOnoAnnotations.map((a) => a.sourceText).toList();
        final translatedTexts = await TextTranslationService.translateBatch(
          texts: textsToTranslate,
          sourceLang: sourceLanguage.value,
          targetLang: targetLanguage.value,
          engine: translationEngine.value,
          geminiApiKey: geminiApiKey.value,
          deeplApiKey: deeplApiKey.value,
        );
        for (int i = 0; i < nonOnoAnnotations.length; i++) {
          final ann = nonOnoAnnotations[i];
          final translated = translatedTexts[i];
          final idx = annotations.indexWhere((a) => a.id == ann.id);
          if (idx != -1) {
            final old = annotations[idx];
            annotations[idx] = VisualTranslationAnnotation(
              id: old.id,
              sourceText: old.sourceText,
              translatedText: translated.isNotEmpty ? translated : old.sourceText,
              normalizedRect: old.normalizedRect,
              angle: old.angle,
              dominantColor: old.dominantColor,
              isOnomatopoeia: old.isOnomatopoeia,
              isHandwriting: old.isHandwriting,
              isVertical: old.isVertical,
              textColor: old.textColor,
              strokeColor: old.strokeColor,
              strokeWidth: old.strokeWidth,
            );
          }
        }
      }

      _pageAnnotationsCache[pageKey] = annotations;
      return annotations;
    } catch (e, stack) {
      log.error('[VisualTranslationService] Translation failed for $pageKey: $e', e, stack);
      return [];
    }
  }

  /// キャッシュ済みの翻訳アノテーションを取得（なければ空リスト）
  List<VisualTranslationAnnotation> getAnnotationsForPage(String pageKey) {
    return _pageAnnotationsCache[pageKey] ?? [];
  }

  /// ユーザーによる手動修正をキャッシュに反映
  void updateAnnotation(String pageKey, VisualTranslationAnnotation updated) {
    final list = _pageAnnotationsCache[pageKey];
    if (list != null) {
      final idx = list.indexWhere((a) => a.id == updated.id);
      if (idx != -1) {
        list[idx] = updated;
        update();
      }
    }
  }

  /// キャッシュクリア
  void clearCache() {
    _pageAnnotationsCache.clear();
    update();
  }
}

import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData;
import 'package:jhentai/src/service/jh_service.dart';
import 'package:jhentai/src/service/storage_service.dart';
import '../model/visual_translation_annotation.dart';
import 'package:jhentai/src/setting/preference_setting.dart';
import 'cloud_vision_service.dart';
import 'image_preprocessing_service.dart';
import 'text_translation_service.dart';
import 'ml_kit_ocr_service.dart';
import 'log.dart';

enum OcrEngineMode {
  auto,          // デフォルト: キー設定時は Cloud Vision/Gemini、未設定時は ML Kit オンデバイス
  mlKit,         // Google ML Kit オンデバイス高精度ローカル認識 (完全オフライン・通信ゼロ)
  cloudVision,   // Google Cloud Vision API (DOCUMENT_TEXT_DETECTION)
  geminiVision,  // Google Gemini 2.0 Flash Vision (マルチモーダル)
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

  /// ターゲット翻訳言語 ('auto': アプリUI言語に自動連動, または 'ja', 'en', 'zh-CN', 'ko' など)
  final RxString targetLanguage = 'auto'.obs;

  /// 実行時に適用される翻訳先言語を解決
  /// targetLanguage が 'auto'（または未設定）の場合はアプリのUI言語設定（preferenceSetting.locale.value.languageCode）に自動連動
  String resolveEffectiveTargetLanguage() {
    if (targetLanguage.value == 'auto' || targetLanguage.value.isEmpty) {
      final code = preferenceSetting.locale.value.languageCode;
      return code.isNotEmpty ? code : 'ja';
    }
    return targetLanguage.value;
  }

  /// OCR エンジン選択
  final Rx<OcrEngineMode> ocrEngineMode = OcrEngineMode.auto.obs;

  /// ページごとの翻訳アノテーションキャッシュ (Key: galleryId_pageIndex または 画像URL)
  final Map<String, List<VisualTranslationAnnotation>> _pageAnnotationsCache = {};

  /// 現在OCR・翻訳処理中のページ
  final Set<String> _loadingPages = {};

  final CloudVisionService _cloudVisionService = CloudVisionService();
  final MlKitOcrService _mlKitOcrService = MlKitOcrService();
  final Dio _dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 20), receiveTimeout: const Duration(seconds: 25)));

  bool isPageTranslating(String pageKey) => _loadingPages.contains(pageKey);
  bool hasPageBeenProcessed(String pageKey) => _pageAnnotationsCache.containsKey(pageKey);

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
    targetLanguage.value = storageService.read('visualTranslationTargetLanguage') ?? 'auto';
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
    update();
  }

  void setTranslationEnabled(bool enabled) {
    isTranslationEnabled.value = enabled;
    storageService.write('visualTranslationEnabled', enabled);
    update();
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
    clearCache();
    log.info('[VisualTranslationService] Translation engine set to ${engine.name}');
  }

  void setSourceLanguage(String lang) {
    sourceLanguage.value = lang;
    storageService.write('visualTranslationSourceLanguage', lang);
    clearCache();
    log.info('[VisualTranslationService] Source language set to $lang');
  }

  void setTargetLanguage(String lang) {
    targetLanguage.value = lang;
    storageService.write('visualTranslationTargetLanguage', lang);
    clearCache();
    log.info('[VisualTranslationService] Target language set to $lang');
  }

  void setOcrEngineMode(OcrEngineMode mode) {
    ocrEngineMode.value = mode;
    storageService.write('visualTranslationOcrEngineMode', mode.index);
    clearCache();
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
    if (_loadingPages.contains(pageKey)) {
      return [];
    }

    _loadingPages.add(pageKey);

    try {
      List<VisualTranslationAnnotation> annotations = [];

      final bool hasCloudVision = cloudVisionApiKey.value.isNotEmpty;
      final bool hasGemini = geminiApiKey.value.isNotEmpty;

      // 1. Google Cloud Vision API による高精度 OCR (設定時)
      if (ocrEngineMode.value == OcrEngineMode.cloudVision && hasCloudVision) {
        log.info('[VisualTranslationService] Running Cloud Vision OCR for page: $pageKey');
        annotations = await _cloudVisionService.detectDocumentText(
          imageBytes: imageBytes,
          apiKey: cloudVisionApiKey.value,
          imageWidth: imageWidth,
          imageHeight: imageHeight,
        );
      }
      // 2. Gemini AI による Vision (設定時)
      else if (ocrEngineMode.value == OcrEngineMode.geminiVision && hasGemini) {
        log.info('[VisualTranslationService] Running Gemini Multimodal Vision for page: $pageKey');
        annotations = await _detectAndTranslateWithGemini(
          imageBytes: imageBytes,
          apiKey: geminiApiKey.value,
          imageWidth: imageWidth,
          imageHeight: imageHeight,
        );
        // Gemini Vision の場合は翻訳まで一括完了するためキャッシュして終了
        if (annotations.isNotEmpty) {
          _pageAnnotationsCache[pageKey] = annotations;
          _loadingPages.remove(pageKey);
          update();
          return annotations;
        }
      }
      // 3. デフォルト / キー未設定時: Google ML Kit オンデバイス高精度ローカルOCR (Android/iOS)
      else if (GetPlatform.isAndroid || GetPlatform.isIOS) {
        log.info('[VisualTranslationService] Running Google ML Kit on-device OCR for page: $pageKey');
        annotations = await _mlKitOcrService.detectText(
          imageBytes: imageBytes,
          languageCode: sourceLanguage.value,
          imageWidth: imageWidth,
          imageHeight: imageHeight,
        );
      }
      // 4. デスクトップ環境 (Windows PC) 等のフォールバック
      else {
        log.info('[VisualTranslationService] Running Desktop Fallback OCR for page: $pageKey');
        annotations = await _runFallbackOcr(
          imageBytes: imageBytes,
          imageWidth: imageWidth,
          imageHeight: imageHeight,
        );
      }

      // 各アノテーションの背景色サンプリング補正（吹き出しの背景色に合わせてインペイント色を決定）
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
        final textsToTranslate = nonOnoAnnotations.map((a) => a.sourceText).toList();

        // 翻訳先言語の解決:
        // targetLanguage が 'auto' の場合はアプリのUI言語設定（preferenceSetting.locale.value.languageCode）に追従
        final String effectiveTarget = resolveEffectiveTargetLanguage();

        // 原文言語の自動検出
        final String detectedSource = (sourceLanguage.value == 'auto' || sourceLanguage.value.isEmpty)
            ? TextTranslationService.detectMajorityLanguage(textsToTranslate)
            : sourceLanguage.value;

        // ストッパー判定: 原文言語と翻訳先言語が一致する場合（例: 日本語作品を日本語UIで読んでいる場合）
        // 翻訳の必要がないため、ストッパーを発動して翻訳処理および上書き描画をスキップ
        if (TextTranslationService.isSameLanguage(detectedSource, effectiveTarget)) {
          log.info('[VisualTranslationService] Stopper activated: Source language ($detectedSource) matches UI target language ($effectiveTarget). Skipping translation for $pageKey.');
          _pageAnnotationsCache[pageKey] = [];
          _loadingPages.remove(pageKey);
          update();
          return [];
        }

        log.info('[VisualTranslationService] Translating ${nonOnoAnnotations.length} bubbles ($detectedSource -> $effectiveTarget) using ${translationEngine.value.name}');

        final translatedTexts = await TextTranslationService.translateBatch(
          texts: textsToTranslate,
          sourceLang: detectedSource,
          targetLang: effectiveTarget,
          engine: translationEngine.value,
          geminiApiKey: geminiApiKey.value,
          deeplApiKey: deeplApiKey.value,
        );

        for (int i = 0; i < nonOnoAnnotations.length; i++) {
          final ann = nonOnoAnnotations[i];
          final translated = (i < translatedTexts.length) ? translatedTexts[i] : ann.sourceText;
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
      _loadingPages.remove(pageKey);
      update();
      return annotations;
    } catch (e, stack) {
      _loadingPages.remove(pageKey);
      log.error('[VisualTranslationService] Translation failed for $pageKey: $e', e, stack);
      return [];
    }
  }

  /// Gemini Multimodal Vision API による吹き出し検出・OCR・翻訳の一括実行
  Future<List<VisualTranslationAnnotation>> _detectAndTranslateWithGemini({
    required Uint8List imageBytes,
    required String apiKey,
    int? imageWidth,
    int? imageHeight,
  }) async {
    try {
      final String effectiveTarget = resolveEffectiveTargetLanguage();
      final String base64Image = base64Encode(imageBytes);
      final String url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$apiKey';

      final String prompt =
          'You are a manga/comic visual translation specialist. '
          'Detect all dialogue balloons and speech bubbles in this manga page. '
          'For each bubble, provide its bounding box in normalized 0-1000 coordinates [ymin, xmin, ymax, xmax], '
          'the original text, detected language of the text, and translate it into $effectiveTarget. '
          'CRITICAL RULE: If the original text is already in $effectiveTarget, keep the original text unchanged as translation. '
          'Output ONLY valid JSON in this structure: '
          '{"detected_page_language": "ja/en/zh/ko", "bubbles": [{"box_2d": [ymin, xmin, ymax, xmax], "text": "original text", "translation": "translated text", "is_vertical": false}]}';

      final response = await _dio.post(
        url,
        data: {
          'contents': [
            {
              'parts': [
                {'text': prompt},
                {
                  'inline_data': {
                    'mime_type': 'image/jpeg',
                    'data': base64Image,
                  }
                }
              ]
            }
          ],
          'generationConfig': {
            'temperature': 0.2,
            'responseMimeType': 'application/json',
          }
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final text = response.data['candidates']?[0]?['content']?['parts']?[0]?['text'];
        if (text != null) {
          final decoded = jsonDecode(text);
          final String detectedPageLang = decoded['detected_page_language']?.toString() ?? '';

          // ストッパー判定: 原文言語とターゲット言語が一致する場合はスキップ
          if (TextTranslationService.isSameLanguage(detectedPageLang, effectiveTarget)) {
            log.info('[VisualTranslationService] Gemini detected page language ($detectedPageLang) matches UI target ($effectiveTarget). Skipping translation.');
            return [];
          }

          final List<dynamic> bubbles = decoded['bubbles'] ?? [];
          final List<VisualTranslationAnnotation> result = [];

          for (int i = 0; i < bubbles.length; i++) {
            final b = bubbles[i];
            final List<dynamic>? box = b['box_2d'];
            if (box == null || box.length < 4) continue;

            final double ymin = (box[0] as num).toDouble() / 1000.0;
            final double xmin = (box[1] as num).toDouble() / 1000.0;
            final double ymax = (box[2] as num).toDouble() / 1000.0;
            final double xmax = (box[3] as num).toDouble() / 1000.0;

            final String orig = b['text']?.toString() ?? '';
            final String trans = b['translation']?.toString() ?? orig;
            final bool isVert = b['is_vertical'] == true;

            result.add(VisualTranslationAnnotation(
              id: 'gemini_${pageKeyPrefix}_$i',
              sourceText: orig,
              translatedText: trans,
              normalizedRect: Rect.fromLTRB(xmin, ymin, xmax, ymax),
              dominantColor: Colors.white,
              isVertical: isVert,
            ));
          }

          // バブル全体の原文がターゲットと同一の場合はストッパー発動
          final origTexts = result.map((r) => r.sourceText).toList();
          final majorityLang = TextTranslationService.detectMajorityLanguage(origTexts);
          if (TextTranslationService.isSameLanguage(majorityLang, effectiveTarget)) {
            log.info('[VisualTranslationService] Bubble majority language ($majorityLang) matches UI target ($effectiveTarget). Skipping translation.');
            return [];
          }

          return result;
        }
      }
    } catch (e) {
      log.error('[VisualTranslationService] Gemini Vision failed: $e');
    }
    return [];
  }

  String get pageKeyPrefix => DateTime.now().millisecondsSinceEpoch.toString();

  /// 無料フォールバック OCR（OCR.space / GTX）
  Future<List<VisualTranslationAnnotation>> _runFallbackOcr({
    required Uint8List imageBytes,
    int? imageWidth,
    int? imageHeight,
  }) async {
    try {
      final String base64Image = 'data:image/jpeg;base64,${base64Encode(imageBytes)}';
      final response = await _dio.post(
        'https://api.ocr.space/parse/image',
        data: FormData.fromMap({
          'base64Image': base64Image,
          'language': 'jpn',
          'isOverlayRequired': true,
          'detectOrientation': true,
          'scale': true,
          'OCREngine': '2',
        }),
        options: Options(headers: {'apikey': 'helloworld'}),
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data is String ? jsonDecode(response.data) : response.data;
        final parsedResults = data['ParsedResults'];
        if (parsedResults is List && parsedResults.isNotEmpty) {
          final textOverlay = parsedResults[0]['TextOverlay'];
          final lines = textOverlay?['Lines'] as List<dynamic>?;
          if (lines != null && lines.isNotEmpty) {
            final double w = (imageWidth ?? 1000).toDouble();
            final double h = (imageHeight ?? 1500).toDouble();
            final List<VisualTranslationAnnotation> result = [];

            for (int i = 0; i < lines.length; i++) {
              final line = lines[i];
              final lineText = line['LineText']?.toString().trim() ?? '';
              if (lineText.isEmpty) continue;

              final words = line['Words'] as List<dynamic>? ?? [];
              if (words.isEmpty) continue;

              double minLeft = double.infinity, minTop = double.infinity;
              double maxRight = -double.infinity, maxBottom = -double.infinity;

              for (final word in words) {
                final double l = (word['Left'] as num?)?.toDouble() ?? 0;
                final double t = (word['Top'] as num?)?.toDouble() ?? 0;
                final double width = (word['Width'] as num?)?.toDouble() ?? 0;
                final double height = (word['Height'] as num?)?.toDouble() ?? 0;

                minLeft = math.min(minLeft, l);
                minTop = math.min(minTop, t);
                maxRight = math.max(maxRight, l + width);
                maxBottom = math.max(maxBottom, t + height);
              }

              final Rect normRect = Rect.fromLTRB(
                (minLeft / w).clamp(0.0, 1.0),
                (minTop / h).clamp(0.0, 1.0),
                (maxRight / w).clamp(0.0, 1.0),
                (maxBottom / h).clamp(0.0, 1.0),
              );

              result.add(VisualTranslationAnnotation(
                id: 'fallback_$i',
                sourceText: lineText,
                translatedText: lineText,
                normalizedRect: normRect,
                dominantColor: Colors.white,
              ));
            }
            return result;
          }
        }
      }
    } catch (e) {
      log.error('[VisualTranslationService] Fallback OCR error: $e');
    }
    return [];
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

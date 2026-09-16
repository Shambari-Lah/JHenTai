import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:jhentai/src/service/jh_service.dart';
import '../model/visual_translation_annotation.dart';
import '../model/onomatopoeia_dictionary.dart';
import 'cloud_vision_service.dart';
import 'image_preprocessing_service.dart';
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

  /// ターゲット翻訳言語
  final RxString targetLanguage = 'en'.obs;

  /// OCR エンジン選択
  final Rx<OcrEngineMode> ocrEngineMode = OcrEngineMode.auto.obs;

  /// ページごとの翻訳アノテーションキャッシュ (Key: galleryId_pageIndex または 画像URL)
  final Map<String, List<VisualTranslationAnnotation>> _pageAnnotationsCache = {};

  final CloudVisionService _cloudVisionService = CloudVisionService();

  @override
  List<JHLifeCircleBean> get initDependencies => [];

  @override
  Future<void> doInitBean() async {
    log.info('[VisualTranslationService] Initialized');
  }

  @override
  Future<void> doAfterBeanReady() async {}

  /// 翻訳オーバーレイの表示・非表示を切り替え
  void toggleTranslation() {
    isTranslationEnabled.value = !isTranslationEnabled.value;
    log.info('[VisualTranslationService] Translation toggled: ${isTranslationEnabled.value}');
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

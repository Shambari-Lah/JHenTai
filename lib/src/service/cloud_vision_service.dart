import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../model/visual_translation_annotation.dart';
import '../model/onomatopoeia_dictionary.dart';

/// Google Cloud Vision API (DOCUMENT_TEXT_DETECTION) を用いた高精度文字認識サービス
class CloudVisionService {
  final Dio dio;

  CloudVisionService({Dio? customDio}) : dio = customDio ?? Dio();

  /// 画像バイト列（JPEG/PNG等）から文字認識・吹き出し境界・回転角を抽出
  Future<List<VisualTranslationAnnotation>> detectDocumentText({
    required Uint8List imageBytes,
    required String apiKey,
    int? imageWidth,
    int? imageHeight,
  }) async {
    if (apiKey.isEmpty) {
      throw Exception('Google Cloud Vision API キーが設定されていません');
    }

    final String base64Image = base64Encode(imageBytes);
    final String url = 'https://vision.googleapis.com/v1/images:annotate?key=$apiKey';

    final requestBody = {
      'requests': [
        {
          'image': {'content': base64Image},
          'features': [
            {'type': 'DOCUMENT_TEXT_DETECTION', 'maxResults': 50}
          ],
          'imageContext': {
            'languageHints': ['ja', 'en', 'zh', 'ko']
          }
        }
      ]
    };

    final response = await dio.post(
      url,
      data: requestBody,
      options: Options(headers: {'Content-Type': 'application/json'}),
    );

    if (response.statusCode != 200) {
      throw Exception('Cloud Vision API エラー: ${response.statusCode} - ${response.statusMessage}');
    }

    final data = response.data;
    final List<dynamic>? responses = data['responses'];
    if (responses == null || responses.isEmpty) return [];

    final firstResponse = responses[0];
    if (firstResponse['error'] != null) {
      throw Exception('Vision API Error: ${firstResponse['error']['message']}');
    }

    final fullTextAnnotation = firstResponse['fullTextAnnotation'];
    if (fullTextAnnotation == null) return [];

    final List<VisualTranslationAnnotation> annotations = [];
    final List<dynamic> pages = fullTextAnnotation['pages'] ?? [];

    for (final page in pages) {
      final double width = (page['width'] as num?)?.toDouble() ?? (imageWidth?.toDouble() ?? 1000.0);
      final double height = (page['height'] as num?)?.toDouble() ?? (imageHeight?.toDouble() ?? 1500.0);
      final List<dynamic> blocks = page['blocks'] ?? [];

      for (int bIdx = 0; bIdx < blocks.length; bIdx++) {
        final block = blocks[bIdx];
        final List<dynamic> paragraphs = block['paragraphs'] ?? [];
        final StringBuffer blockTextBuffer = StringBuffer();
        final List<Map<String, dynamic>> allVertices = [];

        for (final para in paragraphs) {
          final List<dynamic> words = para['words'] ?? [];
          for (final word in words) {
            final List<dynamic> symbols = word['symbols'] ?? [];
            for (final sym in symbols) {
              blockTextBuffer.write(sym['text'] ?? '');
            }
          }
        }

        final String text = blockTextBuffer.toString().trim();
        if (text.isEmpty) continue;

        // バウンディングボックスの頂点座標取得
        final boundingBox = block['boundingBox'];
        final List<dynamic> vertices = boundingBox?['vertices'] ?? [];

        double minX = double.infinity, minY = double.infinity;
        double maxX = -double.infinity, maxY = -double.infinity;
        double angle = 0.0;

        if (vertices.length >= 4) {
          final x0 = (vertices[0]['x'] as num?)?.toDouble() ?? 0.0;
          final y0 = (vertices[0]['y'] as num?)?.toDouble() ?? 0.0;
          final x1 = (vertices[1]['x'] as num?)?.toDouble() ?? x0;
          final y1 = (vertices[1]['y'] as num?)?.toDouble() ?? y0;

          // 頂点 0 と 1 のベクトルから回転角度（ラジアン）を算出
          final double dx = x1 - x0;
          final double dy = y1 - y0;
          angle = math.atan2(dy, dx);

          for (final v in vertices) {
            final double vx = (v['x'] as num?)?.toDouble() ?? 0.0;
            final double vy = (v['y'] as num?)?.toDouble() ?? 0.0;
            if (vx < minX) minX = vx;
            if (vy < minY) minY = vy;
            if (vx > maxX) maxX = vx;
            if (vy > maxY) maxY = vy;
          }
        }

        if (minX == double.infinity) continue;

        // 正規化座標 (0.0 - 1.0)
        final Rect normalizedRect = Rect.fromLTRB(
          (minX / width).clamp(0.0, 1.0),
          (minY / height).clamp(0.0, 1.0),
          (maxX / width).clamp(0.0, 1.0),
          (maxY / height).clamp(0.0, 1.0),
        );

        // 擬音判定 & 自動音訳
        final bool isOnomatopoeia = OnomatopoeiaDictionary.isOnomatopoeia(text);
        final String? onomatopoeiaTranslation = OnomatopoeiaDictionary.translate(text);

        // 縦横比から縦書き（日本の吹き出し）か横書きかを自動判定
        final bool isVertical = normalizedRect.height > (normalizedRect.width * 1.3);

        annotations.add(
          VisualTranslationAnnotation(
            id: 'block_$bIdx',
            sourceText: text,
            translatedText: onomatopoeiaTranslation ?? text,
            normalizedRect: normalizedRect,
            angle: angle,
            isOnomatopoeia: isOnomatopoeia,
            isVertical: isVertical,
            dominantColor: Colors.white,
          ),
        );
      }
    }

    return annotations;
  }
}

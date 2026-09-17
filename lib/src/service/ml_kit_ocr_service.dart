import 'dart:io' as io;
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:path_provider/path_provider.dart';
import '../model/visual_translation_annotation.dart';
import '../model/onomatopoeia_dictionary.dart';
import 'log.dart';

/// Google ML Kit を用いた完全オンデバイス（ローカル）文字認識サービス
/// 外部サーバーへの画像送信ゼロ、超高速（0.2〜0.5秒）、縦書き・横書き自動対応
class MlKitOcrService {
  static final MlKitOcrService _instance = MlKitOcrService._internal();
  factory MlKitOcrService() => _instance;
  MlKitOcrService._internal();

  /// スクリプト別の TextRecognizer キャッシュ
  final Map<TextRecognitionScript, TextRecognizer> _recognizers = {};

  TextRecognizer _getRecognizer(TextRecognitionScript script) {
    return _recognizers.putIfAbsent(script, () => TextRecognizer(script: script));
  }

  /// 言語コード（'ja', 'zh', 'ko', 'en' 等）から適切な ML Kit スクリプトを選択
  TextRecognitionScript resolveScript(String langCode) {
    final clean = langCode.toLowerCase().split('-').first.split('_').first.trim();
    switch (clean) {
      case 'ja':
      case 'japanese':
        return TextRecognitionScript.japanese;
      case 'zh':
      case 'chinese':
        return TextRecognitionScript.chinese;
      case 'ko':
      case 'korean':
        return TextRecognitionScript.korean;
      case 'en':
      case 'latin':
      default:
        return TextRecognitionScript.latin;
    }
  }

  /// 画像バイト列から文字認識を実行し、スマート行結合・吹き出しクラスタリングを適用したアノテーション群を返却
  Future<List<VisualTranslationAnnotation>> detectText({
    required Uint8List imageBytes,
    required String languageCode,
    int? imageWidth,
    int? imageHeight,
  }) async {
    // ML Kit は Android / iOS ネイティブ専用
    if (!GetPlatform.isAndroid && !GetPlatform.isIOS) {
      log.warning('[MlKitOcrService] ML Kit is only supported on Android/iOS');
      return [];
    }

    io.File? tempFile;
    try {
      final script = resolveScript(languageCode);
      final recognizer = _getRecognizer(script);

      // 一時ファイルに画像を書き出して InputImage を生成
      final tempDir = await getTemporaryDirectory();
      final tempPath = '${tempDir.path}/mlkit_${DateTime.now().microsecondsSinceEpoch}.jpg';
      tempFile = io.File(tempPath);
      await tempFile.writeAsBytes(imageBytes, flush: true);

      final inputImage = InputImage.fromFilePath(tempPath);
      final RecognizedText recognizedText = await recognizer.processImage(inputImage);

      final double w = (imageWidth != null && imageWidth > 0) ? imageWidth.toDouble() : 1000.0;
      final double h = (imageHeight != null && imageHeight > 0) ? imageHeight.toDouble() : 1500.0;

      final List<_RawLineInfo> rawLines = [];

      for (final block in recognizedText.blocks) {
        for (final line in block.lines) {
          final String text = line.text.trim();
          if (text.isEmpty) continue;
          final rect = line.boundingBox;
          if (rect.width < 4.0 && rect.height < 4.0) continue;

          rawLines.add(_RawLineInfo(
            text: text,
            rect: rect,
            isVertical: rect.height > (rect.width * 1.15),
          ));
        }
      }

      if (rawLines.isEmpty) return [];

      // スマート行・文章結合アルゴリズム（吹き出しクラスタリング ＆ 句読点連続結合）
      final mergedAnnotations = _mergeLinesIntoBubbles(rawLines, w, h);
      log.info('[MlKitOcrService] Detected ${rawLines.length} raw lines, merged into ${mergedAnnotations.length} bubbles (script: ${script.name})');
      return mergedAnnotations;
    } catch (e, stack) {
      log.error('[MlKitOcrService] Detection failed: $e', e, stack);
      return [];
    } finally {
      if (tempFile != null && await tempFile.exists()) {
        try {
          await tempFile.delete();
        } catch (_) {}
      }
    }
  }

  /// 近接行の幾何的クラスタリング ＆ 句読点判定による吹き出し文章結合
  List<VisualTranslationAnnotation> _mergeLinesIntoBubbles(
    List<_RawLineInfo> lines,
    double imageWidth,
    double imageHeight,
  ) {
    final List<List<_RawLineInfo>> clusters = [];

    // 距離しきい値（画像サイズに対する相対割合）
    final double distThreshX = imageWidth * 0.045;
    final double distThreshY = imageHeight * 0.040;

    for (final line in lines) {
      bool added = false;
      for (final cluster in clusters) {
        // クラスタ全体の現在バウンディングボックス
        double minX = double.infinity, minY = double.infinity;
        double maxX = -double.infinity, maxY = -double.infinity;

        for (final item in cluster) {
          minX = math.min(minX, item.rect.left);
          minY = math.min(minY, item.rect.top);
          maxX = math.max(maxX, item.rect.right);
          maxY = math.max(maxY, item.rect.bottom);
        }

        // 幾何的近接判定（吹き出し内の行間距離）
        final bool xOverlap = (line.rect.left <= maxX + distThreshX) && (line.rect.right >= minX - distThreshX);
        final bool yOverlap = (line.rect.top <= maxY + distThreshY) && (line.rect.bottom >= minY - distThreshY);

        if (xOverlap && yOverlap) {
          cluster.add(line);
          added = true;
          break;
        }
      }
      if (!added) {
        clusters.add([line]);
      }
    }

    final List<VisualTranslationAnnotation> result = [];

    for (int i = 0; i < clusters.length; i++) {
      final cluster = clusters[i];
      if (cluster.isEmpty) continue;

      // 縦書き行の割合からクラスタ全体の方向を判定
      final int verticalCount = cluster.where((l) => l.isVertical).length;
      final bool isVertical = verticalCount >= (cluster.length / 2);

      // 行の並び順ソート
      if (isVertical) {
        // 縦書き（日本のマンガ）: 右から左へ列が並び、列内は上から下へ
        cluster.sort((a, b) {
          final double dx = b.rect.center.dx - a.rect.center.dx;
          if (dx.abs() > (a.rect.width * 0.5)) {
            return dx.sign.toInt();
          }
          return a.rect.top.compareTo(b.rect.top);
        });
      } else {
        // 横書き: 上から下へ行が並び、行内は左から右へ
        cluster.sort((a, b) {
          final double dy = a.rect.center.dy - b.rect.center.dy;
          if (dy.abs() > (a.rect.height * 0.5)) {
            return dy.sign.toInt();
          }
          return a.rect.left.compareTo(b.rect.left);
        });
      }

      // 文章の結合（句読点判定）
      final StringBuffer textBuffer = StringBuffer();
      double minX = double.infinity, minY = double.infinity;
      double maxX = -double.infinity, maxY = -double.infinity;

      for (int lIdx = 0; lIdx < cluster.length; lIdx++) {
        final cur = cluster[lIdx];
        minX = math.min(minX, cur.rect.left);
        minY = math.min(minY, cur.rect.top);
        maxX = math.max(maxX, cur.rect.right);
        maxY = math.max(maxY, cur.rect.bottom);

        final String lineText = cur.text.trim();
        if (lineText.isEmpty) continue;

        if (textBuffer.isEmpty) {
          textBuffer.write(lineText);
        } else {
          final lastChar = textBuffer.toString().trim().characters.last;
          // 日本語・中国語の連続結合（句読点または読点「、」・助詞での改行）
          final bool isCjkLast = RegExp(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]').hasMatch(lastChar);
          final bool isCjkNext = RegExp(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]').hasMatch(lineText.characters.first);

          if (isCjkLast && isCjkNext) {
            // CJK同士の改行はスペースを挟まず直接結合
            textBuffer.write(lineText);
          } else {
            // 欧文アルファベットや数字の改行は半角スペースで結合
            textBuffer.write(' $lineText');
          }
        }
      }

      final String combinedText = textBuffer.toString().trim();
      if (combinedText.isEmpty) continue;

      // 1文字だけの記号・ノイズゴミを除外
      if (combinedText.length == 1 && RegExp(r'[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]').hasMatch(combinedText)) {
        continue;
      }

      // 外接矩形の正規化 (0.0 - 1.0)
      final Rect normRect = Rect.fromLTRB(
        (minX / imageWidth).clamp(0.0, 1.0),
        (minY / imageHeight).clamp(0.0, 1.0),
        (maxX / imageWidth).clamp(0.0, 1.0),
        (maxY / imageHeight).clamp(0.0, 1.0),
      );

      final bool isOnomatopoeia = OnomatopoeiaDictionary.isOnomatopoeia(combinedText);
      final String? onomatopoeiaTranslation = OnomatopoeiaDictionary.translate(combinedText);

      result.add(VisualTranslationAnnotation(
        id: 'mlkit_${DateTime.now().microsecondsSinceEpoch}_$i',
        sourceText: combinedText,
        translatedText: onomatopoeiaTranslation ?? combinedText,
        normalizedRect: normRect,
        isVertical: isVertical,
        isOnomatopoeia: isOnomatopoeia,
        dominantColor: Colors.white,
      ));
    }

    return result;
  }

  void dispose() {
    for (final recognizer in _recognizers.values) {
      recognizer.close();
    }
    _recognizers.clear();
  }
}

class _RawLineInfo {
  final String text;
  final Rect rect;
  final bool isVertical;

  _RawLineInfo({
    required this.text,
    required this.rect,
    required this.isVertical,
  });
}

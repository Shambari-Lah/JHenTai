import 'dart:ui';
import 'package:flutter/material.dart';

/// 視覚コンテンツ（漫画・絵物語）内の翻訳テキストボックス情報
class VisualTranslationAnnotation {
  final String id;
  final String sourceText;
  String translatedText;
  
  /// 正規化されたバウンディングボックス (0.0 - 1.0)
  final Rect normalizedRect;
  
  /// 傾き・回転角度（ラジアン）
  final double angle;
  
  /// 背景消去（インペインティング）用サンプリング色
  final Color dominantColor;
  
  /// 擬音（オノマトペ）フラグ
  final bool isOnomatopoeia;
  
  /// 手書き文字フラグ
  final bool isHandwriting;
  
  /// 縦書きフラグ (日本語の伝統的な吹き出し)
  final bool isVertical;
  
  /// フォントスタイル設定
  final double? customFontSize;
  final Color textColor;
  final Color strokeColor;
  final double strokeWidth;

  VisualTranslationAnnotation({
    required this.id,
    required this.sourceText,
    required this.translatedText,
    required this.normalizedRect,
    this.angle = 0.0,
    this.dominantColor = Colors.white,
    this.isOnomatopoeia = false,
    this.isHandwriting = false,
    this.isVertical = false,
    this.customFontSize,
    this.textColor = Colors.black,
    this.strokeColor = Colors.white,
    this.strokeWidth = 2.0,
  });

  /// 実際の画像サイズ (imageWidth, imageHeight) における絶対座標 Rect を計算
  Rect getAbsoluteRect(double imageWidth, double imageHeight) {
    return Rect.fromLTWH(
      normalizedRect.left * imageWidth,
      normalizedRect.top * imageHeight,
      normalizedRect.width * imageWidth,
      normalizedRect.height * imageHeight,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sourceText': sourceText,
      'translatedText': translatedText,
      'normalizedRect': [
        normalizedRect.left,
        normalizedRect.top,
        normalizedRect.width,
        normalizedRect.height,
      ],
      'angle': angle,
      'dominantColor': dominantColor.value,
      'isOnomatopoeia': isOnomatopoeia,
      'isHandwriting': isHandwriting,
      'isVertical': isVertical,
      'textColor': textColor.value,
      'strokeColor': strokeColor.value,
      'strokeWidth': strokeWidth,
    };
  }

  factory VisualTranslationAnnotation.fromJson(Map<String, dynamic> json) {
    final rectList = (json['normalizedRect'] as List).cast<num>();
    return VisualTranslationAnnotation(
      id: json['id'] as String,
      sourceText: json['sourceText'] as String,
      translatedText: json['translatedText'] as String,
      normalizedRect: Rect.fromLTWH(
        rectList[0].toDouble(),
        rectList[1].toDouble(),
        rectList[2].toDouble(),
        rectList[3].toDouble(),
      ),
      angle: (json['angle'] as num?)?.toDouble() ?? 0.0,
      dominantColor: Color(json['dominantColor'] as int? ?? 0xFFFFFFFF),
      isOnomatopoeia: json['isOnomatopoeia'] as bool? ?? false,
      isHandwriting: json['isHandwriting'] as bool? ?? false,
      isVertical: json['isVertical'] as bool? ?? false,
      textColor: Color(json['textColor'] as int? ?? 0xFF000000),
      strokeColor: Color(json['strokeColor'] as int? ?? 0xFFFFFFFF),
      strokeWidth: (json['strokeWidth'] as num?)?.toDouble() ?? 2.0,
    );
  }
}

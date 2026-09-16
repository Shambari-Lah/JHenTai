import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../model/visual_translation_annotation.dart';

/// 各ページ画像の上に重ねて表示する翻訳合成オーバーレイ
class TranslationOverlayWidget extends StatelessWidget {
  final List<VisualTranslationAnnotation> annotations;
  final double imageWidth;
  final double imageHeight;
  final bool isVisible;
  final Function(VisualTranslationAnnotation annotation)? onAnnotationTap;

  const TranslationOverlayWidget({
    super.key,
    required this.annotations,
    required this.imageWidth,
    required this.imageHeight,
    this.isVisible = true,
    this.onAnnotationTap,
  });

  @override
  Widget build(BuildContext context) {
    if (!isVisible || annotations.isEmpty) {
      return const SizedBox.shrink();
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final double renderWidth = (constraints.maxWidth.isFinite && constraints.maxWidth > 0)
            ? constraints.maxWidth
            : (imageWidth > 0 ? imageWidth : 300.0);
        final double renderHeight = (constraints.maxHeight.isFinite && constraints.maxHeight > 0)
            ? constraints.maxHeight
            : (imageHeight > 0 ? imageHeight : 400.0);

        return Stack(
          children: [
            // 1. キャンバス描画（背景消去・インペインティング＆テキスト合成）
            CustomPaint(
              size: Size(renderWidth, renderHeight),
              painter: _TranslationCanvasPainter(
                annotations: annotations,
                renderWidth: renderWidth,
                renderHeight: renderHeight,
              ),
            ),

            // 2. タップ検知レイヤー（吹き出しタップで原文・訳文比較ダイアログ表示）
            ...annotations.map((ann) {
              final rect = ann.getAbsoluteRect(renderWidth, renderHeight);
              return Positioned(
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onAnnotationTap?.call(ann),
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: Colors.teal.withOpacity(0.3),
                        width: 1.0,
                      ),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              );
            }),
          ],
        );
      },
    );
  }
}

/// インペインティング（元文字消去）とテキストレンダリングを行う CustomPainter
class _TranslationCanvasPainter extends CustomPainter {
  final List<VisualTranslationAnnotation> annotations;
  final double renderWidth;
  final double renderHeight;

  _TranslationCanvasPainter({
    required this.annotations,
    required this.renderWidth,
    required this.renderHeight,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (renderWidth <= 0 || renderHeight <= 0 || renderWidth.isInfinite || renderHeight.isInfinite) {
      return;
    }

    for (final ann in annotations) {
      try {
        final rect = ann.getAbsoluteRect(renderWidth, renderHeight);
        if (rect.isEmpty || rect.width <= 2.0 || rect.height <= 2.0 || rect.hasNaN) continue;

        canvas.save();

        // 回転中心点（吹き出しの中心）
        final Offset center = rect.center;
        canvas.translate(center.dx, center.dy);
        if (ann.angle != 0.0 && !ann.angle.isNaN) {
          canvas.rotate(ann.angle);
        }

        final Rect localRect = Rect.fromCenter(
          center: Offset.zero,
          width: rect.width,
          height: rect.height,
        );

        // --- 1. 背景インペインティング消去 ---
        final Paint erasePaint = Paint()
          ..color = ann.dominantColor
          ..style = PaintingStyle.fill;

        // 角丸の矩形で元テキストを綺麗に塗りつぶして消去
        final RRect bubbleRRect = RRect.fromRectAndRadius(
          localRect.inflate(2.0),
          const Radius.circular(4.0),
        );
        canvas.drawRRect(bubbleRRect, erasePaint);

        // --- 2. 翻訳テキストの自動フィッティング計算 ---
        final String displayText = ann.translatedText;
        if (displayText.isEmpty) {
          canvas.restore();
          continue;
        }

        double fontSize = ann.customFontSize ?? _calculateOptimalFontSize(displayText, localRect.size);

        // 擬音の場合はよりダイナミックに強調
        if (ann.isOnomatopoeia) {
          fontSize = math.max(fontSize * 1.25, 14.0);
        }

        final double safeWidth = math.max(1.0, localRect.width);

        // --- 3. コミック風フォントの輪郭（フチ取り）描画 ---
        final TextSpan strokeSpan = TextSpan(
          text: displayText,
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: ann.isOnomatopoeia ? FontWeight.w900 : FontWeight.bold,
            fontFamily: 'Kosugi Maru',
            fontFamilyFallback: const ['sans-serif', 'Noto Sans CJK JP', 'PingFang SC', 'Apple SD Gothic Neo'],
            foreground: Paint()
              ..style = PaintingStyle.stroke
              ..strokeWidth = math.max(0.5, ann.strokeWidth)
              ..color = ann.strokeColor,
          ),
        );

        final TextPainter strokePainter = TextPainter(
          text: strokeSpan,
          textAlign: TextAlign.center,
          textDirection: TextDirection.ltr,
        )..layout(maxWidth: safeWidth);

        // 垂直・水平センタリング位置
        final Offset textOffset = Offset(
          -strokePainter.width / 2,
          -strokePainter.height / 2,
        );

        strokePainter.paint(canvas, textOffset);

        // --- 4. 前景テキスト描画（シャドウ付き） ---
        final TextSpan textSpan = TextSpan(
          text: displayText,
          style: TextStyle(
            fontSize: fontSize,
            color: ann.textColor,
            fontWeight: ann.isOnomatopoeia ? FontWeight.w900 : FontWeight.bold,
            fontFamily: 'Kosugi Maru',
            fontFamilyFallback: const ['sans-serif', 'Noto Sans CJK JP', 'PingFang SC', 'Apple SD Gothic Neo'],
            shadows: [
              Shadow(
                blurRadius: 2.0,
                color: Colors.black.withOpacity(0.4),
                offset: const Offset(1, 1),
              ),
            ],
          ),
        );

        final TextPainter textPainter = TextPainter(
          text: textSpan,
          textAlign: TextAlign.center,
          textDirection: TextDirection.ltr,
        )..layout(maxWidth: safeWidth);

        textPainter.paint(canvas, textOffset);

        canvas.restore();
      } catch (e) {
        // 個別の吹き出し描画エラーで画面全体をクラッシュさせない
        try {
          canvas.restore();
        } catch (_) {}
      }
    }
  }

  /// ボックスの幅・高さに収まる最適なフォントサイズを二分探索で算出
  double _calculateOptimalFontSize(String text, Size boxSize) {
    if (text.isEmpty) return 12.0;
    if (boxSize.width <= 2.0 || boxSize.height <= 2.0 || boxSize.width.isNaN || boxSize.height.isNaN) {
      return 12.0;
    }

    final double safeMaxWidth = math.max(1.0, boxSize.width);
    double minSize = 8.0;
    double maxSize = math.min(32.0, math.max(12.0, boxSize.height));
    double bestSize = minSize;

    for (int i = 0; i < 6; i++) {
      final double midSize = (minSize + maxSize) / 2;
      try {
        final TextPainter tp = TextPainter(
          text: TextSpan(
            text: text,
            style: TextStyle(fontSize: midSize, fontWeight: FontWeight.bold),
          ),
          textDirection: TextDirection.ltr,
        )..layout(maxWidth: safeMaxWidth);

        if (tp.height <= boxSize.height && tp.width <= safeMaxWidth) {
          bestSize = midSize;
          minSize = midSize;
        } else {
          maxSize = midSize;
        }
      } catch (_) {
        break;
      }
    }

    return bestSize.clamp(10.0, 24.0);
  }

  @override
  bool shouldRepaint(covariant _TranslationCanvasPainter oldDelegate) {
    return oldDelegate.annotations != annotations ||
        oldDelegate.renderWidth != renderWidth ||
        oldDelegate.renderHeight != renderHeight;
  }
}

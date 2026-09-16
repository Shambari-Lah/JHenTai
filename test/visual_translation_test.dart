import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jhentai/src/model/onomatopoeia_dictionary.dart';
import 'package:jhentai/src/model/visual_translation_annotation.dart';
import 'package:jhentai/src/service/image_preprocessing_service.dart';

void main() {
  group('OnomatopoeiaDictionary Tests', () {
    test('Correctly identifies and translates common comic sound effects', () {
      expect(OnomatopoeiaDictionary.isOnomatopoeia('ドキドキ'), isTrue);
      expect(OnomatopoeiaDictionary.translate('ドキドキ'), equals('*Thump-thump*'));

      expect(OnomatopoeiaDictionary.isOnomatopoeia('ゴゴゴ…'), isTrue);
      expect(OnomatopoeiaDictionary.translate('ゴゴゴ…'), equals('*MENACING...*'));

      expect(OnomatopoeiaDictionary.isOnomatopoeia('ドカーン！'), isTrue);
      expect(OnomatopoeiaDictionary.translate('ドカーン！'), equals('*BANG!*'));

      expect(OnomatopoeiaDictionary.isOnomatopoeia('にこにこ'), isTrue);
      expect(OnomatopoeiaDictionary.translate('にこにこ'), equals('*Beaming smile*'));

      expect(OnomatopoeiaDictionary.isOnomatopoeia('こんにちは'), isFalse);
      expect(OnomatopoeiaDictionary.translate('こんにちは'), isNull);
    });
  });

  group('VisualTranslationAnnotation Model Tests', () {
    test('Correctly computes absolute rect and serializes to/from JSON', () {
      final ann = VisualTranslationAnnotation(
        id: 'ann_1',
        sourceText: 'こんにちは',
        translatedText: 'Hello',
        normalizedRect: const Rect.fromLTWH(0.1, 0.2, 0.3, 0.4),
        angle: 0.15,
        dominantColor: const Color(0xFFFFFFFF),
        isOnomatopoeia: false,
        isVertical: true,
      );

      final absRect = ann.getAbsoluteRect(1000, 2000);
      expect(absRect.left, closeTo(100.0, 0.001));
      expect(absRect.top, closeTo(400.0, 0.001));
      expect(absRect.width, closeTo(300.0, 0.001));
      expect(absRect.height, closeTo(800.0, 0.001));

      final json = ann.toJson();
      final restored = VisualTranslationAnnotation.fromJson(json);

      expect(restored.id, equals(ann.id));
      expect(restored.sourceText, equals(ann.sourceText));
      expect(restored.translatedText, equals(ann.translatedText));
      expect(restored.normalizedRect, equals(ann.normalizedRect));
      expect(restored.angle, closeTo(0.15, 0.001));
    });
  });

  group('ImagePreprocessingService Tests', () {
    test('Enhances contrast and binarizes raw RGBA bytes', () {
      final Uint8List fakeRgba = Uint8List(16); // 2x2 image
      // pixel 0: dark grey (80, 80, 80, 255)
      fakeRgba[0] = 80; fakeRgba[1] = 80; fakeRgba[2] = 80; fakeRgba[3] = 255;
      // pixel 1: light grey (200, 200, 200, 255)
      fakeRgba[4] = 200; fakeRgba[5] = 200; fakeRgba[6] = 200; fakeRgba[7] = 255;
      // pixel 2: pure black (0, 0, 0, 255)
      fakeRgba[8] = 0; fakeRgba[9] = 0; fakeRgba[10] = 0; fakeRgba[11] = 255;
      // pixel 3: pure white (255, 255, 255, 255)
      fakeRgba[12] = 255; fakeRgba[13] = 255; fakeRgba[14] = 255; fakeRgba[15] = 255;

      final binarized = ImagePreprocessingService.enhanceForOcr(
        fakeRgba, 2, 2, binarize: true, threshold: 140,
      );

      expect(binarized.length, equals(16));
      expect(binarized[0], equals(0));    // dark grey -> 0 (black text)
      expect(binarized[4], equals(255));  // light grey -> 255 (white background)
      expect(binarized[8], equals(0));    // pure black -> 0
      expect(binarized[12], equals(255)); // pure white -> 255
    });
  });
}

import 'dart:convert';
import 'package:dio/dio.dart';

enum TranslationEngine {
  googleGtx, // Google 無料エンドポイント (高速・APIキー不要)
  gemini,    // Google Gemini AI (高度文脈把握・マンガ特化セリフ翻訳・無料キー対応)
  deepl,     // DeepL API (自然な口語翻訳)
}

/// テキスト機械翻訳サービス（Google GTX / Gemini AI / DeepL 対応）
class TextTranslationService {
  static final Dio _dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    ),
  );

  /// 翻訳テキストのインメモリキャッシュ (キー: "${engine}_${sourceLang}_${targetLang}_${text}")
  static final Map<String, String> _translationCache = {};

  /// 複数テキストの一括翻訳 (エンジン選択対応)
  static Future<List<String>> translateBatch({
    required List<String> texts,
    String sourceLang = 'auto',
    required String targetLang,
    TranslationEngine engine = TranslationEngine.googleGtx,
    String? geminiApiKey,
    String? deeplApiKey,
  }) async {
    if (texts.isEmpty) return [];

    // 1. Gemini AI 翻訳
    if (engine == TranslationEngine.gemini && geminiApiKey != null && geminiApiKey.isNotEmpty) {
      try {
        final geminiResults = await _translateViaGemini(
          texts: texts,
          sourceLang: sourceLang,
          targetLang: targetLang,
          apiKey: geminiApiKey,
        );
        if (geminiResults.isNotEmpty && geminiResults.length == texts.length) {
          return geminiResults;
        }
      } catch (e) {
        // フォールバック
      }
    }

    // 2. DeepL 翻訳
    if (engine == TranslationEngine.deepl && deeplApiKey != null && deeplApiKey.isNotEmpty) {
      try {
        final deeplResults = await _translateViaDeepL(
          texts: texts,
          sourceLang: sourceLang,
          targetLang: targetLang,
          apiKey: deeplApiKey,
        );
        if (deeplResults.isNotEmpty && deeplResults.length == texts.length) {
          return deeplResults;
        }
      } catch (e) {
        // フォールバック
      }
    }

    // 3. 標準 Google GTX / MyMemory 翻訳（高速・キー不要）
    final List<String> results = [];
    for (final text in texts) {
      final translated = await translateText(
        text: text,
        sourceLang: sourceLang,
        targetLang: targetLang,
      );
      results.add(translated);
    }
    return results;
  }

  /// 単一テキストの翻訳 (Google GTX / MyMemory)
  static Future<String> translateText({
    required String text,
    String sourceLang = 'auto',
    required String targetLang,
  }) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return text;

    final cacheKey = 'gtx_${sourceLang}_${targetLang}_$trimmed';
    if (_translationCache.containsKey(cacheKey)) {
      return _translationCache[cacheKey]!;
    }

    // Google Translate (GTX) 無料エンドポイント
    try {
      final String gtxUrl =
          'https://translate.googleapis.com/translate_a/single?client=gtx&sl=${Uri.encodeComponent(sourceLang)}&tl=${Uri.encodeComponent(targetLang)}&dt=t&q=${Uri.encodeComponent(trimmed)}';

      final response = await _dio.get(gtxUrl);
      if (response.statusCode == 200 && response.data != null) {
        dynamic data = response.data;
        if (data is String) {
          data = jsonDecode(data);
        }
        if (data is List && data.isNotEmpty && data[0] is List) {
          final StringBuffer sb = StringBuffer();
          for (final segment in data[0]) {
            if (segment is List && segment.isNotEmpty && segment[0] != null) {
              sb.write(segment[0].toString());
            }
          }
          final result = sb.toString().trim();
          if (result.isNotEmpty) {
            _translationCache[cacheKey] = result;
            return result;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // MyMemory フォールバック
    try {
      final src = (sourceLang == 'auto' || sourceLang.isEmpty) ? 'autodetect' : sourceLang;
      final String myMemoryUrl =
          'https://api.mymemory.translated.net/get?q=${Uri.encodeComponent(trimmed)}&langpair=${Uri.encodeComponent(src)}|${Uri.encodeComponent(targetLang)}';

      final response = await _dio.get(myMemoryUrl);
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data is String ? jsonDecode(response.data) : response.data;
        final resData = data['responseData'];
        if (resData != null && resData['translatedText'] != null) {
          final String translated = resData['translatedText'].toString().trim();
          if (translated.isNotEmpty && !translated.startsWith('MYMEMORY WARNING:')) {
            _translationCache[cacheKey] = translated;
            return translated;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    return text;
  }

  /// Google Gemini AI による高度マンガ文脈理解翻訳
  static Future<List<String>> _translateViaGemini({
    required List<String> texts,
    required String sourceLang,
    required String targetLang,
    required String apiKey,
  }) async {
    final String url =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey';

    final String prompt =
        'You are an expert manga and comic localization translator. '
        'Translate the following list of dialogue and caption texts into natural $targetLang. '
        'Consider comic context, emotional nuances, and character dialogue phrasing. '
        'Respond ONLY with a JSON array of translated strings in the EXACT same order.\n'
        'Input JSON: ${jsonEncode(texts)}';

    final requestBody = {
      'contents': [
        {
          'parts': [
            {'text': prompt}
          ]
        }
      ],
      'generationConfig': {
        'temperature': 0.3,
        'responseMimeType': 'application/json',
      }
    };

    final response = await _dio.post(
      url,
      data: requestBody,
      options: Options(headers: {'Content-Type': 'application/json'}),
    );

    if (response.statusCode == 200 && response.data != null) {
      final candidates = response.data['candidates'];
      if (candidates is List && candidates.isNotEmpty) {
        final content = candidates[0]['content'];
        final parts = content?['parts'];
        if (parts is List && parts.isNotEmpty) {
          final String textResponse = parts[0]['text'] ?? '';
          final decoded = jsonDecode(textResponse.trim());
          if (decoded is List) {
            return decoded.map((e) => e.toString()).toList();
          }
        }
      }
    }
    return [];
  }

  /// DeepL API による自然な翻訳
  static Future<List<String>> _translateViaDeepL({
    required List<String> texts,
    required String sourceLang,
    required String targetLang,
    required String apiKey,
  }) async {
    final bool isFree = apiKey.endsWith(':fx');
    final String url = isFree
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate';

    // DeepL のターゲット言語コード正規化 (例: ja -> JA, en -> EN-US, zh -> ZH)
    String deeplTarget = targetLang.toUpperCase();
    if (deeplTarget == 'EN') deeplTarget = 'EN-US';
    if (deeplTarget.startsWith('ZH')) deeplTarget = 'ZH';

    final requestBody = {
      'text': texts,
      'target_lang': deeplTarget,
    };
    if (sourceLang != 'auto' && sourceLang.isNotEmpty) {
      requestBody['source_lang'] = sourceLang.toUpperCase();
    }

    final response = await _dio.post(
      url,
      data: requestBody,
      options: Options(
        headers: {
          'Authorization': 'DeepL-Auth-Key $apiKey',
          'Content-Type': 'application/json',
        },
      ),
    );

    if (response.statusCode == 200 && response.data != null) {
      final translations = response.data['translations'];
      if (translations is List) {
        return translations.map((t) => t['text'].toString()).toList();
      }
    }
    return [];
  }

  static void clearCache() {
    _translationCache.clear();
  }
}

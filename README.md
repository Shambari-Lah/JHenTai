# 多言語視覚コンテンツ翻訳ツール (Multilingual Visual Content Translator)

[![Flutter Version](https://img.shields.io/badge/Flutter-3.24.5-blue.svg)](https://flutter.dev)
[![Dart Version](https://img.shields.io/badge/Dart-3.5.4-blue.svg)](https://dart.dev)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Windows%20%7C%20iOS%20%7C%20macOS%20%7C%20Linux-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-GPL%20v3-orange.svg)](LICENSE)

クロスプラットフォーム対応の漫画・視覚コンテンツ閲覧＆リアルタイム翻訳アプリケーションです。  
完成度の高いオープンソースビューア **JHenTai** の堅牢なUI／レンダリングエンジン／キャッシュ管理機構をベースに、**Google Cloud Vision API**、**スクリーントーン適応二値化ローカルOCR前処理エンジン**、**吹き出しインペインティング消去**、**150語以上のオノマトペ辞書**、および**コミック調フォント描画エンジン**を Dart / Flutter で完全統合・刷新しました。

---

## 主な機能と特徴

### 1. 高精度マルチモーダル文字認識 (Cloud Vision & Enhanced Local OCR)
- **Google Cloud Vision API (DOCUMENT_TEXT_DETECTION)**:
  - 吹き出し内の縦書き文章、密集した手書き文字、傾いたセリフをブロック／パラグラフ／単語／シンボル階層で高精度認識。
  - バウンディングボックス頂点座標（ポリゴン）を取得し、傾き角度（Angle）を正確に計算。
- **ローカル文字認識の超高精度化 (ImagePreprocessingService)**:
  - 漫画特有の網点（スクリーントーン）による認識率低下を防ぐ適応的二値化（Adaptive Binarization）アルゴリズムを実装。
  - コントラストストレッチング（Contrast Stretching）および輝度正規化により、薄い文字や暗い背景でのオンデバイス文字認識精度を大幅向上。

### 2. インペインティング（元文字消去）＆ 背景適応
- 吹き出し境界の周辺ピクセルから背景色（白色・薄色）およびテキスト色を自動サンプリング。
- Flutter の CustomPainter により、元言語の文字を自然な丸角矩形でインペイント消去。汚い塗りつぶし跡を残さず、滑らかな翻訳領域を生成。

### 3. オノマトペ（擬音・効果音）辞書＆自動音訳 (OnomatopoeiaDictionary)
- 150語以上の日本語漫画効果音（「ドキドキ」「ゴゴゴ…」「ドカーン！」「バキッ」「ざわざわ」「チラッ」等）を収録。
- 長音符（ー）、促音（ッ）、感嘆符（！/？）の正規化マッチングを行い、文脈に即したコミック調の英訳／効果音表現（*MENACING...*, *KABOOM!*, *Thump-thump* など）へ自動変換。

### 4. コミック調フォント合成＆オーバーレイ (TranslationOverlayWidget)
- 原文の傾き（Angle）に同期したテキスト回転描画。
- 極太アウトライン輪郭線（Stroke）＋ドロップシャドウ（Shadow）によるアメコミ・漫画風スタイリング。
- 吹き出しタップによる**原文・訳文比較＆手動編集ダイアログ (BubbleEditDialog)** を搭載。

### 5. 多彩な閲覧モード
- **Webtoon（縦スクロール連続表示）**
- **右開き漫画モード（Right to Left）**
- **左開き通常モード（Left to Right）**
- **見開き2ページ表示モード（Double Column Spread）**
すべてのレイアウトにおいて翻訳オーバーレイがシームレスに同期・追従します。

### 6. 共通プラグイン・データモデル (ComicSource)
- NotebookLM 解析知見に基づく共通メタデータ構造（ギャラリー要約、詳細、チャプター、画像URL）を採用し、汎用的な拡張に対応。

---

## ディレクトリ構成

- lib/src/model/: 視覚翻訳データ構造 (isual_translation_annotation.dart)、オノマトペ辞書 (onomatopoeia_dictionary.dart)、コミックデータモデル (comic_source.dart)
- lib/src/service/: Cloud Vision API 連携 (cloud_vision_service.dart)、画像前処理・トーン除去 (image_preprocessing_service.dart)、翻訳ライフサイクル管理 (isual_translation_service.dart)
- lib/src/widget/: 翻訳オーバーレイ描画 (	ranslation_overlay_widget.dart)、吹き出し編集ダイアログ (ubble_edit_dialog.dart)
- ndroid/: Android ネイティブプロジェクト (Compile SDK 35 / Min SDK 24 / NDK)
- 	est/: 単体テスト群 (isual_translation_test.dart)
- pk/: ビルド済み Android デバッグ APK (pp-debug.apk)
- legacy/: 旧バージョンの Web クライアント (React/Capacitor) および Node.js サーバー

---

## ビルド＆実行方法

### 動作前提環境
- **Flutter**: 3.24.5 (Channel stable)
- **Dart**: 3.5.4
- **Java JDK**: 20 (C:\Program Files\Java\jdk-20)
- **Android SDK**: Platform 34/35, Build-tools 35.0.0

### Android APK のビルド
`powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-20"
flutter build apk --debug
`
ビルドされた APK は uild/app/outputs/flutter-apk/app-debug.apk および pk/app-debug.apk に出力されます。

### 単体テストの実行
`powershell
flutter test test/visual_translation_test.dart --no-pub
`

### Windows デスクトップ版の実行
`powershell
flutter run -d windows
`

---

## 変更履歴 (Changelog)
- **2026-09**: JHenTai (Flutter) をベースにビューア刷新。Google Cloud Vision OCR、スクリーントーン適応二値化前処理、インペインティング、オノマトペ辞書、コミックフォント合成オーバーレイ、吹き出し編集ダイアログを実装・統合。Android APK ビルド成功。

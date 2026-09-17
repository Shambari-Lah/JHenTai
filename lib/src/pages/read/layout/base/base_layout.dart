import 'dart:io' as io;
import 'dart:math';
import 'dart:typed_data';

import 'package:extended_image/extended_image.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:jhentai/src/service/gallery_download/download_path_resolver.dart';
import 'package:jhentai/src/extension/get_logic_extension.dart';
import 'package:jhentai/src/model/read_page_info.dart';
import 'package:jhentai/src/setting/read_setting.dart';
import 'package:scrollable_positioned_list/scrollable_positioned_list.dart';

import '../../../../config/ui_config.dart';
import '../../../../service/gallery_download/gallery_download_service.dart';
import '../../../../service/super_resolution_service.dart';
import '../../../../service/visual_translation_service.dart';
import '../../../../service/log.dart';
import '../../../../widget/bubble_edit_dialog.dart';
import '../../../../widget/eh_image.dart';
import '../../../../widget/icon_text_button.dart';
import '../../../../widget/loading_state_indicator.dart';
import '../../../../widget/translation_overlay_widget.dart';
import '../../read_page_logic.dart';
import '../../read_page_state.dart';
import 'base_layout_logic.dart';

class ScrollOffsetToScrollController extends ScrollController {
  ScrollOffsetToScrollController({required this.scrollOffsetController});

  final ScrollOffsetController scrollOffsetController;

  @override
  ScrollPosition get position => scrollOffsetController.position;

  @override
  Future<void> animateTo(double offset, {required Duration duration, required Curve curve}) async {
    await position.animateTo(offset, duration: duration, curve: curve);
  }

  @override
  void jumpTo(double value) {
    scrollOffsetController.jumpTo(value: value);
  }
}

abstract class BaseLayout extends StatelessWidget {
  BaseLayout({Key? key}) : super(key: key);

  final ReadPageLogic readPageLogic = Get.find<ReadPageLogic>();
  final ReadPageState readPageState = Get.find<ReadPageLogic>().state;

  BaseLayoutLogic get logic;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(future: logic.readPageLogic.delayInitCompleter.future, builder: (context, snapshot) {
      if (snapshot.connectionState == ConnectionState.done) {
        return GetBuilder<BaseLayoutLogic>(
          id: BaseLayoutLogic.pageId,
          global: false,
          init: logic,
          builder: (_) => ScrollConfiguration(
            behavior: readSetting.showScrollBar.isTrue ? UIConfig.scrollBehaviourWithScrollBarWithMouse : UIConfig.scrollBehaviourWithoutScrollBarWithMouse,
            child: buildBody(context),
          ),
        );
      }

      return Center(child: Container(color: UIConfig.readPageBackGroundColor));
    });
  }

  Widget buildBody(BuildContext context);

  /// online mode: parsing and loading automatically while scrolling
  Widget buildItemInOnlineMode(BuildContext context, int index) {
    return GetBuilder<ReadPageLogic>(
      id: '${readPageLogic.onlineImageId}::$index',
      builder: (_) {
        /// step 1: parse image href if needed. check if thumbnail's info exists, if not, [parse] one page of thumbnails to get image hrefs.
        if (readPageState.thumbnails[index] == null) {
          if (readPageState.parseImageHrefsStates[index] == LoadingState.idle) {
            readPageLogic.beginToParseImageHref(index);
          }
          return _buildParsingHrefsIndicator(context, index);
        }

        /// step 2: parse image url.
        if (readPageState.images[index] == null) {
          if (readPageState.parseImageUrlStates[index] == LoadingState.idle) {
            readPageLogic.beginToParseImageUrl(index, false);
          }
          return _buildParsingUrlIndicator(context, index);
        }

        /// step 3: use url to load image
        return _buildOnlineImage(context, index);
      },
    );
  }

  /// wait for [readPageLogic] to parse image href in online mode
  Widget _buildParsingHrefsIndicator(BuildContext context, int index) {
    Size placeHolderSize = logic.getPlaceHolderSize(index);

    return GestureDetector(
      onTap: () => readPageLogic.beginToParseImageHref(index),
      child: SizedBox(
        height: placeHolderSize.height,
        width: placeHolderSize.width,
        child: GetBuilder<ReadPageLogic>(
          id: '${readPageLogic.parseImageHrefsStateId}::$index',
          builder: (_) => Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              LoadingStateIndicator(
                loadingState: readPageState.parseImageHrefsStates[index],
                idleWidgetBuilder: () => const CircularProgressIndicator(),
                errorWidgetBuilder: () => const Icon(Icons.warning, color: UIConfig.readPageWarningButtonColor),
              ),
              Text(
                readPageState.parseImageHrefsStates[index] == LoadingState.error ? readPageState.parseImageHrefErrorMsg! : 'parsingPage'.tr,
              ).marginOnly(top: 8),
              Text((index + 1).toString()).marginOnly(top: 4),
            ],
          ),
        ),
      ),
    );
  }

  /// wait for [readPageLogic] to parse image url in online mode
  Widget _buildParsingUrlIndicator(BuildContext context, int index) {
    Size placeHolderSize = logic.getPlaceHolderSize(index);

    return GestureDetector(
      onTap: () => readPageLogic.beginToParseImageUrl(index, true),
      child: SizedBox(
        height: placeHolderSize.height,
        width: placeHolderSize.width,
        child: GetBuilder<ReadPageLogic>(
          id: '${readPageLogic.parseImageUrlStateId}::$index',
          builder: (_) => Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              LoadingStateIndicator(
                loadingState: readPageState.parseImageUrlStates[index],
                idleWidgetBuilder: () => const CircularProgressIndicator(),
                errorWidgetBuilder: () => const Icon(Icons.warning, color: UIConfig.readPageWarningButtonColor),
              ),
              Text(
                readPageState.parseImageUrlStates[index] == LoadingState.error ? readPageState.parseImageUrlErrorMsg[index]! : 'parsingURL'.tr,
              ).marginOnly(top: 8),
              Text((index + 1).toString()).marginOnly(top: 4),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOnlineImage(BuildContext context, int index) {
    final double w = logic.readPageState.imageContainerSizes[index]?.width ?? logic.getPlaceHolderSize(index).width;
    final double h = logic.readPageState.imageContainerSizes[index]?.height ?? logic.getPlaceHolderSize(index).height;

    return GestureDetector(
      onLongPressStart: (details) => logic.showOnlineImageContextMenu(index, context, position: details.globalPosition),
      onSecondaryTapDown: (details) => logic.showOnlineImageContextMenu(index, context, position: details.globalPosition),
      child: Stack(
        alignment: Alignment.center,
        children: [
          EHImage(
            galleryImage: readPageState.images[index]!,
            containerWidth: w,
            containerHeight: h,
            clearMemoryCacheWhenDispose: true,
            loadingProgressWidgetBuilder: (double progress) => _loadingProgressWidgetBuilder(index, progress),
            failedWidgetBuilder: (ExtendedImageState state) => _failedWidgetBuilder(index, state),
            completedWidgetBuilder: (state) => completedWidgetBuilderCallBack(index, state),
            animateOnlyWhenVisible: true,
            maxBytes: readSetting.enableMaxImageKilobyte.isTrue ? readSetting.maxImageKilobyte.toInt() * 1024 : null,
          ),
          _buildTranslationOverlay(context, index, w, h),
        ],
      ),
    );
  }

  /// 翻訳オーバーレイウィジェット（オンライン／ローカル共通）
  Widget _buildTranslationOverlay(BuildContext context, int index, double w, double h) {
    return Obx(() {
      if (!visualTranslationService.isTranslationEnabled.value) {
        return const SizedBox.shrink();
      }
      final String pageKey = '${readPageState.readPageInfo.gid ?? 0}_$index';
      final annotations = visualTranslationService.getAnnotationsForPage(pageKey);
      final bool isTranslating = visualTranslationService.isPageTranslating(pageKey);
      final bool hasProcessed = visualTranslationService.hasPageBeenProcessed(pageKey);

      // まだ処理されておらず、現在翻訳中でもない場合のみ自動トリガー
      if (!hasProcessed && !isTranslating) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _triggerTranslationForIndex(index);
        });
      }

      return SizedBox(
        width: w,
        height: h,
        child: Stack(
          children: [
            TranslationOverlayWidget(
              annotations: annotations,
              imageWidth: w,
              imageHeight: h,
              onAnnotationTap: (ann) {
                showDialog(
                  context: context,
                  builder: (ctx) => BubbleEditDialog(
                    annotation: ann,
                    onSave: (updated) {
                      visualTranslationService.updateAnnotation(pageKey, updated);
                    },
                  ),
                );
              },
            ),
            if (isTranslating)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.75),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.tealAccent.withOpacity(0.8), width: 1.2),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 4, offset: const Offset(0, 2)),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.tealAccent),
                      ),
                      SizedBox(width: 6),
                      Text(
                        '翻訳中...',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          decoration: TextDecoration.none,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      );
    });
  }

  /// ページの画像バイト列を取得して OCR ＆ 翻訳処理をキック
  Future<void> _triggerTranslationForIndex(int index) async {
    if (!visualTranslationService.isTranslationEnabled.value) return;
    if (index >= readPageState.images.length || readPageState.images[index] == null) return;

    final String pageKey = '${readPageState.readPageInfo.gid ?? 0}_$index';
    if (visualTranslationService.isPageTranslating(pageKey)) return;
    if (visualTranslationService.hasPageBeenProcessed(pageKey)) return;

    Uint8List? imageBytes;
    final galleryImg = readPageState.images[index]!;

    try {
      if (galleryImg.path != null) {
        final filePath = DownloadPathResolver.computeImageDownloadAbsolutePathFromRelativePath(galleryImg.path!);
        final file = io.File(filePath);
        if (await file.exists()) {
          imageBytes = await file.readAsBytes();
        }
      } else if (galleryImg.url.isNotEmpty) {
        imageBytes = await getNetworkImageData(galleryImg.url);
      }

      if (imageBytes != null && imageBytes.isNotEmpty) {
        final double? w = logic.readPageState.imageContainerSizes[index]?.width;
        final double? h = logic.readPageState.imageContainerSizes[index]?.height;
        await visualTranslationService.getOrTranslatePage(
          pageKey: pageKey,
          imageBytes: imageBytes,
          imageWidth: w?.toInt(),
          imageHeight: h?.toInt(),
        );
      }
    } catch (e) {
      log.error('[BaseLayout] Failed to trigger translation for page $index: $e');
    }
  }

  /// loading for online mode
  Widget _loadingProgressWidgetBuilder(int index, double progress) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        CircularProgressIndicator(value: progress),
        Text('loading'.tr).marginOnly(top: 8),
        Text((index + 1).toString()).marginOnly(top: 4),
      ],
    );
  }

  /// failed for online mode
  Widget _failedWidgetBuilder(int index, ExtendedImageState state) {
    log.warning('online image widget build failed', state.lastException);

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        IconTextButton(
          icon: const Icon(Icons.error, color: UIConfig.readPageButtonColor),
          text: Text('networkError'.tr, style: const TextStyle(color: UIConfig.readPageButtonColor)),
          onPressed: () => logic.readPageLogic.reloadImage(index),
        ),
        Text((index + 1).toString()),
      ],
    );
  }

  /// completed for online mode
  Widget? completedWidgetBuilderCallBack(int index, ExtendedImageState state) {
    if (state.extendedImageInfo == null || logic.readPageState.imageContainerSizes[index] != null) {
      return null;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (state.extendedImageInfo == null || logic.readPageState.imageContainerSizes[index] != null) {
        return;
      }
      FittedSizes fittedSizes = logic.getImageFittedSize(
        Size(state.extendedImageInfo!.image.width.toDouble(), state.extendedImageInfo!.image.height.toDouble()),
      );
      logic.readPageState.imageContainerSizes[index] = fittedSizes.destination;
      logic.readPageLogic.updateSafely(['${readPageLogic.onlineImageId}::$index']);
    });

    return null;
  }

  /// local mode: wait for download service to parse and download
  Widget buildItemInLocalMode(BuildContext context, int index) {
    return GetBuilder<GalleryDownloadService>(
      id: '${galleryDownloadService.downloadImageId}::${readPageState.readPageInfo.gid}::$index',
      builder: (_) {
        /// step 1: wait for parsing image's href for this image. But if image's url has been parsed,
        /// we don't need to wait parsing thumbnail.
        if (readPageState.thumbnails[index] == null && readPageState.images[index] == null) {
          return _buildWaitParsingHrefsIndicator(context, index);
        }

        /// step 2: wait for parsing image's url.
        if (readPageState.images[index] == null) {
          return _buildWaitParsingUrlIndicator(context, index);
        }

        /// step 3: check if we are using super resolution
        if (logic.readPageState.useSuperResolution) {
          return _buildLocalSuperResolutionImage(context, index);
        }

        /// step 4: wait for downloading or display it
        return _buildLocalImage(context, index);
      },
    );
  }

  Widget _buildLocalSuperResolutionImage(BuildContext context, int index) {
    return GetBuilder<SuperResolutionService>(
      id: '${SuperResolutionService.superResolutionImageId}::${readPageState.readPageInfo.gid!}::$index',
      builder: (_) {
        int gid = readPageState.readPageInfo.gid!;
        SuperResolutionType type = readPageState.readPageInfo.mode == ReadMode.downloaded ? SuperResolutionType.gallery : SuperResolutionType.archive;
        if (superResolutionService.get(gid, type)?.imageStatuses[index] != SuperResolutionStatus.success) {
          return _buildLocalImage(context, index);
        }

        final double w = logic.readPageState.imageContainerSizes[index]?.width ?? logic.getPlaceHolderSize(index).width;
        final double h = logic.readPageState.imageContainerSizes[index]?.height ?? logic.getPlaceHolderSize(index).height;

        return GestureDetector(
          onLongPressStart: (details) => logic.showLocalImageContextMenu(index, context, position: details.globalPosition),
          onSecondaryTapDown: (details) => logic.showLocalImageContextMenu(index, context, position: details.globalPosition),
          child: Stack(
            alignment: Alignment.center,
            children: [
              EHImage(
                galleryImage: readPageState.images[index]!.copyWith(
                  path: superResolutionService.computeImageOutputRelativePath(readPageState.images[index]!.path!),
                ),
                containerWidth: w,
                containerHeight: h,
                clearMemoryCacheWhenDispose: true,
                loadingWidgetBuilder: () => _loadingWidgetBuilder(context, index),
                failedWidgetBuilder: (state) => _failedWidgetBuilderForLocalMode(index, state),
                completedWidgetBuilder: (state) => completedWidgetBuilderForLocalModeCallBack(index, state),
                animateOnlyWhenVisible: true,
                maxBytes: readSetting.enableMaxImageKilobyte.isTrue ? readSetting.maxImageKilobyte.toInt() * 1024 : null,
              ),
              _buildTranslationOverlay(context, index, w, h),
            ],
          ),
        );
      },
    );
  }

  /// wait for [GalleryDownloadService] to parse image href in local mode
  Widget _buildWaitParsingHrefsIndicator(BuildContext context, int index) {
    DownloadStatus downloadStatus = galleryDownloadService.galleryDownloadInfos[readPageState.readPageInfo.gid]!.downloadProgress.downloadStatus;
    Size placeHolderSize = logic.getPlaceHolderSize(index);

    return SizedBox(
      height: placeHolderSize.height,
      width: placeHolderSize.width,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (downloadStatus == DownloadStatus.downloading) const CircularProgressIndicator(),
          if (downloadStatus == DownloadStatus.paused) const Icon(Icons.pause_circle_outline, color: UIConfig.readPageButtonColor),
          Text(downloadStatus == DownloadStatus.downloading ? 'parsingPage'.tr : 'paused'.tr).marginOnly(top: 8),
          Text((index + 1).toString()).marginOnly(top: 4),
        ],
      ),
    );
  }

  /// wait for [GalleryDownloadService] to parse image url in local mode
  Widget _buildWaitParsingUrlIndicator(BuildContext context, int index) {
    DownloadStatus downloadStatus = galleryDownloadService.galleryDownloadInfos[readPageState.readPageInfo.gid]!.downloadProgress.downloadStatus;
    Size placeHolderSize = logic.getPlaceHolderSize(index);
    return SizedBox(
      height: placeHolderSize.height,
      width: placeHolderSize.width,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (downloadStatus == DownloadStatus.downloading) const CircularProgressIndicator(),
          if (downloadStatus == DownloadStatus.paused) const Icon(Icons.pause_circle_outline, color: UIConfig.readPageButtonColor),
          Text(downloadStatus == DownloadStatus.downloading ? 'parsingURL'.tr : 'paused'.tr).marginOnly(top: 8),
          Text((index + 1).toString()).marginOnly(top: 4),
        ],
      ),
    );
  }

  Widget _buildLocalImage(BuildContext context, int index) {
    final double w = logic.readPageState.imageContainerSizes[index]?.width ?? logic.getPlaceHolderSize(index).width;
    final double h = logic.readPageState.imageContainerSizes[index]?.height ?? logic.getPlaceHolderSize(index).height;

    return GestureDetector(
      onLongPressStart: (details) => logic.showLocalImageContextMenu(index, context, position: details.globalPosition),
      onSecondaryTapDown: (details) => logic.showLocalImageContextMenu(index, context, position: details.globalPosition),
      child: Stack(
        alignment: Alignment.center,
        children: [
          EHImage(
            galleryImage: readPageState.images[index]!,
            containerWidth: w,
            containerHeight: h,
            clearMemoryCacheWhenDispose: true,
            downloadingWidgetBuilder: () => _downloadingWidgetBuilder(index),
            pausedWidgetBuilder: () => _pausedWidgetBuilder(index),
            loadingWidgetBuilder: () => _loadingWidgetBuilder(context, index),
            failedWidgetBuilder: (state) => _failedWidgetBuilderForLocalMode(index, state),
            completedWidgetBuilder: (state) => completedWidgetBuilderForLocalModeCallBack(index, state),
            animateOnlyWhenVisible: true,
            maxBytes: readSetting.enableMaxImageKilobyte.isTrue ? readSetting.maxImageKilobyte.toInt() * 1024 : null,
          ),
          _buildTranslationOverlay(context, index, w, h),
        ],
      ),
    );
  }

  /// downloading for local mode
  Widget _downloadingWidgetBuilder(int index) {
    return GetBuilder<GalleryDownloadService>(
      id: '${galleryDownloadService.galleryDownloadSpeedComputerId}::${readPageState.readPageInfo.gid}',
      builder: (_) {
        GalleryDownloadSpeedComputer speedComputer = galleryDownloadService.galleryDownloadInfos[readPageState.readPageInfo.gid]!.speedComputer;
        int downloadedBytes = speedComputer.imageDownloadedBytes[index];
        int totalBytes = speedComputer.imageTotalBytes[index];

        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(value: max(downloadedBytes / totalBytes, 0.01)),
            Text('downloading'.tr).marginOnly(top: 8),
            Text((index + 1).toString()),
          ],
        );
      },
    );
  }

  /// paused for local mode
  Widget _pausedWidgetBuilder(int index) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.pause_circle_outline, color: UIConfig.readPageButtonColor),
        Text('paused'.tr).marginOnly(top: 8),
        Text((index + 1).toString()),
      ],
    );
  }

  /// loading for local mode
  Widget _loadingWidgetBuilder(BuildContext context, int index) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        UIConfig.loadingAnimation(context),
        Text((index + 1).toString()),
      ],
    );
  }

  /// failed for local mode
  Widget _failedWidgetBuilderForLocalMode(int index, ExtendedImageState state) {
    log.warning('local image widget build failed', state.lastException);

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        IconTextButton(
          icon: const Icon(Icons.sentiment_very_dissatisfied),
          text: Text('error'.tr, style: const TextStyle(color: UIConfig.readPageButtonColor)),
          onPressed: state.reLoadImage,
        ),
        Text((index + 1).toString()),
      ],
    );
  }

  /// completed for local mode
  Widget? completedWidgetBuilderForLocalModeCallBack(int index, ExtendedImageState state) {
    if (state.extendedImageInfo == null || logic.readPageState.imageContainerSizes[index] != null) {
      return null;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (state.extendedImageInfo == null || logic.readPageState.imageContainerSizes[index] != null) {
        return;
      }
      FittedSizes fittedSizes = logic.getImageFittedSize(
        Size(state.extendedImageInfo!.image.width.toDouble(), state.extendedImageInfo!.image.height.toDouble()),
      );
      logic.readPageState.imageContainerSizes[index] = fittedSizes.destination;
      galleryDownloadService.updateSafely(['${galleryDownloadService.downloadImageId}::${readPageState.readPageInfo.gid}::$index']);
    });

    return null;
  }
}

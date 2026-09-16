import 'package:flutter/cupertino.dart';
import 'package:jhentai/src/database/database.dart';
import 'package:jhentai/src/enum/eh_namespace.dart';
import 'package:jhentai/src/setting/preference_setting.dart';

enum EHTagStatus { confidence, skepticism, incorrect }

enum EHTagVoteStatus { none, up, down }

class GalleryTag {
  Color? color;
  Color? backgroundColor;
  TagData tagData;
  EHTagStatus? tagStatus;
  EHTagVoteStatus? voteStatus;

  String? japaneseTagName;
  String? chineseTagName;
  String? tagLanguageOverride;

  GalleryTag({
    this.color,
    this.backgroundColor,
    required this.tagData,
    this.tagStatus,
    this.voteStatus,
    this.japaneseTagName,
    this.chineseTagName,
    this.tagLanguageOverride,
  });

  String get displayTagName {
    final mode = tagLanguageOverride ?? preferenceSetting.tagDisplayLanguage.value;
    if (mode == 'raw') {
      return tagData.key;
    }
    if (mode == 'zh') {
      return chineseTagName ?? tagData.tagName ?? tagData.key;
    }
    return japaneseTagName ?? tagData.tagName ?? tagData.key;
  }

  String get displayNamespace {
    final mode = tagLanguageOverride ?? preferenceSetting.tagDisplayLanguage.value;
    final ns = EHNamespace.findNameSpaceFromDescOrAbbr(tagData.namespace);
    if (mode == 'raw') {
      return tagData.namespace;
    }
    if (mode == 'zh') {
      return ns?.chineseDesc ?? tagData.namespace;
    }
    return ns?.japaneseDesc ?? tagData.namespace;
  }

  Map<String, dynamic> toJson() {
    return {
      'color': color?.value,
      'backgroundColor': backgroundColor?.value,
      'tagData': tagData.toJson()..removeWhere((key, value) => value == null),
      'tagStatus': tagStatus?.index,
      'voteStatus': voteStatus?.index,
      'japaneseTagName': japaneseTagName,
      'chineseTagName': chineseTagName,
      'tagLanguageOverride': tagLanguageOverride,
    }..removeWhere((key, value) => value == null);
  }

  factory GalleryTag.fromJson(Map<String, dynamic> map) {
    return GalleryTag(
      color: map['color'] == null ? null : Color(map['color']),
      backgroundColor: map['backgroundColor'] == null ? null : Color(map['backgroundColor']),
      tagData: TagData.fromJson(map['tagData']),
      tagStatus: map['tagStatus'] == null ? null : EHTagStatus.values[map['tagStatus']],
      voteStatus: EHTagVoteStatus.values[map['voteStatus'] ?? EHTagVoteStatus.none.index],
      japaneseTagName: map['japaneseTagName'],
      chineseTagName: map['chineseTagName'],
      tagLanguageOverride: map['tagLanguageOverride'],
    );
  }

  @override
  String toString() {
    return 'GalleryTag{color: $color, backgroundColor: $backgroundColor, tagData: $tagData, tagStatus: $tagStatus, voteStatus: $voteStatus, japaneseTagName: $japaneseTagName, chineseTagName: $chineseTagName, tagLanguageOverride: $tagLanguageOverride}';
  }

  GalleryTag copyWith({
    Color? color,
    Color? backgroundColor,
    TagData? tagData,
    EHTagStatus? tagStatus,
    EHTagVoteStatus? voteStatus,
    String? japaneseTagName,
    String? chineseTagName,
    String? tagLanguageOverride,
  }) {
    return GalleryTag(
      color: color ?? this.color,
      backgroundColor: backgroundColor ?? this.backgroundColor,
      tagData: tagData ?? this.tagData,
      tagStatus: tagStatus ?? this.tagStatus,
      voteStatus: voteStatus ?? this.voteStatus,
      japaneseTagName: japaneseTagName ?? this.japaneseTagName,
      chineseTagName: chineseTagName ?? this.chineseTagName,
      tagLanguageOverride: tagLanguageOverride ?? this.tagLanguageOverride,
    );
  }
}

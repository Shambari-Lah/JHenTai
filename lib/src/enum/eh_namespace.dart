import 'package:get/get.dart';
import 'package:jhentai/src/setting/preference_setting.dart';

enum EHNamespace {
  rows('rows', null, '分类', 'カテゴリー'),
  language('language', 'l', '语言', '言語'),
  artist('artist', 'a', '作者', '絵師・作者'),
  character('character', 'c', '角色', 'キャラクター'),
  female('female', 'f', '女性', '女性'),
  male('male', 'm', '男性', '男性'),
  parody('parody', 'p', '原作', '原作'),
  group('group', 'g', '团队', 'サークル・団体'),
  mixed('mixed', 'x', '混合', '混合'),
  cosplayer('cosplayer', 'cos', '角色扮演者', 'コスプレイヤー'),
  reclass('reclass', 'r', '重新分类', '再分類'),
  temp('temp', null, '临时', '一時的'),
  other('other', 'o', '其他', 'その他'),
  location('location', 'loc', '地点', '場所'),
  ;

  const EHNamespace(this.desc, this.abbr, this.chineseDesc, this.japaneseDesc);

  final String desc;

  final String? abbr;

  final String? chineseDesc;

  final String? japaneseDesc;

  String get localizedDesc {
    final String tagLang = preferenceSetting.tagDisplayLanguage.value;
    if (tagLang == 'zh') {
      return chineseDesc ?? desc;
    } else if (tagLang == 'raw') {
      return desc;
    } else if (tagLang == 'ja') {
      return japaneseDesc ?? desc;
    }
    final lang = Get.locale?.languageCode;
    if (lang == 'ja') {
      return japaneseDesc ?? desc;
    }
    if (lang == 'zh') {
      return chineseDesc ?? desc;
    }
    return desc;
  }

  static EHNamespace? findNameSpaceFromDescOrAbbr(String? desc) {
    if (desc == null) {
      return null;
    }
    
    for (final EHNamespace ns in values) {
      if (ns.desc == desc || ns.abbr == desc) {
        return ns;
      }
    }
    return null;
  }
}

import 'package:flutter_test/flutter_test.dart';
import 'package:jhentai/src/database/database.dart';
import 'package:jhentai/src/enum/eh_namespace.dart';
import 'package:jhentai/src/model/gallery_tag.dart';
import 'package:jhentai/src/service/japanese_tag_dictionary.dart';
import 'package:jhentai/src/setting/preference_setting.dart';

void main() {
  group('JapaneseTagDictionary Tests', () {
    test('Translates English raw tags accurately to natural Japanese', () {
      expect(JapaneseTagDictionary.translate('female', 'big breasts'), '巨乳');
      expect(JapaneseTagDictionary.translate('female', 'maid'), 'メイド');
      expect(JapaneseTagDictionary.translate('female', 'schoolgirl uniform'), '学生服・セーラー服');
      expect(JapaneseTagDictionary.translate('female', 'catgirl'), '猫耳・猫娘');
      expect(JapaneseTagDictionary.translate('female', 'sole female'), '単体女性');
      expect(JapaneseTagDictionary.translate('male', 'sole male'), '単体男性');
      expect(JapaneseTagDictionary.translate('male', 'dilf'), 'おじさん');
      expect(JapaneseTagDictionary.translate('other', 'full color'), 'フルカラー');
      expect(JapaneseTagDictionary.translate('other', 'tankoubon'), '単行本');
      expect(JapaneseTagDictionary.translate('rows', 'doujinshi'), '同人誌');
      expect(JapaneseTagDictionary.translate('rows', 'manga'), '漫画');
      expect(JapaneseTagDictionary.translate('parody', 'original'), 'オリジナル');
      expect(JapaneseTagDictionary.translate('parody', 'genshin impact'), '原神');
      expect(JapaneseTagDictionary.translate('parody', 'blue archive'), 'ブルーアーカイブ');
      expect(JapaneseTagDictionary.translate('location', 'school'), '学校');
    });

    test('Compound rules translate multi-word tags gracefully', () {
      expect(JapaneseTagDictionary.translate('female', 'sole elf'), '単体エルフ');
      expect(JapaneseTagDictionary.translate('female', 'dark elf'), 'ダークエルフ');
    });
  });

  group('EHNamespace Localized Descriptions', () {
    test('Provides Japanese translations for all namespaces', () {
      expect(EHNamespace.rows.japaneseDesc, 'カテゴリー');
      expect(EHNamespace.female.japaneseDesc, '女性');
      expect(EHNamespace.male.japaneseDesc, '男性');
      expect(EHNamespace.artist.japaneseDesc, '絵師・作者');
      expect(EHNamespace.group.japaneseDesc, 'サークル・団体');
      expect(EHNamespace.character.japaneseDesc, 'キャラクター');
      expect(EHNamespace.parody.japaneseDesc, '原作');
      expect(EHNamespace.language.japaneseDesc, '言語');
      expect(EHNamespace.other.japaneseDesc, 'その他');
    });
  });

  group('Dynamic Tag Display Language', () {
    test('GalleryTag displays correct language based on override or preference', () {
      preferenceSetting.tagDisplayLanguage.value = 'ja';

      final tag = GalleryTag(
        tagData: TagData(
          namespace: 'female',
          key: 'maid',
          tagName: 'メイド',
        ),
        japaneseTagName: 'メイド',
        chineseTagName: '女仆',
      );

      expect(tag.displayTagName, 'メイド');

      tag.tagLanguageOverride = 'zh';
      expect(tag.displayTagName, '女仆');

      tag.tagLanguageOverride = 'raw';
      expect(tag.displayTagName, 'maid');

      tag.tagLanguageOverride = null;
      preferenceSetting.tagDisplayLanguage.value = 'zh';
      expect(tag.displayTagName, '女仆');

      preferenceSetting.tagDisplayLanguage.value = 'raw';
      expect(tag.displayTagName, 'maid');
    });
  });
}

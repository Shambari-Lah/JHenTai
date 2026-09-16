/// 漫画・絵物語の擬音（オノマトペ）・効果音辞書および自動変換エンジン
class OnomatopoeiaDictionary {
  static final Map<String, String> _dictionary = {
    // 心理・感情 (Heartbeat, Nervousness, Emotion)
    'ドキドキ': '*Thump-thump*',
    'どきどき': '*Thump-thump*',
    'バクバク': '*Heart pounding*',
    'ばくばく': '*Heart pounding*',
    'キュン': '*Heart squeeze*',
    'きゅん': '*Heart squeeze*',
    'ゾクッ': '*Shivers*',
    'ぞくっ': '*Shivers*',
    'ビクッ': '*Jolt!*',
    'びくっ': '*Jolt!*',
    'ピクッ': '*Twitch*',
    'びく': '*Flinch*',
    'ハッ': '*Gasp!*',
    'はっ': '*Gasp!*',
    'ホッ': '*Sigh of relief*',
    'ほっ': '*Sigh of relief*',
    'イライラ': '*Irritated*',
    'いらいら': '*Irritated*',
    'ムカッ': '*Pissed off*',
    'むかっ': '*Pissed off*',
    'ウキウキ': '*Excited*',
    'うきうき': '*Excited*',
    'ワクワク': '*Thrilled*',
    'わくわく': '*Thrilled*',

    // 雰囲気・気配 (Atmosphere, Presence)
    'ゴゴゴ': '*MENACING...*',
    'ごごご': '*MENACING...*',
    'ドドド': '*RUMBLE...*',
    'どどど': '*RUMBLE...*',
    'ざわざわ': '*Murmur / Unease*',
    'ザワザワ': '*Murmur / Unease*',
    'シーン': '*Awkward silence*',
    'しーん': '*Awkward silence*',
    'チラッ': '*Glance*',
    'ちらっ': '*Glance*',
    'ジロジロ': '*Staring intently*',
    'じろじろ': '*Staring intently*',
    'ジーッ': '*Stare...*',
    'じーっ': '*Stare...*',
    'モジモジ': '*Fidgeting nervously*',
    'もじもじ': '*Fidgeting nervously*',

    // 衝撃・打撃・爆発 (Impact, Hit, Explosion)
    'ドン': '*BOOM!*',
    'どん': '*Thud!*',
    'ドーン': '*KABOOM!*',
    'どーん': '*KABOOM!*',
    'ドカン': '*BANG!*',
    'どかん': '*BANG!*',
    'ドカーン': '*KABOOM!*',
    'ばーん': '*BAM!*',
    'バーン': '*BAM!*',
    'バシッ': '*SMACK!*',
    'ばしっ': '*SMACK!*',
    'バキッ': '*CRACK!*',
    'ばきっ': '*CRACK!*',
    'ボコッ': '*WHACK!*',
    'ぼこっ': '*WHACK!*',
    'ガシャーン': '*CRASH!*',
    'がしゃーん': '*CRASH!*',
    'ガタッ': '*Clatter!*',
    'がたっ': '*Clatter!*',
    'ズシン': '*Heavy THUD*',
    'ずしん': '*Heavy THUD*',
    'バタン': '*SLAM!*',
    'ばたん': '*SLAM!*',

    // 動作・移動 (Movement, Motion)
    'スタスタ': '*Striding briskly*',
    'すたすた': '*Striding briskly*',
    'トコトコ': '*Trotting along*',
    'とことこ': '*Trotting along*',
    'サッ': '*Swiftly*',
    'さっ': '*Swiftly*',
    'シュッ': '*Whoosh*',
    'しゅっ': '*Whoosh*',
    'スッ': '*Smoothly*',
    'すっ': '*Smoothly*',
    'パッ': '*Suddenly*',
    'ぱっ': '*Suddenly*',
    'ピタッ': '*Freeze!*',
    'ぴたっ': '*Freeze!*',
    'クルッ': '*Spin / Turn*',
    'くるっ': '*Spin / Turn*',
    'フラフラ': '*Wobbling*',
    'ふらふら': '*Wobbling*',
    'ヨロヨロ': '*Staggering*',
    'よろよろ': '*Staggering*',

    // 表情・声 (Expressions, Voice, Laughter)
    'ニコニコ': '*Beaming smile*',
    'にこにこ': '*Beaming smile*',
    'ニヤニヤ': '*Smirk*',
    'にやり': '*Grin*',
    'ニヤリ': '*Grin*',
    'クスッ': '*Chuckle*',
    'くすっ': '*Chuckle*',
    'ゲラゲラ': '*Roaring laughter*',
    'ぎゃー': '*SCREAM!*',
    'ギャー': '*SCREAM!*',
    'キャー': '*Eek!*',
    'きゃー': '*Eek!*',
    'ウルウル': '*Teary-eyed*',
    'うるうる': '*Teary-eyed*',
    'シクシク': '*Sobbing*',
    'しくしく': '*Sobbing*',

    // 環境音・自然 (Nature, Ambient)
    'ザーザー': '*Pouring rain*',
    'ざーざー': '*Pouring rain*',
    'ポツポツ': '*Drizzle*',
    'ぽつぽつ': '*Drizzle*',
    'ゴロゴロ': '*Thunder rumbling*',
    'ごろごろ': '*Thunder rumbling*',
    'ビュー': '*Howling wind*',
    'びゅー': '*Howling wind*',
    'パチパチ': '*Crackling fire*',
    'ぱちぱち': '*Crackling fire*',
  };

  /// テキストがオノマトペ（擬音）かどうか判定
  static bool isOnomatopoeia(String text) {
    final cleaned = _cleanText(text);
    if (_dictionary.containsKey(cleaned)) return true;
    for (final key in _dictionary.keys) {
      if (cleaned.contains(key)) return true;
    }
    return false;
  }

  /// オノマトペを英語等の効果音表現に自動変換
  static String? translate(String text) {
    final cleaned = _cleanText(text);
    if (_dictionary.containsKey(cleaned)) {
      return _dictionary[cleaned];
    }
    for (final entry in _dictionary.entries) {
      if (cleaned.contains(entry.key)) {
        return entry.value;
      }
    }
    return null;
  }

  /// 句読点、感嘆符、長音符「ー」「〜」「…」の正規化
  static String _cleanText(String input) {
    return input
        .replaceAll(RegExp(r'[!！?？…・〜~]+'), '')
        .replaceAll('ッ', '')
        .replaceAll('っ', '')
        .replaceAll('ー', '')
        .trim();
  }
}

export interface VisualStorySample {
  id: string;
  title: string;
  language: string;
  description: string;
  pages: {
    pageNumber: number;
    title: string;
    imageUrl: string;
    initialRegions?: {
      x: number;
      y: number;
      width: number;
      height: number;
      originalText: string;
      translatedText?: string;
      direction?: 'horizontal' | 'vertical';
    }[];
  }[];
}

// 桃太郎風の日本昔話スライド（日本語・横書き/縦書き混在、吹き出し付きSVG画像）
const momotaroPage1Svg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fdfbf7"/>
      <stop offset="100%" stop-color="#ebedee"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.15"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  
  <!-- 川と山の風景イラスト -->
  <path d="M 0 350 Q 200 280, 400 340 T 800 320 L 800 600 L 0 600 Z" fill="#bfe3b4" opacity="0.6"/>
  <path d="M 0 420 Q 250 380, 500 450 T 800 410 L 800 600 L 0 600 Z" fill="#88c599" opacity="0.5"/>
  <path d="M 100 450 Q 300 460, 450 510 T 800 490 L 800 600 L 0 600 Z" fill="#58a673" opacity="0.4"/>
  <!-- 川 -->
  <path d="M 0 490 C 200 470, 350 530, 800 520 L 800 600 L 0 600 Z" fill="#68b0d8" opacity="0.7"/>
  
  <!-- 桃 -->
  <g transform="translate(420, 430) scale(1.1)">
    <path d="M 50 10 C 20 -20, -20 20, 10 60 C 30 85, 70 85, 90 60 C 120 20, 80 -20, 50 10 Z" fill="#ff758f"/>
    <path d="M 50 10 C 35 30, 40 50, 50 75" stroke="#e05774" stroke-width="3" fill="none"/>
    <ellipse cx="38" cy="18" rx="8" ry="4" fill="#6ba368" transform="rotate(-30 38 18)"/>
  </g>

  <!-- タイトルバナー -->
  <rect x="40" y="30" width="300" height="50" rx="10" fill="#e76f51" filter="url(#shadow)"/>
  <text x="190" y="63" font-family="sans-serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">昔話：桃太郎 第１話</text>

  <!-- おばあさんの吹き出し -->
  <g filter="url(#shadow)">
    <path d="M 80 120 Q 80 100, 100 100 L 360 100 Q 380 100, 380 120 L 380 220 Q 380 240, 360 240 L 220 240 L 190 270 L 190 240 L 100 240 Q 80 240, 80 220 Z" fill="#ffffff" stroke="#333333" stroke-width="3"/>
    <text x="105" y="145" font-family="'Hiragino Sans', 'Meiryo', sans-serif" font-size="20" font-weight="bold" fill="#222222">むかしむかし、あるところに</text>
    <text x="105" y="180" font-family="'Hiragino Sans', 'Meiryo', sans-serif" font-size="20" font-weight="bold" fill="#222222">おじいさんとおばあさんが</text>
    <text x="105" y="215" font-family="'Hiragino Sans', 'Meiryo', sans-serif" font-size="20" font-weight="bold" fill="#222222">住んでいました。</text>
  </g>

  <!-- 桃発見の吹き出し -->
  <g filter="url(#shadow)">
    <path d="M 460 200 Q 460 180, 480 180 L 730 180 Q 750 180, 750 200 L 750 300 Q 750 320, 730 320 L 600 320 L 570 350 L 570 320 L 480 320 Q 460 320, 460 300 Z" fill="#ffffff" stroke="#333333" stroke-width="3"/>
    <text x="485" y="225" font-family="'Hiragino Sans', 'Meiryo', sans-serif" font-size="20" font-weight="bold" fill="#222222">川上から大きな桃が、</text>
    <text x="485" y="260" font-family="'Hiragino Sans', 'Meiryo', sans-serif" font-size="22" font-weight="bold" fill="#d90429">どんぶらこ、どんぶらこ</text>
    <text x="485" y="295" font-family="'Hiragino Sans', 'Meiryo', sans-serif" font-size="20" font-weight="bold" fill="#222222">と流れてきました！</text>
  </g>
</svg>
`)}`;

const momotaroPage2Svg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff8f0"/>
      <stop offset="100%" stop-color="#faeedb"/>
    </linearGradient>
    <filter id="shadow2" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.15"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg2)"/>
  
  <!-- タイトルバナー -->
  <rect x="40" y="30" width="300" height="50" rx="10" fill="#e76f51" filter="url(#shadow2)"/>
  <text x="190" y="63" font-family="sans-serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">昔話：桃太郎 第２話</text>

  <!-- 割れた桃と赤ちゃん -->
  <circle cx="400" cy="380" r="120" fill="#f8c8dc" opacity="0.6"/>
  <circle cx="400" cy="350" r="45" fill="#fcd5ce"/>
  <text x="400" y="440" font-family="sans-serif" font-size="16" fill="#666" text-anchor="middle">【元気な赤ちゃん誕生】</text>

  <!-- 吹き出し１ -->
  <g filter="url(#shadow2)">
    <path d="M 60 140 Q 60 120, 80 120 L 370 120 Q 390 120, 390 140 L 390 240 Q 390 260, 370 260 L 260 260 L 230 290 L 230 260 L 80 260 Q 60 260, 60 240 Z" fill="#ffffff" stroke="#333333" stroke-width="3"/>
    <text x="85" y="165" font-family="'Hiragino Sans', 'Meiryo', sans-serif" font-size="20" font-weight="bold" fill="#222222">桃を切ろうとすると、</text>
    <text x="85" y="200" font-family="'Hiragino Sans', 'Meiryo', sans-serif" font-size="20" font-weight="bold" fill="#222222">中から元気な男の子が</text>
    <text x="85" y="235" font-family="'Hiragino Sans', 'Meiryo', sans-serif" font-size="20" font-weight="bold" fill="#222222">飛び出しました！</text>
  </g>

  <!-- 吹き出し２ -->
  <g filter="url(#shadow2)">
    <path d="M 440 130 Q 440 110, 460 110 L 740 110 Q 760 110, 760 130 L 760 250 Q 760 270, 740 270 L 610 270 L 580 300 L 580 270 L 460 270 Q 440 270, 440 250 Z" fill="#ffffff" stroke="#333333" stroke-width="3"/>
    <text x="465" y="155" font-family="'Hiragino Sans', 'Meiryo', sans-serif" font-size="20" font-weight="bold" fill="#222222">「桃から生まれたから、</text>
    <text x="465" y="195" font-family="'Hiragino Sans', 'Meiryo', sans-serif" font-size="24" font-weight="bold" fill="#2b9348">『桃太郎』と名付けよう！」</text>
    <text x="465" y="235" font-family="'Hiragino Sans', 'Meiryo', sans-serif" font-size="19" font-weight="bold" fill="#222222">おじいさんは大喜びです。</text>
  </g>
</svg>
`)}`;

// 英語コミック風サンプル
const adventurePage1Svg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4ea8de"/>
      <stop offset="100%" fill="#90e0ef"/>
    </linearGradient>
    <filter id="comicShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="3" dy="5" stdDeviation="2" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="#fefae0"/>
  
  <!-- コミックフレーム -->
  <rect x="25" y="25" width="750" height="550" fill="#ffffff" stroke="#111111" stroke-width="4"/>
  
  <!-- タイトル -->
  <rect x="50" y="45" width="400" height="45" fill="#f72585"/>
  <text x="70" y="77" font-family="'Impact', 'Arial Black', sans-serif" font-size="28" fill="#ffffff">THE SECRET MAP : PART 1</text>

  <!-- キャラクタースピーチバルーン1 -->
  <g filter="url(#comicShadow)">
    <path d="M 70 140 Q 70 120, 90 120 L 380 120 Q 400 120, 400 140 L 400 240 Q 400 260, 380 260 L 260 260 L 230 300 L 220 260 L 90 260 Q 70 260, 70 240 Z" fill="#ffffff" stroke="#000000" stroke-width="3"/>
    <text x="95" y="160" font-family="'Arial', sans-serif" font-size="20" font-weight="bold" fill="#000000">Look at this ancient map!</text>
    <text x="95" y="195" font-family="'Arial', sans-serif" font-size="19" font-weight="bold" fill="#000000">It points directly to</text>
    <text x="95" y="230" font-family="'Arial', sans-serif" font-size="19" font-weight="bold" fill="#000000">the hidden mountain cave.</text>
  </g>

  <!-- キャラクタースピーチバルーン2 -->
  <g filter="url(#comicShadow)">
    <path d="M 440 180 Q 440 160, 460 160 L 730 160 Q 750 160, 750 180 L 750 280 Q 750 300, 730 300 L 590 300 L 560 340 L 550 300 L 460 300 Q 440 300, 440 280 Z" fill="#fff3b0" stroke="#000000" stroke-width="3"/>
    <text x="465" y="205" font-family="'Arial', sans-serif" font-size="21" font-weight="bold" fill="#000000">Are you sure it's safe?</text>
    <text x="465" y="240" font-family="'Arial', sans-serif" font-size="20" font-weight="bold" fill="#000000">We must prepare our gear</text>
    <text x="465" y="275" font-family="'Arial', sans-serif" font-size="20" font-weight="bold" fill="#000000">before sunset!</text>
  </g>

  <!-- ナレーションボックス -->
  <rect x="180" y="470" width="460" height="75" fill="#ffd166" stroke="#000" stroke-width="3"/>
  <text x="200" y="502" font-family="'Arial', sans-serif" font-size="18" font-style="italic" font-weight="bold" fill="#111">And so, the greatest expedition in history begins...</text>
  <text x="200" y="530" font-family="'Arial', sans-serif" font-size="17" font-style="italic" fill="#333">Destination: The Lost Temple of Solitude.</text>
</svg>
`)}`;

export const SAMPLE_STORIES: VisualStorySample[] = [
  {
    id: 'momotaro-jp',
    title: '日本の昔話: 桃太郎 (Momotaro)',
    language: 'jpn',
    description: '日本の伝統的な民話。川から流れてきた大きな桃と桃太郎の誕生。日本語OCRと翻訳の動作検証に最適です。',
    pages: [
      {
        pageNumber: 1,
        title: '第1話：大きな桃との出会い',
        imageUrl: momotaroPage1Svg,
        initialRegions: [
          {
            x: 80,
            y: 100,
            width: 300,
            height: 140,
            originalText: 'むかしむかし、あるところにおじいさんとおばあさんが住んでいました。',
            translatedText: 'Once upon a time, an old man and an old woman lived in a certain place.',
            direction: 'horizontal'
          },
          {
            x: 460,
            y: 180,
            width: 290,
            height: 140,
            originalText: '川上から大きな桃が、どんぶらこ、どんぶらこと流れてきました！',
            translatedText: 'A giant peach came tumbling and floating down the river!',
            direction: 'horizontal'
          }
        ]
      },
      {
        pageNumber: 2,
        title: '第2話：桃太郎の誕生',
        imageUrl: momotaroPage2Svg,
        initialRegions: [
          {
            x: 60,
            y: 120,
            width: 330,
            height: 140,
            originalText: '桃を切ろうとすると、中から元気な男の子が飛び出しました！',
            translatedText: 'When they tried to cut the peach, an energetic baby boy leaped out from inside!',
            direction: 'horizontal'
          },
          {
            x: 440,
            y: 110,
            width: 320,
            height: 160,
            originalText: '「桃から生まれたから、『桃太郎』と名付けよう！」おじいさんは大喜びです。',
            translatedText: '"Since he was born from a peach, let\'s name him Momotaro!" The old man was overjoyed.',
            direction: 'horizontal'
          }
        ]
      }
    ]
  },
  {
    id: 'adventure-en',
    title: 'English Comic: The Secret Map',
    language: 'eng',
    description: '英語の冒険コミック。スピーチバルーンとナレーションボックスが含まれ、英語から日本語・他言語への翻訳テストに適しています。',
    pages: [
      {
        pageNumber: 1,
        title: 'Part 1: Discovery of the Map',
        imageUrl: adventurePage1Svg,
        initialRegions: [
          {
            x: 70,
            y: 120,
            width: 330,
            height: 140,
            originalText: 'Look at this ancient map! It points directly to the hidden mountain cave.',
            translatedText: 'この古代の地図を見て！隠された山の洞窟を直接指し示しているよ。',
            direction: 'horizontal'
          },
          {
            x: 440,
            y: 160,
            width: 310,
            height: 140,
            originalText: 'Are you sure it\'s safe? We must prepare our gear before sunset!',
            translatedText: '本当に安全なのかい？日没までに装備を整えなきゃ！',
            direction: 'horizontal'
          },
          {
            x: 180,
            y: 470,
            width: 460,
            height: 75,
            originalText: 'And so, the greatest expedition in history begins... Destination: The Lost Temple of Solitude.',
            translatedText: 'こうして、歴史上最大の探検が始まる… 目的地：孤独の失われた神殿。',
            direction: 'horizontal'
          }
        ]
      }
    ]
  }
];

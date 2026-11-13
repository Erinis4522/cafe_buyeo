// 게임 데이터: 인물, 재료, 음료, 대사
// 대사를 고칠 때는 이 파일만 수정하면 된다.

const CHARACTERS = [
  {
    id: 'luka', face: [0.46, 0.44], name: '루카', animal: '여우', tone: 'yo', color: '#e9803a',
    tag: '시장 상인 · 손이 빠른 편',
    intro: [
      '안녕하세요, 점장님! 시장에서 가게를 하는 루카예요.',
      '장사라면 자신 있지만 커피는 처음이에요. 옆에서 보고 금방 배울게요!'
    ],
    order: '안녕! 오늘은 {drink} 한 잔 부탁해요. 장 보다가 목이 말랐거든요.',
    thanks: '와, 예쁘다! 시장 사람들한테도 이 카페 소문내 줄게요.',
    ending: '오늘 배운 거 절대 안 잊을게요. 내일도 잘 부탁해요, 점장님!'
  },
  {
    id: 'bruno', face: [0.5, 0.31], name: '브루노', animal: '곰', tone: 'da', color: '#d99a1e',
    tag: '건설 기술자 · 꼼꼼하고 성실함',
    intro: [
      '안녕하십니까, 점장님! 오늘부터 일하게 된 브루노입니다.',
      '튼튼하게 짓는 건 자신 있습니다. 음료도 순서대로 차근차근 배우겠습니다!'
    ],
    order: '안녕하십니까! {drink} 한 잔 주십시오. 현장 일 끝나고 왔습니다.',
    thanks: '오, 정말 튼튼… 아니, 정말 맛있어 보입니다! 감사합니다!',
    ending: '설계도처럼 레시피를 잘 기억해 두겠습니다. 수고하셨습니다, 점장님!'
  },
  {
    id: 'cain', face: [0.46, 0.45], name: '케인', animal: '늑대', tone: 'da', color: '#3b4a7a',
    tag: '안전 관리관 · 차분하고 정확함',
    intro: [
      '케인입니다. 오늘부터 이 카페에서 일하게 되었습니다.',
      '정해진 순서를 지키는 건 제 특기입니다. 잘 보고 그대로 따르겠습니다.'
    ],
    order: '{drink} 한 잔 부탁합니다. 순찰 중에 잠깐 들렀습니다.',
    thanks: '깔끔하군요. 점검표에 동그라미를 쳐 두겠습니다.',
    ending: '오늘 기록한 내용은 빠짐없이 기억하겠습니다. 수고하셨습니다.'
  },
  {
    id: 'noel', face: [0.52, 0.48], name: '노엘', animal: '사슴', tone: 'yo', color: '#5f8a3a',
    tag: '자연·농업 담당 · 다정하고 느긋함',
    intro: [
      '안녕하세요, 점장님. 숲이랑 농장을 돌보는 노엘이에요.',
      '카페 우유는 우리 마을 농장에서 왔대요. 정성껏 만드는 법을 배우고 싶어요.'
    ],
    order: '안녕하세요. {drink} 한 잔 마시고 싶어요. 오늘 햇살이 참 좋네요.',
    thanks: '어머, 그림까지! 아까워서 못 마시겠어요.',
    ending: '오늘 정말 즐거웠어요. 점장님한테 배운 거 천천히 연습해 볼게요.'
  },
  {
    id: 'cherry', face: [0.54, 0.45], name: '체리', animal: '다람쥐', tone: 'yo', color: '#c4502a',
    tag: '재정 담당관 · 하나하나 기록함',
    intro: [
      '안녕하세요, 점장님. 마을 살림을 맡고 있는 체리예요.',
      '보여 주시는 건 수첩에 꼼꼼히 적어 둘게요. 기록은 제 전문이거든요.'
    ],
    order: '{drink} 한 잔이요. 장부 정리하다가 당이 떨어졌어요.',
    thanks: '가격 대비 만족도 최고예요! 장부에 적어 둘게요.',
    ending: '오늘 수첩이 꽉 찼어요. 다음에도 이대로 만들어 볼게요!'
  },
  {
    id: 'owen', face: [0.48, 0.42], name: '오웬', animal: '부엉이', tone: 'da', color: '#2c6b6b',
    tag: '마을 행정관 · 침착하고 생각이 깊음',
    intro: [
      '오웬입니다. 오늘부터 이곳에서 함께 일하게 되었습니다.',
      '처음엔 서툴겠지만, 점장님이 보여 주시는 절차를 차근차근 익히겠습니다.'
    ],
    order: '{drink} 한 잔 부탁드립니다. 회의 전에 잠시 쉬려고요.',
    thanks: '훌륭합니다. 오늘 회의가 잘 풀릴 것 같군요.',
    ending: '오늘 배운 절차는 잘 정리해 두었습니다. 수고 많으셨습니다, 점장님.'
  },
  {
    id: 'mina', face: [0.48, 0.49], name: '미나', animal: '토끼', tone: 'yo', color: '#e57b6a',
    tag: '주민 대표 · 밝고 씩씩함',
    intro: [
      '안녕하세요, 점장님! 주민 대표 미나예요.',
      '동네 사람들이 다 오는 카페라니 너무 설레요. 열심히 배울게요!'
    ],
    order: '안녕하세요! {drink} 한 잔 주세요. 동네 회의 끝나고 왔어요!',
    thanks: '우와, 너무 귀여워요! 사진 찍어서 다들한테 보여 줄래요!',
    ending: '오늘 진짜 재밌었어요! 다음엔 제가 점장님한테 한 잔 만들어 드릴게요!'
  },
  {
    id: 'rio', face: [0.46, 0.45], name: '리오', animal: '고양이', tone: 'yo', color: '#7a2b5c',
    tag: '축제 기획자 · 그림 그리기를 좋아함',
    intro: [
      '안녕하세요! 축제를 기획하는 리오예요.',
      '라떼 아트라니, 컵 위에 그림을 그리는 거죠? 벌써 신나요!'
    ],
    order: '{drink} 한 잔이요! 축제 포스터 그리다가 쉬러 왔어요.',
    thanks: '이거 완전 작품이네요! 축제 때도 이렇게 만들어 주세요!',
    ending: '오늘 배운 그림, 축제 날에 꼭 써먹을게요. 고마워요, 점장님!'
  }
];

// 영업 설정: 실제 daySeconds초 동안 openHour시 → closeHour시가 흐른다
const CONFIG = {
  daySeconds: 300,      // 하루 영업(12시간)이 실제로 걸리는 시간(초)
  openHour: 9,
  closeHour: 21,
  arriveGapMs: 1500,    // 손님이 떠나고 다음 손님이 올 때까지(실제 ms)
  clockStepMin: 30,     // 시계가 몇 분 단위로 넘어가는지
  albaStepSec: 7,       // 알바생이 재료 하나를 넣는 데 걸리는 시간(실제 초)
  albaArtSec: 6,        // 알바생이 라떼 아트를 올리는 데 걸리는 시간(실제 초)
  templateScore: 60     // 템플릿 아트의 점수(직접 예쁘게 그리면 이보다 높게 받을 수 있다)
};

// 재료: img는 assets/ing/<파일>.png. 그림 파일이 없으면 빈칸(점선)으로 보인다.
// mix는 컵 속 색, amount는 컵을 채우는 양(0..1)
const INGREDIENTS = [
  { id: 'espresso', name: '에스프레소', img: 'assets/ing/espresso.png', color: '#3b1d0e', mix: [70, 36, 16], amount: 0.22 },
  { id: 'milk', name: '우유', img: 'assets/ing/milk.png', color: '#fbf6ec', mix: [250, 244, 232], amount: 0.55 },
  { id: 'syrup', name: '바닐라 시럽', img: 'assets/ing/syrup.png', color: '#d99a2b', mix: [214, 150, 60], amount: 0.1 },
  { id: 'choco', name: '초코 소스', img: 'assets/ing/chocolate.png', color: '#4a2414', mix: [80, 38, 20], amount: 0.22 },
  { id: 'caramel', name: '캐러멜 소스', img: 'assets/ing/caramel.png', color: '#b8641e', mix: [190, 110, 40], amount: 0.1 },
  { id: 'hazelnut', name: '헤이즐넛 시럽', img: 'assets/ing/hazelnut.png', color: '#8a5a2b', mix: [150, 100, 55], amount: 0.1 },
  { id: 'strawberry', name: '딸기 청', img: 'assets/ing/strawberry.png', color: '#d8344f', mix: [220, 60, 85], amount: 0.2 },
  { id: 'matcha', name: '녹차 가루', img: 'assets/ing/matcha.png', color: '#6f9a34', mix: [110, 160, 55], amount: 0.15 },
  { id: 'cinnamon', name: '시나몬 가루', img: 'assets/ing/cinnamon.png', color: '#9b5a2e', mix: [160, 95, 50], amount: 0.04 },
  { id: 'honey', name: '꿀', img: 'assets/ing/honey.png', color: '#e8a520', mix: [235, 170, 40], amount: 0.08 }
];

// 음료: steps는 넣는 순서, price는 값(원), surface는 위에서 본 음료 색
const DRINKS = [
  { id: 'cafe', name: '카페 라떼', price: 4000, steps: ['espresso', 'milk'], surface: '#b67a45', dark: '#7a4522' },
  { id: 'vanilla', name: '바닐라 라떼', price: 4500, steps: ['syrup', 'espresso', 'milk'], surface: '#c38f58', dark: '#86542a' },
  { id: 'hazelnut', name: '헤이즐넛 라떼', price: 4500, steps: ['hazelnut', 'espresso', 'milk'], surface: '#b07a48', dark: '#734220' },
  { id: 'honey', name: '허니 라떼', price: 4500, steps: ['honey', 'espresso', 'milk'], surface: '#c99350', dark: '#8a5a22' },
  { id: 'cinnamon', name: '시나몬 라떼', price: 4500, steps: ['espresso', 'milk', 'cinnamon'], surface: '#a8703f', dark: '#6e3f1c' },
  { id: 'choco', name: '초코 라떼', price: 4500, steps: ['choco', 'milk'], surface: '#9a6040', dark: '#5f321b' },
  { id: 'mocha', name: '카페 모카', price: 5000, steps: ['choco', 'espresso', 'milk'], surface: '#8a5434', dark: '#5a2d17' },
  { id: 'strawberry', name: '딸기 라떼', price: 5000, steps: ['strawberry', 'milk'], surface: '#ec8b98', dark: '#c9506a' },
  { id: 'matcha', name: '녹차 라떼', price: 5000, steps: ['matcha', 'milk'], surface: '#9cbd5c', dark: '#5f8a2a' },
  { id: 'caramel', name: '캐러멜 마키아토', price: 5500, steps: ['syrup', 'milk', 'espresso', 'caramel'], surface: '#c08048', dark: '#7d4a1e' }
];

// 라떼 아트 점수(0~100) → 팁(원). 100점이면 2,000원
function tipFor(score) { return Math.round(score * 20 / 100) * 100; }

const TEMPLATES = [
  { id: 'heart', name: '하트' },
  { id: 'tulip', name: '튤립' },
  { id: 'leaf', name: '나뭇잎' },
  { id: 'bear', name: '곰돌이' }
];

// 알바생 공통 대사. [해요체, 합니다체]
const LINES = {
  firstOrderAsk: ['점장님, 저 이 음료는 처음 봐요. 만드는 거 보여 주실래요?', '점장님, 이 음료는 처음 봅니다. 만드는 걸 보여 주시겠습니까?'],
  watch: ['옆에서 잘 보고 메모할게요!', '옆에서 잘 보고 기록하겠습니다!'],
  stepFirst: ['{ing}이(가) 제일 먼저군요!', '{ing}이(가) 첫 번째군요!'],
  stepNext: ['그다음은 {ing}! 적어 둘게요.', '다음은 {ing}. 기록했습니다.'],
  stepLast: ['마지막에 {ing}까지! 다 외웠어요.', '마지막은 {ing}. 순서를 다 익혔습니다.'],
  wrong: ['어? 카드에는 {ing}이(가) 먼저라고 적혀 있어요.', '점장님, 카드에는 {ing}이(가) 먼저입니다.'],
  toArt: ['이제 컵을 옆으로 옮겨서 그림을 그리는 거죠?', '이제 컵을 옮겨서 그림을 올리는 순서군요.'],
  artChoose: ['템플릿을 고르셔도 되고, 직접 그려서 가르쳐 주셔도 돼요!', '정해진 모양을 고르셔도 되고, 직접 그려서 가르쳐 주셔도 됩니다.'],
  templateLearned: ['{art} 모양이군요! 다음엔 저도 이렇게 올려 볼게요.', '{art} 모양. 다음엔 저도 이렇게 올리겠습니다.'],
  draw1: ['점장님, 한 번 더 보여 주시면 비슷한 부분을 찾아볼게요.', '점장님, 한 번 더 보여 주시면 공통된 부분을 찾아보겠습니다.'],
  draw2good: ['벌써 겹치는 부분이 보여요! 한 번만 더 그려 주실래요?', '겹치는 부분이 보이기 시작합니다. 한 번만 더 부탁드립니다.'],
  draw2bad: ['음… 두 그림이 조금 달라요. 한 번 더 보여 주실래요?', '두 그림이 꽤 다르군요. 한 번 더 보여 주시겠습니까?'],
  draw3good: ['가운데가 이렇게 모이는 거군요! 제가 이해한 모양, 봐 주실래요?', '공통된 모양을 찾았습니다. 제가 이해한 모양을 봐 주시겠습니까?'],
  draw3ok: ['비슷한 부분은 찾았는데, 끝부분이 조금 흐릿해요. 이 정도면 될까요?', '공통된 부분은 찾았지만 가장자리가 흐릿합니다. 이 정도면 괜찮겠습니까?'],
  draw3bad: ['그림마다 모양이 많이 달라서 헷갈려요… 한 번 더 보여 주시면 좋겠어요.', '그림마다 차이가 커서 헷갈립니다… 한 번 더 보여 주시면 좋겠습니다.'],
  drawMax: ['이제 더 그리지 않아도 돼요. 보여 주신 걸로 기억해 볼게요!', '이 정도면 충분합니다. 보여 주신 것으로 기억하겠습니다.'],
  learnedAvg: ['여러 그림에서 겹치는 모양을 기억했어요!', '여러 그림의 공통된 모양을 기억했습니다.'],
  learnedPick: ['이 그림을 그대로 기억해 둘게요!', '이 그림을 그대로 기억해 두겠습니다.'],
  drawEmpty: ['아직 아무것도 안 그리셨어요!', '아직 그림이 없습니다.'],
  serve: ['손님께 가져다드려요!', '손님께 전해 드리겠습니다.'],
  secondIntro: ['점장님, 이번엔 제가 만들어 봐도 될까요? 아까 배운 대로 해 볼게요!', '점장님, 이번에는 제가 해 보겠습니다. 배운 순서대로 하겠습니다!'],
  autoStart: ['맡겨 주세요! 메모를 보면서 할게요.', '맡겨 주십시오. 기록한 대로 하겠습니다.'],
  autoStep: ['{n}번째는… {ing}!', '{n}번째, {ing}.'],
  autoArt: ['그림도 배운 대로 올려 볼게요!', '그림도 배운 대로 올리겠습니다.'],
  autoNoArt: ['그림은 아직 못 배웠어요. 이건 점장님이 해 주세요!', '그림은 아직 배우지 못했습니다. 점장님이 부탁드립니다.'],
  autoDone: ['다 됐어요! 어때요, 점장님?', '완성했습니다. 어떻습니까, 점장님?'],
  notLearned: ['이 음료는 아직 안 배웠어요. 먼저 보여 주세요!', '이 음료는 아직 배우지 않았습니다. 먼저 보여 주십시오.'],
  customerHappy: ['손님이 좋아하셔서 다행이에요!', '손님이 만족하셔서 다행입니다.'],
  proud: ['제가 만든 걸 손님이 좋아해 주셨어요! 점장님이 잘 가르쳐 주신 덕분이에요.', '제가 만든 음료를 손님이 좋아해 주셨습니다. 점장님 덕분입니다.'],
  idleBar: ['재료를 순서대로 눌러 주세요!', '재료를 순서대로 눌러 주십시오.']
};

const ART_NAMES = { heart: '하트', tulip: '튤립', leaf: '나뭇잎', bear: '곰돌이' };

// 받침(이/가) 처리
function josa(word, pair) {
  const ch = word.charCodeAt(word.length - 1);
  const has = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
  const [a, b] = pair.split('/');
  return word + (has ? a : b);
}

function fillLine(text, vars) {
  return text
    .replace(/\{(\w+)\}이\(가\)/g, (_, k) => josa(vars[k], '이/가'))
    .replace(/\{(\w+)\}/g, (_, k) => vars[k]);
}

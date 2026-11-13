// 게임 진행
(() => {
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const portrait = (c, exp = 'neutral') => `assets/chars/${c.id}_${exp}.png`;
  const ING = Object.fromEntries(INGREDIENTS.map(i => [i.id, i]));

  // 추가 대사 [해요체, 합니다체]
  Object.assign(LINES, {
    boss: ['점장님, 오늘 잘 부탁드려요! 손님이 오시면 주문부터 받아 볼까요?', '점장님, 잘 부탁드립니다! 손님이 오시면 주문부터 받겠습니다.'],
    welcome: ['어서 오세요!', '어서 오십시오!'],
    sameOrder: ['앞 손님이 마신 {drink}, 맛있어 보이던데요! 저도 같은 걸로 주세요.', '앞 손님이 드신 {drink}, 좋아 보이더군요. 같은 걸로 부탁드립니다.'],
    goodbye: ['또 올게요!', '또 오겠습니다.'],
    open1: ['우리 카페는 아침 9시에 열어서 저녁 9시에 닫아요. 시계는 30분씩 바뀌고, 설명을 읽는 동안은 멈춰요!', '영업은 아침 9시부터 저녁 9시까지입니다. 시계는 30분 단위이며, 설명 중에는 멈춥니다.'],
    open2: ['음료마다 값이 다르고, 라떼 아트를 예쁘게 그리면 손님이 팁을 더 주신대요.', '음료마다 값이 다르고, 라떼 아트가 예쁘면 손님이 팁을 더 주십니다.'],
    open3: ['배운 음료를 맡겨 주시면 제가 만들어서 서빙할게요. 그동안 점장님은 다른 손님을 받으시면 돼요!', '배운 음료를 맡기시면 제가 제조하고 서빙하겠습니다. 그동안 다른 손님을 응대하실 수 있습니다.'],
    open4: ['그럼 문 열게요! 어서 오세요~', '그럼 문을 열겠습니다!'],
    nextDay: ['오늘도 잘 부탁드려요! 문 열게요!', '오늘도 잘 부탁드립니다. 문을 열겠습니다!'],
    closing: ['벌써 저녁 9시예요! 오늘 영업 끝!', '저녁 9시입니다. 오늘 영업은 여기까지입니다.'],
    plainThanks: ['고마워요. 잘 마실게요.', '감사합니다. 잘 마시겠습니다.'],
    albaThink: ['음… {n}번째가 뭐였더라…', '{n}번째는… 잠시만요.'],
    albaArtThink: ['그림은… 이렇게였나? 천천히 해 볼게요.', '그림은… 천천히 올려 보겠습니다.'],
    noArtServe: ['그림은 아직 못 배워서, 그림 없이 드릴게요.', '그림은 아직 배우지 못해 그대로 드리겠습니다.']
  });

  const S = {
    alba: null, queue: [], recipes: {}, art: null, artMethod: null, artInfo: null,
    orders: [], orderNo: 0, firstDrink: null,
    day: 1, money: 0, totalMoney: 0, shift: null, closedShown: false, inOrder: false,
    worker: new CAFE.Worker(), workerDone: null, workerReceipt: null, paused: false
  };
  const L = (key, vars = {}) => fillLine(LINES[key][S.alba && S.alba.tone === 'da' ? 1 : 0], vars);
  const CL = (c, key, vars = {}) => fillLine(LINES[key][c.tone === 'da' ? 1 : 0], vars);

  // ---------- 영업 시계 ----------
  const OPEN = CONFIG.openHour * 60, CLOSE = CONFIG.closeHour * 60;
  const gameMinutes = () => S.shift ? S.shift.minutes : OPEN;
  const isClosed = () => !!S.shift && S.shift.closed;
  function fmtTime(m) {
    m = CAFE.displayMinutes(m);
    const h = Math.floor(m / 60), mm = m % 60;
    return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(mm).padStart(2, '0')}`;
  }
  const won = n => n.toLocaleString('ko-KR') + '원';
  const reading = () => $('talk').classList.contains('show') || $('notePanel').classList.contains('show');
  function updateClock() {
    const m = gameMinutes(), t = (m - OPEN) / (CLOSE - OPEN);
    $('clockText').textContent = fmtTime(m);
    $('clockHint').textContent = S.paused ? '잠깐 쉬는 중' : reading() ? '설명 중 · 시간 멈춤' : '30분 단위';
    $('dayFill').style.width = (t * 100) + '%';
    const col = t < 0.6 ? '#f6c24a' : t < 0.85 ? '#e58a4a' : '#5a4b8a';
    const sun = $('sun'); sun.style.background = col; sun.style.boxShadow = `0 0 10px ${col}`;
    if (isClosed() && !S.closedShown) {
      S.closedShown = true;
      toast('저녁 9시! 받은 주문을 모두 마무리하고 마감해요.');
    }
  }
  let lastTick = performance.now();
  setInterval(() => {
    const now = performance.now(), dt = now - lastTick; lastTick = now;
    if (S.shift && !S.paused && !document.hidden && !$('result').classList.contains('show')) {
      if (!reading()) S.shift.advance(dt);
      const done = S.worker.advance(dt);
      if (done) finishWorker(done);
    }
    updateWorkerPanel(); updateClock();
  }, 100);
  function pause(on) {
    if (!S.shift || $('result').classList.contains('show')) return;
    S.paused = on; lastTick = performance.now();
    $('pausePanel').hidden = !on;
    $('btnPause').textContent = on ? '쉬는 중' : '잠깐 쉬기';
    if (on) drawing = false;
    updateClock();
  }
  $('btnPause').onclick = () => pause(true);
  $('btnResume').onclick = () => pause(false);
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && S.shift && !$('result').classList.contains('show')) {
      e.preventDefault(); pause(!S.paused);
    }
  });
  document.addEventListener('visibilitychange', () => {
    lastTick = performance.now();
    if (document.hidden) pause(true);
  });
  function addMoney(n) {
    S.money += n; S.totalMoney += n;
    $('moneyText').textContent = won(S.money);
    const m = document.querySelector('.money'); m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump');
  }
  let toastTimer;
  function toast(text, ms = 3000) {
    const t = $('toast'); t.textContent = text; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ---------- 화면 맞춤 ----------
  function fit() {
    const s = Math.min(innerWidth / 1280, innerHeight / 720);
    document.documentElement.style.setProperty('--s', s);
  }
  addEventListener('resize', fit); fit();
  // 포커스 등으로 화면 안쪽이 스크롤되어 밀리지 않게 고정
  document.querySelectorAll('#stage, .screen, .pane, #world, #frame').forEach(el =>
    el.addEventListener('scroll', () => { el.scrollTop = 0; el.scrollLeft = 0; }));

  async function go(id) {
    $('fade').classList.add('on'); await wait(450);
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    $('fade').classList.remove('on'); await wait(300);
  }

  // ---------- 대화(비주얼 노벨) ----------
  let talkClick = null;
  $('talkBox').addEventListener('click', () => !S.paused && talkClick && talkClick());
  addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && talkClick && !S.paused) { e.preventDefault(); talkClick(); } });

  function setTalkSpeaker(c, exp, showPortrait) {
    $('talkName').textContent = c ? c.name : '';
    $('talkBox').style.setProperty('--c', c ? c.color : '#c9693f');
    $('talkName').style.setProperty('--c', c ? c.color : '#c9693f');
    const p = $('talkPortrait');
    if (c && showPortrait) {
      p.src = portrait(c, exp); p.classList.add('show');
    } else p.classList.remove('show');
    if (c && c !== S.alba) { $('customer').src = portrait(c, exp); }
  }

  function typeText(text) {
    const el = $('talkText'); el.textContent = '';
    let i = 0, done = false, timer;
    return new Promise(resolve => {
      const finish = () => { clearInterval(timer); el.textContent = text; done = true; resolve(); };
      timer = setInterval(() => { i++; el.textContent = text.slice(0, i); if (i % 3 === 0) SFX.blip(); if (i >= text.length) finish(); }, 32);
      talkClick = () => { if (!done) finish(); };
    });
  }

  async function say(c, text, exp = 'neutral', opts = {}) {
    const showPortrait = opts.portrait !== undefined ? opts.portrait : c === S.alba;
    $('talk').classList.add('show');
    $('talkChoices').innerHTML = '';
    setTalkSpeaker(c, exp, showPortrait);
    if (c && c !== S.alba && opts.bounce) { const cu = $('customer'); cu.classList.remove('bounce'); void cu.offsetWidth; cu.classList.add('bounce'); }
    await typeText(text);
    await new Promise(r => { talkClick = () => { SFX.click(); r(); }; });
    talkClick = null;
  }

  async function ask(c, text, exp, options) {
    $('talk').classList.add('show');
    setTalkSpeaker(c, exp, c === S.alba);
    $('talkChoices').innerHTML = '';
    await typeText(text);
    talkClick = null;
    const v = await buttons($('talkChoices'), options);
    $('talkChoices').innerHTML = '';
    return v;
  }

  function hideTalk() {
    $('talk').classList.remove('show');
    $('talkPortrait').classList.remove('show');
    talkClick = null;
  }

  function buttons(container, options) {
    container.innerHTML = '';
    return new Promise(resolve => {
      for (const o of options) {
        const b = document.createElement('button');
        b.className = 'btn ' + (o.cls || '');
        b.textContent = o.label;
        if (o.disabled) b.disabled = true;
        b.onclick = () => { SFX.click(); container.innerHTML = ''; resolve(o.value); };
        container.appendChild(b);
      }
    });
  }

  // ---------- 말풍선(제조대에서 조작을 막지 않는 대사) ----------
  let bubbleTimer;
  function bubble(text, exp = 'neutral', ms = 3400) {
    const b = $('bubble');
    b.textContent = text; b.classList.add('show');
    setHelper(exp, true);
    clearTimeout(bubbleTimer);
    if (ms) bubbleTimer = setTimeout(() => b.classList.remove('show'), ms);
  }
  function setHelper(exp, nod) {
    const img = $('helperImg');
    img.src = portrait(S.alba, exp);
    if (nod) { img.classList.remove('nod'); void img.offsetWidth; img.classList.add('nod'); }
  }

  function sparkle(parent, x, y, n = 12) {
    const box = document.createElement('div'); box.className = 'sparkles';
    box.style.left = x + 'px'; box.style.top = y + 'px';
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i'); const a = Math.random() * 6.283, d = 50 + Math.random() * 70;
      s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      s.style.animationDelay = Math.random() * 0.15 + 's';
      box.appendChild(s);
    }
    parent.appendChild(box); setTimeout(() => box.remove(), 1400);
  }

  // ---------- 시작 화면 ----------
  function initTitle() {
    const cv = $('titleCup');
    ART.renderSurface(cv.getContext('2d'), 220, DRINKS[0], { type: 'template', id: 'heart' });
    $('btnStart').onclick = async () => { SFX.unlock(); SFX.click(); await go('select'); };
  }

  // ---------- 알바생 선택 ----------
  function initSelect() {
    const box = $('cards'); let chosen = null;
    for (const c of CHARACTERS) {
      const d = document.createElement('button'); d.className = 'card'; d.type = 'button';
      d.setAttribute('aria-label', `${c.name} · ${c.tag}`);
      d.innerHTML = `<div class="face" style="--c:${c.color}"><img src="${portrait(c)}" alt=""></div>
        <div class="info"><b>${c.name}</b><span>${c.tag}</span></div>`;
      d.onclick = () => {
        SFX.click();
        box.querySelectorAll('.card').forEach(x => x.classList.remove('sel'));
        d.classList.add('sel'); chosen = c;
        d.querySelector('img').src = portrait(c, 'delight');
        box.querySelectorAll('.card:not(.sel) img').forEach((im, i) => { const cc = CHARACTERS.find(x => im.src.includes('/' + x.id + '_')); if (cc) im.src = portrait(cc); });
        $('btnPick').disabled = false;
      };
      box.appendChild(d);
    }
    $('btnPick').onclick = () => { if (chosen) { SFX.click(); startCafe(chosen); } };
  }

  // ---------- 카페 시작 ----------
  function resetState(alba) {
    S.alba = alba; S.queue = []; S.recipes = {}; S.art = null; S.artMethod = null; S.artInfo = null;
    S.orders = []; S.orderNo = 0; S.firstDrink = null;
    S.day = 1; S.money = 0; S.totalMoney = 0; S.shift = null; S.closedShown = false; S.inOrder = false;
    S.worker = new CAFE.Worker(); S.workerDone = null; S.workerReceipt = null; S.paused = false;
    $('pausePanel').hidden = true; $('btnPause').textContent = '잠깐 쉬기';
    $('notePanel').classList.remove('show'); updateWorkerPanel();
    $('moneyText').textContent = won(0); updateClock();
  }
  function nextCustomer() {
    if (!S.queue.length) S.queue = shuffle(CHARACTERS.filter(c => c !== S.alba));
    const busyCustomer = S.worker.job?.order.cust;
    const available = S.queue.findIndex(c => c !== busyCustomer);
    return S.queue.splice(available < 0 ? 0 : available, 1)[0];
  }

  async function startCafe(alba) {
    resetState(alba);
    $('helperImg').src = portrait(alba);
    $('world').classList.remove('at-bar');
    $('customer').className = 'customer';
    $('served').classList.remove('show');
    $('result').classList.remove('show');
    renderMemo(null);
    await go('cafe');
    await wait(200);
    await say(alba, alba.intro[0], 'neutral');
    await say(alba, alba.intro[1], 'delight');
    await say(alba, L('boss'), 'neutral');
    await say(alba, L('open1'), 'neutral');
    await say(alba, L('open2'), 'delight');
    await say(alba, L('open3'), 'sad');
    await say(alba, L('open4'), 'delight');
    hideTalk();
    await runDay();
  }

  // ---------- 하루 영업 ----------
  async function runDay() {
    S.money = 0; S.orders = []; S.closedShown = false;
    $('moneyText').textContent = won(0);
    S.shift = new CAFE.Shift(CONFIG); lastTick = performance.now();
    toast(`${S.day}일차 영업 시작! 저녁 9시까지 많이 팔아 봐요.`);
    while (!isClosed()) {
      await runOrder();
      if (isClosed()) break;
      await wait(CONFIG.arriveGapMs);
    }
    if (S.worker.busy) {
      toast('새 주문은 마감했어요. 맡긴 음료까지 서빙하고 정산해요.', 6000);
      await new Promise(resolve => { S.workerDone = resolve; });
    }
    await say(S.alba, L('closing'), 'delight');
    if (S.day === 1) await say(S.alba, S.alba.ending, 'delight');
    hideTalk();
    showResult();
  }

  // ---------- 한 번의 주문 ----------
  async function runOrder() {
    const idx = S.orderNo++;
    S.inOrder = true;
    const cust = nextCustomer();
    let drink;
    if (idx === 0) { drink = DRINKS[0]; S.firstDrink = drink; }
    else if (idx === 1) drink = S.firstDrink;
    else drink = pick(DRINKS);

    // 손님 등장
    const cu = $('customer');
    cu.className = 'customer'; cu.src = portrait(cust);
    await wait(80); SFX.ding(); cu.classList.add('in');
    await wait(650);
    await say(S.alba, L('welcome'), 'delight', { portrait: false });
    if (idx === 1) await say(cust, CL(cust, 'sameOrder', { drink: drink.name }), 'neutral', { bounce: true });
    else await say(cust, fillLine(cust.order, { drink: drink.name }), 'neutral', { bounce: true });
    showOrderMemo(cust, drink);

    // 누가 만들까?
    const learned = !!S.recipes[drink.id];
    let byAlba = false;
    if (learned) {
      const busy = S.worker.busy;
      const v = await ask(S.alba, busy ? '아직 맡겨 주신 주문을 만들고 있어요. 이번 잔은 점장님이 부탁드려요!' : L('secondIntro'), 'delight', [
        { label: busy ? `${S.alba.name} 제작 중` : `${S.alba.name}에게 맡기기`, value: 'alba', cls: 'green', disabled: busy },
        { label: '내가 직접 만들기', value: 'me', cls: 'light' }
      ]);
      byAlba = v === 'alba';
    } else {
      await say(S.alba, L('firstOrderAsk'), 'sad');
    }
    hideTalk();

    if (byAlba) {
      startWorker({ cust, drink, idx });
      cu.classList.add('out');
      $('orderMemo').classList.remove('show');
      await wait(700); S.inOrder = false;
      return;
    }

    // 제조대로
    $('world').classList.add('at-bar'); SFX.swoosh();
    resetCup(drink); setHelper('neutral');
    await wait(1000);

    await teachMake(drink);

    // 점장님 작업대는 맡긴 주문과 독립적으로 사용한다.
    await moveCupToMat();
    const result = await artSession(drink);
    const score = LEARN.artScore(result.art), tip = tipFor(score);

    // 서빙
    $('art').classList.remove('show');
    bubble(L('serve'), 'delight', 1600);
    await wait(700);
    $('world').classList.remove('at-bar'); SFX.swoosh();
    await wait(1050);
    drawServed($('served').querySelector('canvas'), drink, result.art);
    $('served').classList.add('show'); SFX.ding();
    await wait(600);
    const happy = score >= 50;
    cu.src = portrait(cust, happy ? 'delight' : 'neutral');
    addMoney(drink.price + tip); moneyPop(drink.price, tip, score);
    if (happy) { sparkle($('counter'), 885, 400, 16); SFX.sparkle(); } else SFX.good();
    await say(cust, happy ? cust.thanks : CL(cust, 'plainThanks'), happy ? 'delight' : 'neutral', { bounce: happy });
    if (idx < 2) await say(S.alba, L('customerHappy'), 'delight');
    S.orders.push({ cust, drink, art: result.art, by: 'me', price: drink.price, tip, score, time: gameMinutes() });

    await say(cust, CL(cust, 'goodbye'), 'delight');
    hideTalk();
    cu.classList.add('out');
    $('served').classList.remove('show');
    $('orderMemo').classList.remove('show');
    await wait(700);
    S.inOrder = false;
  }

  // ---------- 별도 작업대에서 진행되는 맡긴 주문 ----------
  function startWorker(order) {
    if (!S.worker.start(order, S.recipes[order.drink.id], S.art)) return false;
    S.workerReceipt = null;
    $('workerName').textContent = `${S.alba.name}의 작업대`;
    $('workerPortrait').src = portrait(S.alba);
    $('workerOrder').textContent = `${order.cust.name} · ${order.drink.name}`;
    toast(`${S.alba.name}에게 맡겼어요. 다음 손님을 받아 볼까요?`, 4000);
    updateWorkerPanel();
    return true;
  }
  function updateWorkerPanel() {
    const job = S.worker.job;
    const receipt = S.workerReceipt && performance.now() < S.workerReceipt.until ? S.workerReceipt : null;
    const shown = !!job || !!receipt;
    $('workerPanel').hidden = !shown;
    $('cafe').classList.toggle('has-worker', shown);
    $('cafe').classList.toggle('worker-busy', !!job);
    if (!shown) return;
    const pct = job ? Math.floor(job.elapsed / job.duration * 100) : 100;
    $('workerFill').style.width = pct + '%';
    $('workerPercent').textContent = pct + '%';
    $('workerFill').parentElement.setAttribute('aria-valuenow', pct);
    $('workerStatus').textContent = job ? '제작 중' : '서빙 완료';
    if (job) {
      const index = Math.floor(job.elapsed / job.stepMs);
      $('workerStep').textContent = index < job.steps.length
        ? `${index + 1}/${job.steps.length} · ${ING[job.steps[index]].name} 넣는 중`
        : job.art ? '배운 라떼 아트로 마무리하는 중' : '음료를 손님께 전하는 중';
      $('workerHint').textContent = '다른 손님의 음료를 직접 만들 수 있어요.';
    } else {
      $('workerStep').textContent = `+${won(receipt.amount)} · 매출에 반영했어요`;
      $('workerHint').textContent = '다음 주문도 맡길 수 있어요.';
    }
  }
  function finishWorker(job) {
    const { cust, drink } = job.order;
    const score = LEARN.artScore(job.art), tip = tipFor(score), amount = drink.price + tip;
    // 완료 통지는 점장님의 컵, 대화, 그림을 건드리지 않는다.
    addMoney(amount);
    S.orders.push({ cust, drink, art: job.art, by: 'alba', price: drink.price, tip, score, time: gameMinutes() });
    S.workerReceipt = { amount, until: performance.now() + 6000 };
    $('workerPortrait').src = portrait(S.alba, 'delight');
    toast(`${S.alba.name}: ${cust.name} 손님께 ${drink.name} 서빙 완료! +${won(amount)}`, 4500);
    SFX.ding();
    if (S.workerDone) { const done = S.workerDone; S.workerDone = null; done(); }
  }

  function moneyPop(price, tip, score) {
    const d = document.createElement('div'); d.className = 'money-pop';
    d.style.left = '760px'; d.style.top = '300px';
    d.innerHTML = `+${won(price + tip)}` + (tip ? `<small>음료 ${won(price)} + 팁 ${won(tip)} (아트 ${score}점)</small>` : `<small>음료 ${won(price)} · 팁 없음</small>`);
    $('counter').appendChild(d);
    setTimeout(() => d.remove(), 2500);
  }

  function showOrderMemo(cust, drink) {
    const m = $('orderMemo');
    m.innerHTML = `<small>${fmtTime(gameMinutes())} · ${cust.name} 손님</small><b>${drink.name}</b><span class="price">${won(drink.price)}</span>`;
    m.classList.remove('show'); void m.offsetWidth; m.classList.add('show');
  }

  // ---------- 제조대 ----------
  function buildIngredients() {
    const box = $('ingredients'); box.innerHTML = '';
    for (const ing of INGREDIENTS) {
      const b = document.createElement('button');
      b.className = 'ing'; b.dataset.id = ing.id; b.disabled = true;
      b.innerHTML = `<span class="ph"></span><img alt=""><span class="nm">${ing.name}</span>`;
      const im = b.querySelector('img'); im.onerror = () => b.classList.add('blank'); im.src = ing.img;
      b.onclick = () => { if (ingWaiter) { const f = ingWaiter; ingWaiter = null; f(ing.id); } };
      box.appendChild(b);
    }
  }
  let ingWaiter = null;
  function waitIngredient() {
    setIngEnabled(true);
    return new Promise(r => { ingWaiter = id => { setIngEnabled(false); r(id); }; });
  }
  function setIngEnabled(on) { document.querySelectorAll('.ing').forEach(b => b.disabled = !on); }
  function glowIng(id) { document.querySelectorAll('.ing').forEach(b => b.classList.toggle('glow', b.dataset.id === id)); }

  // 컵 속 음료: 재료가 들어갈수록 수면이 올라오고 색이 섞인다
  const CUP = { rim: [195, 135, 155, 93], low: [195, 193, 95, 32], high: [195, 142, 145, 85] };
  const liquidState = { level: 0, color: [255, 255, 255], poured: [], drink: null };
  function mixOf(ids) {
    let w = 0, c = [0, 0, 0];
    for (const id of ids) { const g = ING[id]; w += g.amount; for (let k = 0; k < 3; k++) c[k] += g.mix[k] * g.amount; }
    const total = liquidState.drink?.steps.reduce((sum, id) => sum + ING[id].amount, 0) || 1;
    return { level: Math.min(1, w / total), color: w ? c.map(v => v / w) : [255, 255, 255] };
  }
  function drawLiquid(level, color) {
    const cv = $('liquid'), g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    if (level <= 0.001) return;
    const t = Math.min(1, level), L = CUP.low, H = CUP.high, R = CUP.rim;
    const cx = L[0] + (H[0] - L[0]) * t, cy = L[1] + (H[1] - L[1]) * t, rx = L[2] + (H[2] - L[2]) * t, ry = L[3] + (H[3] - L[3]) * t;
    g.save();
    g.beginPath(); g.ellipse(R[0], R[1], R[2] - 4, R[3] - 4, 0, 0, Math.PI * 2); g.clip();
    const [r, gg, b] = color.map(Math.round);
    const grad = g.createRadialGradient(cx - rx * 0.3, cy - ry * 0.4, 4, cx, cy, rx);
    grad.addColorStop(0, `rgb(${Math.min(255, r + 40)},${Math.min(255, gg + 36)},${Math.min(255, b + 30)})`);
    grad.addColorStop(0.7, `rgb(${r},${gg},${b})`);
    grad.addColorStop(1, `rgb(${Math.round(r * 0.75)},${Math.round(gg * 0.72)},${Math.round(b * 0.7)})`);
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(cx, cy, rx * 0.86, ry * 0.8, 0, Math.PI * 1.1, Math.PI * 1.55); g.stroke();
    g.restore();
  }
  function animateLiquid(to, ms = 800) {
    const from = { level: liquidState.level, color: liquidState.color.slice() };
    const t0 = performance.now();
    return new Promise(res => {
      const step = now => {
        const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 2);
        liquidState.level = from.level + (to.level - from.level) * e;
        liquidState.color = from.color.map((v, k) => v + (to.color[k] - v) * e);
        drawLiquid(liquidState.level, liquidState.color);
        if (p < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  function resetCup(drink) {
    liquidState.drink = drink;
    $('cupCaption').textContent = '빈 컵 · 레시피 순서대로 넣어 주세요';
    liquidState.level = 0; liquidState.color = [255, 255, 255]; liquidState.poured = [];
    drawLiquid(0);
    $('cup').classList.remove('on-mat');
    $('recipeCard').classList.remove('show');
    $('barActions').innerHTML = '';
    glowIng(null);
  }

  async function pour(id) {
    const ing = ING[id], btn = document.querySelector(`.ing[data-id="${id}"]`);
    const cup = $('cup'), rack = $('ingredients');
    const sx = rack.offsetLeft + btn.offsetLeft + (btn.offsetWidth - 86) / 2;
    const sy = rack.offsetTop + btn.offsetTop;
    const impactX = cup.offsetLeft + CUP.high[0] * cup.offsetWidth / 400;
    const impactY = cup.offsetTop + CUP.high[1] * cup.offsetHeight / 360;
    const fl = document.createElement('div'); fl.className = 'flyer';
    fl.innerHTML = btn.classList.contains('blank') ? `<div class="ph-fly">${ing.name}</div>` : `<img src="${ing.img}" alt="">`;
    fl.style.left = sx + 'px'; fl.style.top = sy + 'px';
    $('bar').appendChild(fl);
    await wait(30);
    fl.style.transform = `translate(${impactX - 43 - sx}px, ${impactY - 120 - sy}px) rotate(-25deg)`;
    await wait(420);
    liquidState.poured.push(id);
    const to = mixOf(liquidState.poured), powder = id === 'matcha' || id === 'cinnamon';
    const st = $('stream');
    st.classList.toggle('powder', powder);
    st.style.left = (impactX - (powder ? 9 : 4)) + 'px';
    st.style.top = (impactY - 40) + 'px'; st.style.height = '44px';
    st.style.background = powder
      ? `repeating-linear-gradient(0deg, transparent 0 5px, ${ing.color} 6px 10px, transparent 11px 17px)`
      : `linear-gradient(90deg, ${ing.color}, ${ART.lighten(ing.color, .2)}, ${ing.color})`;
    st.classList.add('on'); SFX.pour();
    await animateLiquid(to, 750);
    st.classList.remove('on');
    $('cupCaption').textContent = `${ing.name} 넣었어요 · ${liquidState.poured.length}/${liquidState.drink.steps.length}`;
    fl.style.opacity = '0';
    await wait(200); fl.remove();
  }

  function showRecipeCard(drink, title, stepsShown, current) {
    const c = $('recipeCard');
    const items = drink.steps.map((s, i) => {
      const cls = i < current ? 'done' : i === current ? 'now' : '';
      const name = stepsShown ? ING[s].name : '???';
      return `<li class="${cls}"><span class="n">${i + 1}</span>${name}</li>`;
    }).join('');
    c.innerHTML = `<h4>${drink.name}<small>${title}</small></h4><ol>${items}</ol>`;
    c.classList.add('show');
  }

  async function teachMake(drink) {
    renderMemo(drink, []);
    bubble(S.worker.busy ? '알바생은 다른 주문을 만드는 중이에요. 이 순서는 수첩에 남겨 둘게요.' : L('watch'), 'neutral');
    const recorded = [];
    for (let i = 0; i < drink.steps.length; i++) {
      showRecipeCard(drink, '레시피 카드 · 순서대로 넣어요', true, i);
      let wrongs = 0;
      while (true) {
        const id = await waitIngredient();
        if (id === drink.steps[i]) break;
        wrongs++; SFX.wrong();
        const cup = $('cup'); cup.classList.remove('shake'); void cup.offsetWidth; cup.classList.add('shake');
        bubble(L('wrong', { ing: ING[drink.steps[i]].name }), 'sad');
        if (wrongs >= 1) glowIng(drink.steps[i]);
      }
      glowIng(null);
      await pour(drink.steps[i]);
      recorded.push(drink.steps[i]);
      renderMemo(drink, recorded);
      SFX.good();
      const key = i === 0 ? 'stepFirst' : i === drink.steps.length - 1 ? 'stepLast' : 'stepNext';
      bubble(S.worker.busy ? `${ING[drink.steps[i]].name} 넣기 완료. 수첩에 순서를 기록했어요.` : L(key, { ing: ING[drink.steps[i]].name }), i === drink.steps.length - 1 ? 'delight' : 'neutral');
    }
    showRecipeCard(drink, '완성!', true, drink.steps.length);
    S.recipes[drink.id] = recorded.slice();
    await wait(500);
    bubble(L('toArt'), 'neutral', 0);
    await buttons($('barActions'), [{ label: '라떼 아트 작업대로 옮기기 →', value: 1, cls: 'big' }]);
    $('bubble').classList.remove('show');
  }

  async function moveCupToMat() {
    $('cup').classList.add('on-mat'); SFX.swoosh();
    await wait(1100);
  }

  // ---------- 알바 수첩 ----------
  function stepChips(steps) {
    return steps.map(s => `<span class="st"><img src="${ING[s].img}" alt="" onerror="this.remove()">${ING[s].name}</span>`).join('<span class="arrow">→</span>');
  }
  function renderMemo(drink, steps) {
    const box = $('memoList');
    if (!drink) { box.innerHTML = '<span style="color:#9a8570">아직 비어 있어요</span>'; return; }
    box.innerHTML = `<div style="font-weight:700;margin-bottom:3px">${drink.name}</div><div class="memo-steps">${steps.length ? stepChips(steps) : '<span style="color:#9a8570">보고 있어요…</span>'}</div>`;
  }
  $('btnNote').onclick = () => {
    SFX.click();
    const p = $('notePanel');
    if (p.classList.contains('show')) { p.classList.remove('show'); return; }
    const recs = Object.keys(S.recipes);
    let html = `<h4>${S.alba ? S.alba.name : '알바생'}의 수첩</h4>`;
    html += '<div class="row"><b>배운 레시피</b>';
    html += recs.length ? recs.map(id => { const d = DRINKS.find(x => x.id === id); return `<div style="margin:6px 0"><div>${d.name}</div><div class="memo-steps">${stepChips(S.recipes[id])}</div></div>`; }).join('') : '<div class="empty">아직 배운 레시피가 없어요.</div>';
    html += '</div><div class="row"><b>배운 라떼 아트</b>';
    html += S.art ? `<div><canvas id="noteArt" width="180" height="180"></canvas><div class="empty">${artDesc()}</div></div>` : '<div class="empty">아직 배운 그림이 없어요.</div>';
    html += '</div>';
    p.innerHTML = html; p.classList.add('show');
    if (S.art) ART.renderSurface($('noteArt').getContext('2d'), 180, DRINKS[0], S.art);
  };
  $('btnMute').onclick = () => { SFX.toggle(); $('btnMute').textContent = SFX.muted ? '소리 꺼짐' : '소리 켜짐'; };

  function artDesc() {
    if (S.artMethod === 'template') return `${ART_NAMES[S.artInfo]} 템플릿을 기억함`;
    if (S.artMethod === 'avg') return `그림 ${S.artInfo}장의 공통 모양을 기억함`;
    if (S.artMethod === 'pick') return '점장님이 고른 그림 한 장을 기억함';
    return '';
  }

  // ---------- 라떼 아트 ----------
  const surf = $('surface'), sctx = surf.getContext('2d');
  const drawLayer = $('drawLayer');
  const SZ = 450;

  function artUI({ title, hint }) {
    $('artTitle').textContent = title;
    $('artHint').textContent = hint;
    ++artAnimation;
    $('artPanel').innerHTML = '';
    $('artRight').innerHTML = '';
    $('attempt').innerHTML = '';
  }
  function learnCard(text, exp = 'neutral') {
    const a = S.alba;
    const div = document.createElement('div'); div.className = 'learn-card';
    div.innerHTML = `<div class="who"><div class="av" style="--c:${a.color}33"><img src="${portrait(a, exp)}" alt=""></div><b>${a.name}</b></div><div class="say">${text}</div>`;
    return div;
  }
  function surfaceThumb(drink, art, size = 130) {
    const c = document.createElement('canvas'); c.width = c.height = size * 2;
    ART.renderSurface(c.getContext('2d'), size * 2, drink, art); return c;
  }

  async function artSession(drink) {
    $('art').classList.add('show');
    drawLayer.classList.add('off');
    ART.renderSurface(sctx, SZ, drink, null);
    while (true) {
      artUI({ title: '라떼 아트', hint: '컵 위에 올릴 그림을 정해요. 템플릿을 고르거나, 직접 그려서 알바생에게 가르칠 수 있어요.' });
      $('artRight').appendChild(learnCard(L('artChoose'), 'delight'));
      const mode = await new Promise(r => {
        const p = $('artPanel');
        p.innerHTML = `<button class="mode-btn" data-m="tpl"><b>템플릿 고르기</b><span>빠르고 무난해요. 팁이 조금 붙어요.</span></button>
          <button class="mode-btn" data-m="once"><b>직접 그리기</b><span>한 번 그려요. 예쁘게 그리면 팁이 커져요.</span></button>
          <button class="mode-btn" data-m="teach"><b>그려서 가르치기</b><span>같은 모양을 3번 그려 알바생에게 가르쳐요.</span></button>`;
        p.querySelectorAll('.mode-btn').forEach(b => b.onclick = () => { SFX.click(); r(b.dataset.m); });
      });
      const res = mode === 'tpl' ? await templateMode(drink) : mode === 'once' ? await drawOnce(drink) : await teachMode(drink);
      if (res) return res;
      ART.renderSurface(sctx, SZ, drink, null);
    }
  }

  let artAnimation = 0;
  async function animateArt(drink, art, ms = 1200) {
    const animation = ++artAnimation;
    const t0 = performance.now();
    await new Promise(r => {
      const step = now => {
        if (animation !== artAnimation) { r(); return; }
        const p = Math.min(1, (now - t0) / ms);
        ART.renderSurface(sctx, SZ, drink, art, { progress: 1 - Math.pow(1 - p, 2) });
        if (p < 1) requestAnimationFrame(step); else r();
      };
      requestAnimationFrame(step);
    });
  }

  async function templateMode(drink) {
    artUI({ title: '템플릿 고르기', hint: '오른쪽에서 모양을 고르면 컵 위에 거품이 올라가요.' });
    let sel = null;
    const right = $('artRight');
    const grid = document.createElement('div'); grid.className = 'opt-grid';
    right.appendChild(grid);
    const choice = new Promise(resolve => {
      for (const t of TEMPLATES) {
        const b = document.createElement('button'); b.className = 'tpl';
        b.appendChild(surfaceThumb(drink, { type: 'template', id: t.id }, 110));
        b.appendChild(document.createTextNode(t.name));
        b.onclick = async () => {
          SFX.click(); sel = t.id; okBtn.disabled = true;
          grid.querySelectorAll('.tpl').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
          SFX.pour();
          await animateArt(drink, { type: 'template', id: t.id }, 900);
          if (sel === t.id && grid.isConnected) okBtn.disabled = false;
        };
        grid.appendChild(b);
      }
      const p = $('artPanel');
      const st = document.createElement('div'); st.className = 'stack'; p.appendChild(st);
      const okBtn = document.createElement('button'); okBtn.className = 'btn green big'; okBtn.textContent = '이걸로 완성!'; okBtn.disabled = true;
      const back = document.createElement('button'); back.className = 'btn light small'; back.textContent = '← 다른 방법 고르기';
      okBtn.onclick = () => { SFX.click(); resolve(sel); };
      back.onclick = () => { SFX.click(); ++artAnimation; resolve(null); };
      st.append(okBtn, back);
    });
    const id = await choice;
    if (!id) return null;
    const art = { type: 'template', id };
    S.art = art; S.artMethod = 'template'; S.artInfo = id;
    SFX.sparkle(); sparkle($('art'), 640, 360, 18);
    right.innerHTML = ''; right.appendChild(learnCard(L('templateLearned', { art: ART_NAMES[id] }), 'delight'));
    $('artPanel').innerHTML = '';
    $('artHint').textContent = `${S.alba.name}이(가) 이 모양을 기억했어요. 다음 주문에서는 맡겨 볼 수 있어요.`.replace(/(.)이\(가\)/, (m, ch) => josa(ch, '이/가'));
    scoreBadge(art);
    await buttons($('artPanel'), [{ label: '손님께 가져가기 →', value: 1, cls: 'big' }]);
    return { art };
  }

  // 그리기 입력
  let strokes = [], drawing = false, drawDrink = null, rafPending = false;
  function redrawStrokes() {
    if (rafPending) return; rafPending = true;
    requestAnimationFrame(() => { rafPending = false; ART.renderSurface(sctx, SZ, drawDrink, { type: 'strokes', strokes }); });
  }
  function toLocal(e) {
    const r = drawLayer.getBoundingClientRect();
    let x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const dx = x - 0.5, dy = y - 0.5, d = Math.hypot(dx, dy), m = 0.46;
    if (d > m) { x = 0.5 + dx / d * m; y = 0.5 + dy / d * m; }
    return [x, y];
  }
  drawLayer.addEventListener('pointerdown', e => {
    if (drawLayer.classList.contains('off')) return;
    drawing = true; drawLayer.setPointerCapture(e.pointerId);
    strokes.push([toLocal(e)]); redrawStrokes();
  });
  drawLayer.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = toLocal(e), s = strokes[strokes.length - 1], l = s[s.length - 1];
    if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.006) { s.push(p); redrawStrokes(); }
  });
  const endDraw = () => { drawing = false; };
  drawLayer.addEventListener('pointerup', endDraw);
  drawLayer.addEventListener('pointercancel', endDraw);

  function attemptDots(n, total) {
    let h = '';
    for (let i = 0; i < 5; i++) h += `<span class="dot ${i < n ? 'on' : ''} ${i >= 3 ? 'extra' : ''}"></span>`;
    $('attempt').innerHTML = `<span class="lbl">${Math.min(n + 1, 5)}번째 그림 &nbsp;` + h + '</span>';
    if (total) $('attempt').innerHTML = `<span class="lbl">보여 준 그림 ${n}장 &nbsp;` + h + '</span>';
  }

  async function teachMode(drink) {
    drawDrink = drink;
    const drawings = [];
    let lastStrokes = null, lastRes = null, lastText = '', lastExp = 'neutral';
    while (true) {
      // 한 장 그리기
      strokes = [];
      ART.renderSurface(sctx, SZ, drink, null);
      artUI({
        title: '직접 그려서 가르치기',
        hint: drawings.length === 0
          ? '컵 위에 마우스나 손가락으로 그림을 그려요. 하트처럼 단순한 모양이 좋아요.'
          : '아까와 같은 모양을 한 번 더 그려 주세요. 비슷하게 그릴수록 알바생이 공통점을 잘 찾아요.'
      });
      attemptDots(drawings.length);
      if (drawings.length) $('artRight').appendChild(learnView(drink, drawings, lastRes, lastText, lastExp));
      else $('artRight').appendChild(learnCard('점장님 그림을 잘 보고 있을게요!'.replace('있을게요!', S.alba.tone === 'da' ? '있겠습니다!' : '있을게요!'), 'neutral'));
      drawLayer.classList.remove('off');
      const act = await new Promise(r => {
        const p = $('artPanel');
        const st = document.createElement('div'); st.className = 'stack'; p.appendChild(st);
        const done = document.createElement('button'); done.className = 'btn green big'; done.textContent = '다 그렸어요';
        const clr = document.createElement('button'); clr.className = 'btn light small'; clr.textContent = '지우고 다시 그리기';
        done.onclick = () => r('done');
        clr.onclick = () => { SFX.click(); strokes = []; ART.renderSurface(sctx, SZ, drink, null); };
        st.append(done, clr);
        if (!drawings.length) { const back = document.createElement('button'); back.className = 'btn light small'; back.textContent = '← 다른 방법 고르기'; back.onclick = () => { SFX.click(); r('back'); }; st.append(back); }
      });
      if (act === 'back') { drawLayer.classList.add('off'); return null; }
      const pts = strokes.reduce((a, s) => a + s.length, 0);
      if (pts < 4) { SFX.wrong(); $('artRight').innerHTML = ''; $('artRight').appendChild(learnCard(L('drawEmpty'), 'sad')); await wait(1300); continue; }
      SFX.click();
      drawLayer.classList.add('off');
      lastStrokes = strokes.map(s => s.slice());
      drawings.push({ strokes: lastStrokes });

      // 알바생이 살펴보기
      const res = LEARN.consensus(drawings);
      const g = LEARN.grade(res.consistency);
      const n = drawings.length;
      attemptDots(n, true);
      let key, exp = 'neutral';
      if (n === 1) key = 'draw1';
      else if (n === 2) { key = g === 'bad' ? 'draw2bad' : 'draw2good'; exp = g === 'bad' ? 'sad' : 'neutral'; }
      else if (n >= 5) { key = 'drawMax'; exp = 'neutral'; }
      else { key = g === 'good' ? 'draw3good' : g === 'ok' ? 'draw3ok' : 'draw3bad'; exp = g === 'good' ? 'delight' : g === 'ok' ? 'neutral' : 'sad'; }
      $('artPanel').innerHTML = ''; $('artRight').innerHTML = '';
      lastRes = res; lastText = L(key); lastExp = exp;
      $('artRight').appendChild(learnView(drink, drawings, res, lastText, exp));
      $('artHint').textContent = n < 3
        ? `${S.alba.name}이(가) 그림들의 위치와 크기를 맞춰 겹쳐 보고 있어요.`.replace(/(.)이\(가\)/, (m, ch) => josa(ch, '이/가'))
        : '많이 겹치는 부분이 알바생이 이해한 모양이 돼요. 그림끼리 비슷할수록 또렷해져요.';

      if (n < 3) {
        await buttons($('artPanel'), [{ label: '한 번 더 그리기', value: 1, cls: 'green big' }]);
        continue;
      }
      const opts = [{ label: '이대로 기억해!', value: 'avg', cls: 'green big' }];
      if (n < 5) opts.push({ label: '한 번 더 그려 줄게', value: 'more', cls: 'light' });
      opts.push({ label: '내 그림 중 하나 고르기', value: 'pick', cls: 'light small' });
      const st = document.createElement('div'); st.className = 'stack'; $('artPanel').appendChild(st);
      const choice = await buttons(st, opts);
      if (choice === 'more') continue;

      let learnedArt;
      if (choice === 'avg') {
        learnedArt = { type: 'grid', grid: res.grid, n: res.n };
        S.artMethod = 'avg'; S.artInfo = n;
        $('artRight').innerHTML = ''; $('artRight').appendChild(learnCard(L('learnedAvg'), 'delight'));
        const v = document.createElement('div'); v.className = 'learn-views'; v.style.marginTop = '12px';
        const f = document.createElement('figure'); f.appendChild(surfaceThumb(drink, learnedArt)); f.append('기억한 모양');
        v.appendChild(f); $('artRight').firstChild.appendChild(v);
      } else {
        const idx = await pickDrawing(drink, drawings);
        learnedArt = { type: 'strokes', strokes: drawings[idx].strokes };
        S.artMethod = 'pick'; S.artInfo = idx + 1;
        $('artRight').innerHTML = ''; $('artRight').appendChild(learnCard(L('learnedPick'), 'delight'));
      }
      S.art = learnedArt;
      SFX.sparkle(); sparkle($('art'), 640, 360, 18);
      // 이번 잔에는 점장이 마지막으로 그린 그림이 올라간다
      const cupArt = choice === 'pick' ? learnedArt : { type: 'strokes', strokes: lastStrokes };
      ART.renderSurface(sctx, SZ, drink, cupArt);
      $('artHint').textContent = '이번 잔에는 점장님 그림이 올라가요. 다음 주문에서는 알바생에게 맡겨 보세요!';
      scoreBadge(cupArt);
      await buttons($('artPanel'), [{ label: '손님께 가져가기 →', value: 1, cls: 'big' }]);
      return { art: cupArt };
    }
  }

  function scoreBadge(art) {
    const sc = LEARN.artScore(art), tip = tipFor(sc);
    $('attempt').innerHTML = `<span class="lbl">아트 점수 ${sc}점 · 팁 +${won(tip)}</span>`;
    return sc;
  }

  // 한 장만 그려서 이번 잔에 올리기(알바생은 배우지 않음)
  async function drawOnce(drink) {
    drawDrink = drink;
    const da = S.alba.tone === 'da';
    while (true) {
      strokes = [];
      ART.renderSurface(sctx, SZ, drink, null);
      artUI({ title: '직접 그리기', hint: '컵 위에 그림을 그려요. 좌우가 반듯하고 알맞은 크기일수록 점수가 높아요.' });
      $('artRight').appendChild(learnCard(da ? '점장님 솜씨를 보겠습니다!' : '점장님 솜씨 구경할게요!', 'delight'));
      drawLayer.classList.remove('off');
      const act = await new Promise(r => {
        const st = document.createElement('div'); st.className = 'stack'; $('artPanel').appendChild(st);
        const done = document.createElement('button'); done.className = 'btn green big'; done.textContent = '다 그렸어요';
        const clr = document.createElement('button'); clr.className = 'btn light small'; clr.textContent = '지우고 다시 그리기';
        const back = document.createElement('button'); back.className = 'btn light small'; back.textContent = '← 다른 방법 고르기';
        done.onclick = () => r('done');
        clr.onclick = () => { SFX.click(); strokes = []; ART.renderSurface(sctx, SZ, drink, null); };
        back.onclick = () => { SFX.click(); r('back'); };
        st.append(done, clr, back);
      });
      if (act === 'back') { drawLayer.classList.add('off'); return null; }
      if (strokes.reduce((a, s) => a + s.length, 0) < 4) { SFX.wrong(); $('artRight').innerHTML = ''; $('artRight').appendChild(learnCard(L('drawEmpty'), 'sad')); await wait(1300); continue; }
      drawLayer.classList.add('off');
      const art = { type: 'strokes', strokes: strokes.map(s => s.slice()) };
      const sc = scoreBadge(art);
      $('artPanel').innerHTML = ''; $('artRight').innerHTML = '';
      const msg = sc >= 80 ? (da ? '훌륭합니다! 손님이 좋아하시겠습니다.' : '우와, 완전 예뻐요! 손님이 좋아하시겠어요.')
        : sc >= 50 ? (da ? '괜찮습니다. 깔끔하군요.' : '괜찮은데요? 귀여워요.')
        : (da ? '조금 삐뚤어졌습니다만… 정성이 보입니다.' : '조금 삐뚤어졌지만… 정성이 느껴져요!');
      $('artRight').appendChild(learnCard(msg, sc >= 50 ? 'delight' : 'sad'));
      SFX.sparkle(); sparkle($('art'), 640, 360, 14);
      await buttons($('artPanel'), [{ label: '손님께 가져가기 →', value: 1, cls: 'big' }]);
      return { art };
    }
  }

  function learnView(drink, drawings, res, text, exp) {
    const card = learnCard(text || '그림을 겹쳐 보는 중…', exp || 'neutral');
    if (res) {
      const v = document.createElement('div'); v.className = 'learn-views';
      const f1 = document.createElement('figure');
      f1.appendChild(surfaceThumb(drink, { type: 'grid', grid: res.grid, n: res.n })); f1.append('이해한 모양');
      const f2 = document.createElement('figure');
      const hc = document.createElement('canvas'); hc.width = hc.height = 260;
      const hg = hc.getContext('2d'); hg.fillStyle = '#3a2617'; hg.beginPath(); hg.arc(130, 130, 130, 0, 6.283); hg.fill();
      hg.imageSmoothingEnabled = true; hg.drawImage(LEARN.heatCanvas(res.grid, res.n), 0, 0, 260, 260);
      f2.appendChild(hc); f2.append('겹쳐 본 모습');
      v.append(f1, f2); card.appendChild(v);
      if (drawings.length >= 2) {
        const pct = Math.round(Math.min(1, res.consistency / 0.6) * 100);
        const m = document.createElement('div');
        m.innerHTML = `<div class="meter"><i style="width:${pct}%"></i></div><div class="meter-label"><span>그림끼리 닮은 정도</span><span>${pct < 34 ? '많이 달라요' : pct < 60 ? '조금 닮았어요' : '많이 닮았어요'}</span></div>`;
        card.appendChild(m);
      }
    }
    const th = document.createElement('div'); th.className = 'thumbs';
    drawings.forEach(d => th.appendChild(surfaceThumb(drink, { type: 'strokes', strokes: d.strokes }, 50)));
    card.appendChild(th);
    return card;
  }

  function pickDrawing(drink, drawings) {
    $('artHint').textContent = '알바생이 기억할 그림 한 장을 골라 주세요.';
    $('artRight').innerHTML = '';
    const card = learnCard(S.alba.tone === 'da' ? '어떤 그림을 기억하면 되겠습니까?' : '어떤 그림을 기억하면 될까요?', 'neutral');
    const th = document.createElement('div'); th.className = 'thumbs pick'; th.style.flexWrap = 'wrap';
    card.appendChild(th); $('artRight').appendChild(card);
    return new Promise(r => drawings.forEach((d, i) => {
      const c = surfaceThumb(drink, { type: 'strokes', strokes: d.strokes }, 86);
      c.onclick = () => { SFX.click(); r(i); };
      th.appendChild(c);
    }));
  }

  // ---------- 손님에게 낸 컵(옆에서 비스듬히 본 모습) ----------
  function drawServed(cv, drink, art) {
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    g.save(); g.scale(cv.width / 400, cv.height / 360);
    g.drawImage(ART.img('assets/props/cup_side.png'), 0, 0, 400, 360);
    const sc = document.createElement('canvas'); sc.width = sc.height = 320;
    ART.renderSurface(sc.getContext('2d'), 320, drink, art);
    const H = CUP.high, R = CUP.rim;
    g.beginPath(); g.ellipse(R[0], R[1], R[2] - 4, R[3] - 4, 0, 0, Math.PI * 2); g.clip();
    g.beginPath(); g.ellipse(H[0], H[1], H[2], H[3], 0, 0, Math.PI * 2); g.clip();
    g.drawImage(sc, H[0] - H[2], H[1] - H[3], H[2] * 2, H[3] * 2);
    g.restore();
  }

  // ---------- 결과 ----------
  function showResult() {
    const r = $('result');
    const myCount = S.orders.filter(o => o.by === 'me').length, albaCount = S.orders.length - myCount;
    const priceSum = S.orders.reduce((a, o) => a + o.price, 0), tipSum = S.orders.reduce((a, o) => a + o.tip, 0);
    const arts = S.orders.filter(o => o.art), avgScore = arts.length ? Math.round(arts.reduce((a, o) => a + o.score, 0) / arts.length) : 0;
    const recipeNames = Object.keys(S.recipes).map(id => DRINKS.find(d => d.id === id).name).join(', ');
    let artText;
    if (S.artMethod === 'avg') artText = `같은 모양을 ${S.artInfo}번 보여 주자, ${S.alba.name}은(는) 그림들의 위치와 크기를 맞춰 겹친 뒤 많이 겹치는 부분을 대표 모양으로 삼았어요. 예시가 서로 비슷할수록 결과가 또렷해져요.`;
    else if (S.artMethod === 'pick') artText = `여러 그림 중 점장님이 고른 ${S.artInfo}번째 그림을 그대로 기억했어요. 공통점을 찾은 게 아니라, 한 장을 외운 거예요.`;
    else if (S.artMethod === 'template') artText = `준비된 ${ART_NAMES[S.artInfo]} 모양을 그대로 기억했어요. 직접 그려서 가르치면, 여러 예시에서 공통점을 찾는 모습을 볼 수 있어요.`;
    else artText = '아직 그림을 배우지 않았어요. 알바생이 그림 없이 낸 잔은 팁을 받지 못해요.';
    artText = artText.replace(/(\S)은\(는\)/, (m, ch) => josa(ch, '은/는'));
    r.innerHTML = `<div class="result-card">
      <h2>${S.day}일차 영업 끝!</h2>
      <div class="result-money">${won(S.money)}</div>
      <div class="result-break"><span>음료값 <b>${won(priceSum)}</b></span><span>팁 <b>${won(tipSum)}</b></span><span>평균 아트 점수 <b>${avgScore}점</b></span>${S.day > 1 ? `<span>누적 <b>${won(S.totalMoney)}</b></span>` : ''}</div>
      <p class="sub">${S.orders.length}잔 판매 · 점장님 ${myCount}잔, ${S.alba.name} ${albaCount}잔</p>
      <div class="result-cups" id="resultCups"></div>
      <div class="result-grid">
        <section><h4>레시피는 이렇게 배웠어요</h4><p>점장님이 넣은 재료 순서를 수첩에 그대로 적어 두고, 다음 잔에서 그 순서를 따라 했어요. 배운 음료: <b>${recipeNames || '없음'}</b>. 손은 느리지만, 배울수록 맡길 수 있는 음료가 늘어나요.</p></section>
        <section><h4>그림은 이렇게 배웠어요</h4><p>${artText}</p></section>
      </div>
      <div class="result-btns" id="resultBtns"></div>
    </div>`;
    const cups = $('resultCups');
    S.orders.slice(-5).forEach(o => {
      const f = document.createElement('figure'); const c = document.createElement('canvas'); c.width = 400; c.height = 360;
      drawServed(c, o.drink, o.art); f.appendChild(c);
      f.append(`${o.drink.name} · ${o.by === 'me' ? '점장님' : S.alba.name}`);
      cups.appendChild(f);
    });
    r.classList.add('show');
    buttons($('resultBtns'), [
      { label: '다음 날 영업하기', value: 'next', cls: 'green' },
      { label: '처음으로', value: 'home', cls: 'light' }
    ]).then(async v => {
      r.classList.remove('show');
      if (v === 'next') {
        S.day++; S.shift = null; S.workerReceipt = null; updateWorkerPanel(); updateClock();
        await say(S.alba, L('nextDay'), 'delight');
        hideTalk();
        runDay();
      } else { S.shift = null; S.workerReceipt = null; updateWorkerPanel(); await go('title'); document.querySelectorAll('.card').forEach(c => c.classList.remove('sel')); $('btnPick').disabled = true; }
    });
  }

  // ---------- 시작 ----------
  // 원화 미리 불러오기
  for (const c of CHARACTERS) for (const e of ['neutral', 'delight', 'sad']) { const im = new Image(); im.src = portrait(c, e); }
  ['assets/props/cup_side.png', 'assets/props/cup_top.png'].forEach(ART.img);
  buildIngredients();
  initTitle();
  initSelect();
})();

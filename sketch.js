/*
 * 數位生活安全探險隊｜p5.js 核心程式
 * 這個檔案同時處理：題庫、遊戲狀態、HTML DOM 互動、p5.js 幾何插圖與 Web Audio 提示音。
 * 請避免使用 round、random 等 p5.js 內建函式名稱作為變數名稱。
 */

const GOALS = [
  { id: "phishing", short: "可疑訊息", name: "辨識可疑訊息" },
  { id: "password", short: "安全密碼", name: "建立安全密碼" },
  { id: "privacy", short: "個資保護", name: "保護個人資料" },
  { id: "netiquette", short: "網路禮儀", name: "展現網路禮儀" }
];

// 每題都包含 id、goal、visual、prompt、options、answer（正確選項索引）與 explain。
const QUESTIONS = [
  {
    id: "signal-01", goal: "phishing", visual: "phish", hint: "紅色警示標籤通常不是裝飾。",
    prompt: "你收到一則訊息：「恭喜中獎！今天內點連結領取遊戲點數！」你會怎麼做？",
    options: ["先不點連結，找大人或官方網站確認", "趕快輸入帳號，免得獎品消失", "轉傳給同學，大家一起領"], answer: 0,
    explain: "突然出現的中獎訊息、催你立刻行動的語氣，都是可疑線索。先停下來查證。"
  },
  {
    id: "signal-02", goal: "phishing", visual: "phish", hint: "看看寄件者和網址是不是怪怪的。",
    prompt: "遊戲客服傳來私訊，要你提供密碼才能解除「違規警告」。最安全的回應是？",
    options: ["把密碼傳給客服，證明自己不是壞人", "不提供密碼，改從遊戲的官方支援入口查詢", "請朋友代替自己把密碼傳出去"], answer: 1,
    explain: "真正的客服不會向你索取密碼。遇到警告先離開私訊，從官方 App 或網站自行找支援。"
  },
  {
    id: "lock-01", goal: "password", visual: "lock", hint: "安全密碼要像一把只有你知道的鎖。",
    prompt: "小隊要替新帳號設定密碼，哪一個選擇最安全？",
    options: ["12345678，最容易記", "自己的生日加上名字", "由不同字詞、數字和符號組成的長密碼"], answer: 2,
    explain: "密碼越長越難猜，也不要使用生日、姓名等容易被知道的資訊。每個重要帳號最好使用不同密碼。"
  },
  {
    id: "lock-02", goal: "password", visual: "lock", hint: "密碼是秘密，不是交換卡片。",
    prompt: "同學說：「把你的遊戲密碼給我，我幫你升級角色！」你會？",
    options: ["不分享密碼，請他用自己的帳號一起玩", "只給一次，玩完再改回來", "先問他能不能保密，再把密碼給他"], answer: 0,
    explain: "任何人都不應該要求你的密碼。保護帳號的第一步，就是把密碼留給自己。"
  },
  {
    id: "shield-01", goal: "privacy", visual: "shield", hint: "分享前想一想：這是必要的資料嗎？",
    prompt: "社群活動要你公開貼出「姓名、學校、每天放學時間」，你會怎麼做？",
    options: ["全部公開，這樣比較容易交到朋友", "只提供活動必要資訊，其他先詢問可信任的大人", "請同學幫忙公開，自己不用負責"], answer: 1,
    explain: "姓名、學校和固定行程可能讓陌生人掌握你的生活。非必要的個資不要公開。"
  },
  {
    id: "shield-02", goal: "privacy", visual: "shield", hint: "照片裡也可能藏著地址或校服等線索。",
    prompt: "你想分享家裡附近的照片，發文前最該先檢查什麼？",
    options: ["照片有沒有露出地址、名牌或可辨識的地點", "濾鏡顏色夠不夠酷", "有沒有標記越多朋友"], answer: 0,
    explain: "照片可能透露住家、學校或行程。發出前先檢查背景，必要時裁切或不要公開。"
  },
  {
    id: "chat-01", goal: "netiquette", visual: "chat", hint: "螢幕另一邊也是真實的人。",
    prompt: "小組聊天室有人答錯問題，其他人開始用綽號嘲笑他。你可以怎麼做？",
    options: ["跟著貼笑臉，讓聊天室更熱鬧", "私下提醒朋友，並用友善的話鼓勵對方", "截圖轉發到另一個群組"], answer: 1,
    explain: "網路上的話也會讓人受傷。不要轉傳嘲笑內容，可以停止起鬨並給對方支持。"
  },
  {
    id: "chat-02", goal: "netiquette", visual: "chat", hint: "發送前讀一遍，讓語氣更清楚也更友善。",
    prompt: "你不同意同學的遊戲策略，哪一句最有網路禮貌？",
    options: ["你怎麼這麼笨，別玩了！", "我有不同想法，我們要不要一起試試另一個方法？", "我把你踢出去，大家都聽我的。"], answer: 1,
    explain: "表達不同意見時，說明自己的想法並邀請討論，比貼標籤或命令別人更尊重。"
  }
];

let appState = "start";
let activeQueue = [];
let activePosition = 0;
let activeRecords = [];
let displayedOptions = [];
let hasAnswered = false;
let soundEnabled = true;
let audioContext = null;
let audioReady = false;
let mainRound = true;
let canvasHostId = "canvas-host";
let visualCanvas = null;
let animationSeed = 0;
let resizeTimer = null;
let interfaceBound = false;

const byId = (id) => document.getElementById(id);

function setup() {
  const host = byId(canvasHostId);
  const canvasWidth = host ? Math.max(host.clientWidth || 0, 320) : 800;
  const canvasHeight = host ? Math.max(host.clientHeight || 0, 260) : 340;
  visualCanvas = createCanvas(canvasWidth, canvasHeight);
  if (host) visualCanvas.parent(host);
  visualCanvas.addClass("p5-canvas");
  textFont("sans-serif");
  bindInterface();
  updateScreens();
}

function draw() {
  if (!visualCanvas) return;
  clear();
  drawBackdrop();
  if (appState === "start") drawStartIllustration();
  if (appState === "quiz") {
    const question = QUESTIONS[activeQueue[activePosition]];
    if (question) drawQuestionIllustration(question);
  }
  if (appState === "result") drawResultIllustration();
}

function resizeActiveCanvas() {
  if (!visualCanvas) return;
  const currentHost = byId(canvasHostId);
  if (!currentHost) return;
  resizeCanvas(Math.max(currentHost.clientWidth || 0, 320), Math.max(currentHost.clientHeight || 0, 220));
}

function scheduleCanvasResize() {
  if (resizeTimer) window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    resizeTimer = null;
    resizeActiveCanvas();
  }, 120);
}

function windowResized() {
  // 延遲尺寸調整，避免拖曳視窗時連續重繪造成卡頓。
  scheduleCanvasResize();
}

function bindClick(id, handler) {
  const element = byId(id);
  if (element) element.addEventListener("click", handler);
}

function bindInterface() {
  if (interfaceBound) return;
  interfaceBound = true;
  bindClick("start-btn", startGame);
  bindClick("next-btn", goToNextQuestion);
  bindClick("restart-btn", startGame);
  bindClick("retry-btn", startRetry);
  bindClick("home-btn", goHome);
  bindClick("brand-home", (event) => { event.preventDefault(); goHome(); });
  bindClick("sound-toggle", toggleSound);
}

function setText(id, value) {
  const element = byId(id);
  if (element) element.textContent = String(value);
}

function setHidden(id, hidden) {
  const element = byId(id);
  if (element) element.hidden = Boolean(hidden);
}

function setWidth(id, percentage) {
  const element = byId(id);
  if (element) element.style.width = `${percentage}%`;
}

function ensureAudio() {
  if (!audioContext) {
    const AudioConstructor = window.AudioContext || window.webkitAudioContext;
    if (AudioConstructor) audioContext = new AudioConstructor();
  }
  if (audioContext && audioContext.state === "suspended") audioContext.resume();
  audioReady = Boolean(audioContext);
}

function tone(frequency, duration, delay = 0, wave = "sine", volume = 0.045) {
  if (!soundEnabled || !audioReady || !audioContext) return;
  const startAt = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

function playFeedbackSound(isCorrect) {
  if (isCorrect) {
    tone(520, 0.13, 0, "sine", 0.04);
    tone(780, 0.17, 0.12, "sine", 0.045);
  } else {
    tone(190, 0.17, 0, "triangle", 0.045);
    tone(135, 0.2, 0.14, "triangle", 0.038);
  }
}

function toggleSound() {
  ensureAudio();
  soundEnabled = !soundEnabled;
  const control = byId("sound-toggle");
  if (control) {
    control.setAttribute("aria-pressed", String(soundEnabled));
    control.setAttribute("aria-label", soundEnabled ? "關閉提示音" : "開啟提示音");
    control.innerHTML = soundEnabled ? "🔊 <span>提示音開</span>" : "🔇 <span>提示音關</span>";
  }
  if (soundEnabled) tone(660, 0.1, 0, "sine", 0.035);
}

function startGame() {
  ensureAudio();
  if (soundEnabled) tone(660, 0.1, 0, "sine", 0.035);
  mainRound = true;
  startRound(QUESTIONS.map((_, index) => index));
}

function startRetry() {
  const wrongIndexes = activeRecords.filter((record) => !record.correct).map((record) => record.questionIndex);
  const uniqueWrong = [...new Set(wrongIndexes)];
  if (uniqueWrong.length === 0) return;
  ensureAudio();
  mainRound = false;
  startRound(uniqueWrong);
}

function startRound(questionIndexes) {
  activeQueue = [...questionIndexes];
  activePosition = 0;
  activeRecords = [];
  displayedOptions = [];
  hasAnswered = false;
  appState = "quiz";
  updateScreens();
  renderQuestion();
}

function goHome() {
  appState = "start";
  activeQueue = [];
  activePosition = 0;
  activeRecords = [];
  hasAnswered = false;
  mainRound = true;
  updateScreens();
}

function updateScreens() {
  setHidden("start-screen", appState !== "start");
  setHidden("quiz-screen", appState !== "quiz");
  setHidden("result-screen", appState !== "result");
  if (appState === "start") switchCanvasHost("canvas-host");
  if (appState === "quiz") switchCanvasHost("quiz-canvas");
  if (appState === "result") switchCanvasHost("result-canvas");
}

// p5 canvas 必須在可見的視覺區塊內，並且不蓋住 DOM 按鈕。
function switchCanvasHost(targetId) {
  const target = byId(targetId);
  if (!target || !visualCanvas) return;
  visualCanvas.parent(target);
  canvasHostId = targetId;
  scheduleCanvasResize();
}

function renderQuestion() {
  const question = QUESTIONS[activeQueue[activePosition]];
  if (!question) return;
  hasAnswered = false;
  animationSeed += 1;
  displayedOptions = shuffleCopy(question.options);
  setText("mode-label", mainRound ? "SAFE NET TRAINING" : "WRONG CLUE REPLAY");
  setText("progress-text", `${mainRound ? "第" : "再練・第"} ${activePosition + 1} / ${activeQueue.length} 題`);
  setText("status-text", "先觀察線索，再做選擇");
  setText("score-text", activeRecords.filter((record) => record.correct).length);
  setWidth("progress-fill", (activePosition / activeQueue.length) * 100);
  setText("question-number", `任務 ${String(activePosition + 1).padStart(2, "0")}`);
  setText("goal-label", getGoal(question.goal).name);
  setText("question-text", question.prompt);
  setText("visual-hint", question.hint);
  setHidden("feedback-box", true);
  const feedback = byId("feedback-box");
  if (feedback) feedback.classList.remove("wrong");
  setHidden("next-btn", true);
  renderOptions(question);
  updateScreens();
}

function shuffleCopy(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function renderOptions(question) {
  const container = byId("option-grid");
  if (!container) return;
  container.replaceChildren();
  const letters = ["A", "B", "C"];
  displayedOptions.forEach((optionText, optionIndex) => {
    const button = document.createElement("button");
    const letter = document.createElement("span");
    const label = document.createElement("span");
    button.type = "button";
    button.className = "option-btn";
    button.dataset.optionIndex = String(optionIndex);
    button.setAttribute("aria-label", `${letters[optionIndex]}：${optionText}`);
    letter.className = "option-letter";
    letter.textContent = letters[optionIndex];
    label.textContent = optionText;
    button.append(letter, label);
    button.addEventListener("click", () => chooseAnswer(optionIndex));
    container.appendChild(button);
  });
}

function chooseAnswer(selectedDisplayIndex) {
  if (hasAnswered) return;
  const question = QUESTIONS[activeQueue[activePosition]];
  const selectedText = displayedOptions[selectedDisplayIndex];
  const correct = selectedText === question.options[question.answer];
  hasAnswered = true;
  activeRecords.push({ questionIndex: activeQueue[activePosition], selectedText, correct });
  document.querySelectorAll(".option-btn").forEach((button) => {
    const buttonIndex = Number(button.dataset.optionIndex);
    const optionText = displayedOptions[buttonIndex];
    button.disabled = true;
    if (optionText === question.options[question.answer]) button.classList.add("correct");
    else if (buttonIndex === selectedDisplayIndex && !correct) button.classList.add("incorrect");
    else button.classList.add("dimmed");
  });
  const feedback = byId("feedback-box");
  if (feedback) {
    feedback.hidden = false;
    feedback.classList.toggle("wrong", !correct);
  }
  setText("feedback-icon", correct ? "✓" : "!");
  setText("feedback-title", correct ? "答對了！線索掌握得很好" : "需要再想想，這題是重要線索");
  setText("feedback-answer", `正確答案：${question.options[question.answer]}`);
  setText("feedback-explain", question.explain);
  setText("status-text", correct ? "判斷成功！收集到一格安全能量" : "記住這個線索，下一次會更穩");
  setText("score-text", activeRecords.filter((record) => record.correct).length);
  setWidth("progress-fill", ((activePosition + 1) / activeQueue.length) * 100);
  setHidden("next-btn", false);
  setText("next-btn", activePosition === activeQueue.length - 1 ? "查看任務報告 →" : "下一個任務 →");
  playFeedbackSound(correct);
}

function goToNextQuestion() {
  if (!hasAnswered) return;
  if (activePosition < activeQueue.length - 1) {
    activePosition += 1;
    renderQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  appState = "result";
  updateScreens();
  const correctCount = activeRecords.filter((record) => record.correct).length;
  const totalCount = activeQueue.length;
  const score = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;
  setText("result-title", mainRound ? "探險結果" : "錯題再練完成");
  setText("result-score", score);
  setText("result-count", `答對 ${correctCount} / ${totalCount} 題`);
  setText("result-message", getEncouragement(score, mainRound));
  setText("result-note", mainRound ? "這次任務的技能分布" : "針對剛才的錯題重新檢查");
  const wrongCount = activeRecords.filter((record) => !record.correct).length;
  setText("retry-count", wrongCount);
  setHidden("retry-btn", wrongCount === 0);
  setHidden("no-wrong-message", wrongCount !== 0);
  renderGoalStats();
}

function getEncouragement(score, isMainRound) {
  if (!isMainRound && score === 100) return "全數破解！你已經把剛才的線索變成自己的安全技能。";
  if (score === 100) return "全數破解！你已經準備好成為可靠的數位生活守門員。";
  if (score >= 75) return "很棒的判斷力！再把橘色的技能條練滿，你會更有底氣。";
  if (score >= 50) return "你已經找到一半以上的線索，錯題再練會幫你建立更穩的反應。";
  return "每個錯誤都是一張新地圖，看看解說，再出發一次就會更接近答案。";
}

function renderGoalStats() {
  const container = byId("goal-stats");
  if (!container) return;
  container.replaceChildren();
  GOALS.forEach((goal) => {
    const goalRecords = activeRecords.filter((record) => {
      const question = QUESTIONS[record.questionIndex];
      return question && question.goal === goal.id;
    });
    const correct = goalRecords.filter((record) => record.correct).length;
    const total = goalRecords.length;
    const percentage = total ? Math.round((correct / total) * 100) : 0;
    const stat = document.createElement("div");
    const name = document.createElement("div");
    const track = document.createElement("div");
    const bar = document.createElement("div");
    const score = document.createElement("div");
    stat.className = "goal-stat";
    name.className = "goal-stat-name";
    name.textContent = goal.name;
    track.className = "stat-track";
    track.setAttribute("aria-label", `${goal.name} ${percentage}%`);
    bar.className = `stat-bar${percentage >= 75 ? " high" : ""}`;
    bar.style.width = `${percentage}%`;
    score.className = "goal-stat-score";
    score.textContent = `${correct} / ${total}`;
    track.appendChild(bar);
    stat.append(name, track, score);
    container.appendChild(stat);
  });
}

function getGoal(goalId) {
  return GOALS.find((goal) => goal.id === goalId) || GOALS[0];
}

// ---------- p5.js 幾何插圖：沒有外部圖片，所有畫面由形狀、線條、文字組成 ----------
function drawBackdrop() {
  noStroke();
  for (let index = 0; index < 32; index += 1) {
    const x = (index * 97 + 31) % width;
    const y = (index * 53 + 19) % height;
    const twinkle = 1.5 + Math.sin(frameCount * 0.025 + index) * 0.7;
    fill(72, 240, 207, 55 + index % 3 * 25);
    circle(x, y, twinkle);
  }
  fill(72, 240, 207, 12);
  ellipse(width * .76, height * .18, width * .58, height * .36);
}

function drawStartIllustration() {
  const t = frameCount * 0.025;
  drawPlanet(width * .8, height * .25, min(width, height) * .2, 0.2);
  drawShield(width * .67, height * .46, 72, 0.9);
  drawLock(width * .38, height * .45, 55, -0.4);
  drawMessageCard(width * .23 + Math.sin(t) * 7, height * .22, 128, 75, "安全提醒", "先查證再點擊");
  drawMessageCard(width * .58 + Math.cos(t * .8) * 8, height * .72, 138, 70, "新任務", "守護個資");
  drawOrbit(width * .47, height * .5, 137, t);
}

function drawQuestionIllustration(question) {
  const t = frameCount * 0.03;
  if (question.visual === "phish") {
    drawMessageCard(width * .3 + Math.sin(t) * 8, height * .27, 188, 105, "陌生訊息", "立即領獎！", true);
    drawWarning(width * .72, height * .46, 49, t);
    drawRadar(width * .5, height * .83, 100, t);
  } else if (question.visual === "lock") {
    drawLock(width * .5, height * .5 + Math.sin(t) * 5, 105, 0);
    drawKeyDots(width * .2, height * .22, t);
    drawOrbit(width * .5, height * .5, 155, -t * .7);
  } else if (question.visual === "shield") {
    drawShield(width * .5, height * .51, 125, t);
    drawDataBits(t);
    drawSpark(width * .77, height * .23, 19, t);
  } else {
    drawChatBubble(width * .32 + Math.sin(t) * 8, height * .32, 174, 92, "我有不同想法");
    drawChatBubble(width * .68 + Math.cos(t * .8) * 7, height * .62, 128, 72, "一起討論？");
    drawHeart(width * .51, height * .25, 20, t);
  }
}

function drawResultIllustration() {
  const t = frameCount * .025;
  drawShield(width * .5, height * .53 + Math.sin(t) * 5, 96, t);
  drawSpark(width * .25, height * .3, 25, t);
  drawSpark(width * .76, height * .3, 20, -t);
  drawConfetti(t);
}

function drawMessageCard(x, y, boxWidth, boxHeight, title, detail, danger = false) {
  push();
  translate(x, y);
  rotate(Math.sin(frameCount * .018 + x) * .025);
  rectMode(CENTER);
  noStroke();
  fill(3, 16, 28, 220);
  rect(0, 0, boxWidth, boxHeight, 16);
  stroke(danger ? color(255, 158, 94, 180) : color(72, 240, 207, 135));
  strokeWeight(2);
  noFill();
  rect(0, 0, boxWidth, boxHeight, 16);
  noStroke();
  fill(danger ? color(255, 158, 94) : color(72, 240, 207));
  textAlign(LEFT, CENTER);
  textSize(11);
  text(title, -boxWidth / 2 + 15, -boxHeight / 2 + 18);
  fill(233, 247, 245);
  textSize(14);
  text(detail, -boxWidth / 2 + 15, 5);
  fill(157, 183, 186, 170);
  textSize(10);
  text("••••••••••", -boxWidth / 2 + 15, boxHeight / 2 - 15);
  pop();
}

function drawLock(x, y, size, angle) {
  push();
  translate(x, y);
  rotate(angle);
  rectMode(CENTER);
  noFill();
  stroke(72, 240, 207, 210);
  strokeWeight(8);
  arc(0, -size * .12, size * .6, size * .65, PI, TWO_PI);
  noStroke();
  fill(18, 92, 108, 240);
  rect(0, size * .16, size * .86, size * .7, 15);
  stroke(72, 240, 207);
  strokeWeight(3);
  noFill();
  rect(0, size * .16, size * .86, size * .7, 15);
  noStroke();
  fill(255, 158, 94);
  circle(0, size * .11, size * .13);
  rect(0, size * .25, size * .06, size * .2, 4);
  pop();
}

function drawShield(x, y, size, phase) {
  push();
  translate(x, y);
  const pulse = 1 + Math.sin(phase + frameCount * .02) * .035;
  scale(pulse);
  noStroke();
  fill(72, 240, 207, 30);
  beginShape();
  vertex(0, -size * .58); vertex(size * .52, -size * .36); vertex(size * .43, size * .27); vertex(0, size * .62); vertex(-size * .43, size * .27); vertex(-size * .52, -size * .36);
  endShape(CLOSE);
  stroke(72, 240, 207); strokeWeight(4); noFill();
  beginShape();
  vertex(0, -size * .46); vertex(size * .4, -size * .29); vertex(size * .32, size * .2); vertex(0, size * .48); vertex(-size * .32, size * .2); vertex(-size * .4, -size * .29);
  endShape(CLOSE);
  noStroke(); fill(72, 240, 207); textAlign(CENTER, CENTER); textSize(size * .45); text("✓", 0, 0);
  pop();
}

function drawWarning(x, y, size, phase) {
  push(); translate(x, y); rotate(Math.sin(phase) * .08); noStroke();
  fill(255, 158, 94); triangle(0, -size, size, size * .75, -size, size * .75);
  fill(7, 21, 37); rectMode(CENTER); rect(0, size * .12, size * .12, size * .52, 5); circle(0, size * .52, size * .12); pop();
}

function drawPlanet(x, y, size, phase) {
  push(); translate(x, y); noStroke(); fill(72, 240, 207, 28); circle(0, 0, size * 1.6); fill(18, 92, 108, 210); circle(0, 0, size); stroke(72, 240, 207, 150); strokeWeight(2); noFill(); ellipse(0, 0, size * 1.65, size * .5); pop();
}

function drawOrbit(x, y, size, phase) {
  push(); translate(x, y); noFill(); stroke(72, 240, 207, 55); strokeWeight(1); ellipse(0, 0, size * 1.5, size * .45); const dotX = Math.cos(phase) * size * .75; const dotY = Math.sin(phase) * size * .22; noStroke(); fill(255, 158, 94); circle(dotX, dotY, 8); pop();
}

function drawRadar(x, y, size, phase) { push(); translate(x, y); noFill(); stroke(72, 240, 207, 80); strokeWeight(2); arc(0, 0, size, size, PI, TWO_PI); arc(0, 0, size * .66, size * .66, PI, TWO_PI); stroke(255, 158, 94); line(0, 0, Math.cos(phase) * size / 2, Math.sin(phase) * size / 2); pop(); }
function drawKeyDots(x, y, phase) { for (let index = 0; index < 5; index += 1) { fill(72, 240, 207, 150 - index * 20); noStroke(); circle(x + index * 24 + Math.sin(phase + index) * 3, y, 8); } }
function drawDataBits(phase) { for (let index = 0; index < 12; index += 1) { const x = (index * 83 + frameCount * (index % 2 ? .15 : -.1)) % (width + 30) - 15; const y = (index * 47) % height; fill(72, 240, 207, 100); rect(x, y, 3, 3, 2); } }
function drawChatBubble(x, y, boxWidth, boxHeight, message) { push(); translate(x, y); noStroke(); fill(18, 92, 108, 235); rectMode(CENTER); rect(0, 0, boxWidth, boxHeight, 20); triangle(-boxWidth * .15, boxHeight / 2, -boxWidth * .3, boxHeight / 2, -boxWidth * .19, boxHeight / 2 + 19); stroke(72, 240, 207, 150); noFill(); rect(0, 0, boxWidth, boxHeight, 20); noStroke(); fill(233, 247, 245); textAlign(CENTER, CENTER); textSize(min(15, boxWidth / 11)); text(message, 0, 0); pop(); }
function drawHeart(x, y, size, phase) { push(); translate(x, y); scale(1 + Math.sin(phase) * .08); noStroke(); fill(255, 109, 118); beginShape(); vertex(0, size); bezierVertex(-size * 1.6, size * .1, -size * 1.1, -size, 0, -size * .35); bezierVertex(size * 1.1, -size, size * 1.6, size * .1, 0, size); endShape(); pop(); }
function drawSpark(x, y, size, phase) { push(); translate(x, y); rotate(phase); noStroke(); fill(255, 158, 94); beginShape(); for (let index = 0; index < 8; index += 1) { const angle = index * PI / 4; const radius = index % 2 === 0 ? size : size * .2; vertex(Math.cos(angle) * radius, Math.sin(angle) * radius); } endShape(CLOSE); pop(); }
function drawConfetti(phase) { for (let index = 0; index < 12; index += 1) { const x = (index * 73 + 20) % width; const y = (index * 31 + frameCount * (1 + index % 3 * .2)) % height; push(); translate(x, y); rotate(phase + index); noStroke(); fill(index % 2 ? 72 : 255, index % 2 ? 240 : 158, index % 2 ? 207 : 94, 180); rectMode(CENTER); rect(0, 0, 7, 16, 3); pop(); } }

const API_BASE_URL = 'http://localhost:6057/api';

const CARD_EMOJIS = {
  1: '🍎',
  2: '🍊',
  3: '🍋',
  4: '🍇',
  5: '🍓',
  6: '🍒',
  7: '🍑',
  8: '🥝',
  9: '🍍',
  10: '🥭',
  11: '🍌',
  12: '🍉'
};

const LEVEL_NAMES = ['第一关', '第二关', '第三关'];

const gameBoard = document.getElementById('gameBoard');
const timerEl = document.getElementById('timer');
const movesEl = document.getElementById('moves');
const matchedEl = document.getElementById('matched');
const currentLevelEl = document.getElementById('currentLevel');
const restartBtn = document.getElementById('restartBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const levelCompleteModal = document.getElementById('levelCompleteModal');
const failModal = document.getElementById('failModal');
const resultModal = document.getElementById('resultModal');
const leaderboardModal = document.getElementById('leaderboardModal');
const levelCompleteTitle = document.getElementById('levelCompleteTitle');
const levelTimeEl = document.getElementById('levelTime');
const levelMovesEl = document.getElementById('levelMoves');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const failLevelEl = document.getElementById('failLevel');
const showResultBtn = document.getElementById('showResultBtn');
const resultTitle = document.getElementById('resultTitle');
const totalTimeEl = document.getElementById('totalTime');
const passedLevelsEl = document.getElementById('passedLevels');
const levelResultsEl = document.getElementById('levelResults');
const playerNameInput = document.getElementById('playerName');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const leaderboardList = document.getElementById('leaderboardList');

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timer = null;
let remainingTime = 0;
let currentLevel = 1;
let currentCardPairs = 6;
let currentMaxTime = 60;
let gameStarted = false;
let isProcessing = false;
let levelResults = [];
let challengeStartTime = null;
let challengeEnded = false;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateLevelProgressUI() {
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`levelDot${i}`);
    dot.classList.remove('active', 'completed');
    if (i < currentLevel) {
      dot.classList.add('completed');
    } else if (i === currentLevel) {
      dot.classList.add('active');
    }
  }
  const lines = document.querySelectorAll('.level-line');
  lines.forEach((line, index) => {
    line.classList.remove('completed');
    if (index + 1 < currentLevel) {
      line.classList.add('completed');
    }
  });
}

async function initGame() {
  currentLevel = 1;
  levelResults = [];
  challengeStartTime = Date.now();
  challengeEnded = false;
  startLevel(currentLevel);
}

function resetLevelState() {
  cards = [];
  flippedCards = [];
  matchedPairs = 0;
  moves = 0;
  gameStarted = false;
  isProcessing = false;
  
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  
  movesEl.textContent = '0';
  matchedEl.textContent = `0/${currentCardPairs}`;
  gameBoard.innerHTML = '';
  gameBoard.className = `game-board level-${currentLevel}`;
  timerEl.classList.remove('timer-warning');
}

async function startLevel(level) {
  resetLevelState();
  updateLevelProgressUI();
  
  const data = await fetchShuffledCards(level);
  currentCardPairs = data.cardPairs;
  currentMaxTime = data.maxTime;
  remainingTime = data.maxTime;
  
  currentLevelEl.textContent = LEVEL_NAMES[level - 1];
  matchedEl.textContent = `0/${currentCardPairs}`;
  updateTimerDisplay();
  
  renderCards(data.cards);
}

async function fetchShuffledCards(level) {
  try {
    const response = await fetch(`${API_BASE_URL}/shuffle?level=${level}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取洗牌数据失败:', error);
    const fallbackPairs = level === 1 ? 6 : level === 2 ? 8 : 10;
    const fallbackTime = level === 1 ? 60 : level === 2 ? 90 : 120;
    const fallbackCards = [];
    for (let i = 1; i <= fallbackPairs; i++) {
      fallbackCards.push(i, i);
    }
    for (let i = fallbackCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fallbackCards[i], fallbackCards[j]] = [fallbackCards[j], fallbackCards[i]];
    }
    return {
      cards: fallbackCards,
      level: level,
      cardPairs: fallbackPairs,
      maxTime: fallbackTime,
      name: LEVEL_NAMES[level - 1]
    };
  }
}

function renderCards(cardIds) {
  cardIds.forEach((cardId, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = cardId;
    card.dataset.index = index;
    
    const cardBack = document.createElement('div');
    cardBack.className = 'card-face card-back';
    
    const cardFront = document.createElement('div');
    cardFront.className = 'card-face card-front';
    cardFront.textContent = CARD_EMOJIS[cardId] || '❓';
    
    card.appendChild(cardBack);
    card.appendChild(cardFront);
    
    card.addEventListener('click', () => handleCardClick(card));
    
    gameBoard.appendChild(card);
    cards.push(card);
  });
}

function handleCardClick(card) {
  if (challengeEnded) return;
  if (isProcessing) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;
  if (flippedCards.length >= 2) return;

  if (!gameStarted) {
    startTimer();
    gameStarted = true;
  }

  flipCard(card);
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    moves++;
    movesEl.textContent = moves;
    checkMatch();
  }
}

function flipCard(card) {
  card.classList.add('flipped');
}

function unflipCard(card) {
  card.classList.remove('flipped');
}

function checkMatch() {
  isProcessing = true;
  
  const [card1, card2] = flippedCards;
  const id1 = parseInt(card1.dataset.id);
  const id2 = parseInt(card2.dataset.id);

  if (id1 === id2) {
    setTimeout(() => {
      card1.classList.add('matched');
      card2.classList.add('matched');
      matchedPairs++;
      matchedEl.textContent = `${matchedPairs}/${currentCardPairs}`;
      flippedCards = [];
      isProcessing = false;
      
      if (matchedPairs === currentCardPairs) {
        completeLevel();
      }
    }, 500);
  } else {
    setTimeout(() => {
      unflipCard(card1);
      unflipCard(card2);
      flippedCards = [];
      isProcessing = false;
    }, 1000);
  }
}

function startTimer() {
  timer = setInterval(() => {
    remainingTime--;
    updateTimerDisplay();
    
    if (remainingTime <= 10) {
      timerEl.classList.add('timer-warning');
    }
    
    if (remainingTime <= 0) {
      failLevel();
    }
  }, 1000);
}

function updateTimerDisplay() {
  timerEl.textContent = formatTime(Math.max(0, remainingTime));
}

function completeLevel() {
  clearInterval(timer);
  timer = null;
  
  const usedTime = currentMaxTime - remainingTime;
  levelResults.push({
    level: currentLevel,
    name: LEVEL_NAMES[currentLevel - 1],
    passed: true,
    time: usedTime,
    moves: moves
  });
  
  if (currentLevel >= 3) {
    challengeEnded = true;
    setTimeout(() => {
      showFinalResult();
    }, 500);
  } else {
    levelCompleteTitle.textContent = `🎉 ${LEVEL_NAMES[currentLevel - 1]}通过！`;
    levelTimeEl.textContent = formatTime(usedTime);
    levelMovesEl.textContent = moves;
    setTimeout(() => {
      levelCompleteModal.classList.remove('hidden');
    }, 500);
  }
}

function failLevel() {
  clearInterval(timer);
  timer = null;
  challengeEnded = true;
  
  levelResults.push({
    level: currentLevel,
    name: LEVEL_NAMES[currentLevel - 1],
    passed: false,
    time: currentMaxTime,
    moves: moves
  });
  
  failLevelEl.textContent = `你在${LEVEL_NAMES[currentLevel - 1]}挑战失败`;
  setTimeout(() => {
    failModal.classList.remove('hidden');
  }, 500);
}

function showFinalResult() {
  const totalSeconds = Math.floor((Date.now() - challengeStartTime) / 1000);
  const passedCount = levelResults.filter(r => r.passed).length;
  
  totalTimeEl.textContent = formatTime(totalSeconds);
  passedLevelsEl.textContent = passedCount;
  
  if (passedCount === 3) {
    resultTitle.textContent = '🏆 恭喜全部通关！';
  } else {
    resultTitle.textContent = '📊 挑战结算';
  }
  
  levelResultsEl.innerHTML = '';
  levelResults.forEach(result => {
    const item = document.createElement('div');
    item.className = `level-result-item ${result.passed ? 'passed' : 'failed'}`;
    item.innerHTML = `
      <span class="level-name">${result.name}</span>
      <span class="level-stats">
        <span>用时: ${formatTime(result.time)}</span>
        <span>步数: ${result.moves}</span>
        <span class="status-badge">${result.passed ? '通过' : '失败'}</span>
      </span>
    `;
    levelResultsEl.appendChild(item);
  });
  
  resultModal.classList.remove('hidden');
}

async function submitScore() {
  const playerName = playerNameInput.value.trim() || '匿名玩家';
  const totalSeconds = Math.floor((Date.now() - challengeStartTime) / 1000);

  try {
    const response = await fetch(`${API_BASE_URL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        time: totalSeconds,
        playerName: playerName
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert(`恭喜！你排名第 ${data.rank} 名！`);
      resultModal.classList.add('hidden');
      showLeaderboard();
    }
  } catch (error) {
    console.error('提交成绩失败:', error);
    alert('提交成绩失败，请稍后重试');
  }
}

async function showLeaderboard() {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard`);
    const data = await response.json();
    renderLeaderboard(data.leaderboard);
  } catch (error) {
    console.error('获取排行榜失败:', error);
    leaderboardList.innerHTML = '<li>加载排行榜失败</li>';
  }
  
  leaderboardModal.classList.remove('hidden');
}

function renderLeaderboard(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) {
    leaderboardList.innerHTML = '<li class="empty-message">暂无记录，快来挑战吧！</li>';
    return;
  }

  leaderboardList.innerHTML = '';
  
  leaderboard.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'rank-item';
    
    const timeStr = formatTime(entry.time);
    
    li.innerHTML = `
      <span class="rank-name">
        <span class="rank">#${index + 1}</span>
        <span class="name">${entry.playerName}</span>
      </span>
      <span class="time">${timeStr}</span>
    `;
    
    leaderboardList.appendChild(li);
  });
}

nextLevelBtn.addEventListener('click', () => {
  levelCompleteModal.classList.add('hidden');
  currentLevel++;
  startLevel(currentLevel);
});

showResultBtn.addEventListener('click', () => {
  failModal.classList.add('hidden');
  showFinalResult();
});

restartBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', () => {
  resultModal.classList.add('hidden');
  initGame();
});
leaderboardBtn.addEventListener('click', showLeaderboard);
closeLeaderboardBtn.addEventListener('click', () => {
  leaderboardModal.classList.add('hidden');
});
submitScoreBtn.addEventListener('click', submitScore);

initGame();

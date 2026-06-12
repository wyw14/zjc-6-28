const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 6057;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

const LEVELS = [
  { level: 1, cardPairs: 6, maxTime: 60, name: '第一关' },
  { level: 2, cardPairs: 8, maxTime: 90, name: '第二关' },
  { level: 3, cardPairs: 10, maxTime: 120, name: '第三关' }
];

let leaderboard = [];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

app.get('/api/levels', (req, res) => {
  res.json({ levels: LEVELS });
});

app.get('/api/shuffle', (req, res) => {
  const level = parseInt(req.query.level) || 1;
  const levelConfig = LEVELS.find(l => l.level === level) || LEVELS[0];
  
  const cardIds = [];
  for (let i = 1; i <= levelConfig.cardPairs; i++) {
    cardIds.push(i, i);
  }
  const shuffled = shuffle(cardIds);
  res.json({
    cards: shuffled,
    level: levelConfig.level,
    cardPairs: levelConfig.cardPairs,
    maxTime: levelConfig.maxTime,
    name: levelConfig.name
  });
});

app.post('/api/score', (req, res) => {
  const { time, playerName } = req.body;
  
  if (typeof time !== 'number' || time <= 0) {
    return res.status(400).json({ error: 'Invalid score data' });
  }

  const entry = {
    id: Date.now(),
    time: time,
    playerName: playerName || 'Anonymous',
    date: new Date().toLocaleString('zh-CN')
  };

  leaderboard.push(entry);
  leaderboard.sort((a, b) => a.time - b.time);
  leaderboard = leaderboard.slice(0, 10);

  const rank = leaderboard.findIndex(e => e.id === entry.id) + 1;

  res.json({
    success: true,
    rank: rank,
    leaderboard: leaderboard
  });
});

app.get('/api/leaderboard', (req, res) => {
  res.json({ leaderboard: leaderboard });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();
const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/messages';

app.use(cors());
app.use(express.json());

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() }
});
const Message = mongoose.model('Message', messageSchema);

const scoreSchema = new mongoose.Schema({
  player: { type: String, required: true },
  score: { type: Number, required: true },
  createdAt: { type: Date, default: () => new Date() }
});
const Score = mongoose.model('Score', scoreSchema);

function decodeTriviaValue(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

app.get('/api/trivia', async (req, res) => {
  try {
    const amount = Math.min(20, Math.max(1, Number(req.query.amount) || 5));
    const response = await fetch(
      `https://opentdb.com/api.php?amount=${amount}&type=multiple&encode=url3986`
    );
    const data = await response.json();

    if (data.response_code !== 0 || !Array.isArray(data.results)) {
      return res.status(502).json({ error: 'Unable to load trivia questions' });
    }

    const questions = data.results.map((item, index) => {
      const correctAnswer = decodeTriviaValue(item.correct_answer);
      const choices = shuffleArray([
        ...item.incorrect_answers.map(decodeTriviaValue),
        correctAnswer
      ]);

      return {
        id: `${index}-${Date.now()}`,
        category: decodeTriviaValue(item.category),
        difficulty: decodeTriviaValue(item.difficulty),
        question: decodeTriviaValue(item.question),
        correctAnswer,
        choices,
        wikipediaUrl: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
          correctAnswer
        )}`
      };
    });

    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trivia questions' });
  }
});

app.get('/api/scores', async (req, res) => {
  try {
    const scores = await Score.find().sort({ score: -1, createdAt: 1 }).limit(10);
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load scores' });
  }
});

app.post('/api/scores', async (req, res) => {
  try {
    const { player, score } = req.body;
    if (!player || typeof player !== 'string' || typeof score !== 'number') {
      return res.status(400).json({ error: 'Player and score are required.' });
    }

    const newScore = new Score({ player: player.trim().slice(0, 50), score });
    await newScore.save();
    res.status(201).json(newScore);
  } catch (error) {
    res.status(500).json({ error: 'Unable to save score' });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 }).limit(20);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const message = new Message({ text });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Unable to save message' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => {
      console.log(`Server running on http://0.0.0.0:${port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed', error);
    process.exit(1);
  });

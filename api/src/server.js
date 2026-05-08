import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import Item from './models/Item.js';

const app = express();
const port = process.env.PORT || 4000;
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/trivia';

app.use(cors());
app.use(express.json());

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

function isGenericAnswer(answer) {
  const normalizedAnswer = answer.trim().toLowerCase();
  return (
    /^(true|false|yes|no|[a-d]|[0-9]+)$/.test(normalizedAnswer) ||
    /^[0-9]+(\.[0-9]+)?\s*(%|percent)?$/.test(normalizedAnswer)
  );
}

function buildQuestionSearchTerm(question) {
  const stopWords = new Set([
    'about',
    'after',
    'also',
    'are',
    'before',
    'does',
    'from',
    'have',
    'how',
    'the',
    'into',
    'many',
    'name',
    'of',
    'that',
    'their',
    'there',
    'these',
    'this',
    'was',
    'what',
    'when',
    'where',
    'which',
    'while',
    'with',
    'would'
  ]);

  return question
    .replace(/&quot;|&#039;|&amp;/g, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2)
    .filter((word) => !stopWords.has(word.toLowerCase()))
    .slice(0, 6)
    .join(' ');
}

function buildWikipediaSearchTerm(question, correctAnswer) {
  if (!isGenericAnswer(correctAnswer) && correctAnswer.trim().length > 2) {
    return correctAnswer;
  }

  return buildQuestionSearchTerm(question) || correctAnswer;
}

app.get('/api/trivia', async (req, res) => {
  try {
    const amount = Math.min(20, Math.max(1, Number(req.query.amount) || 5));
    const category = Number(req.query.category);
    const categoryQuery = Number.isInteger(category) && category >= 9 && category <= 32
      ? `&category=${category}`
      : '';
    const response = await fetch(
      `https://opentdb.com/api.php?amount=${amount}${categoryQuery}&type=multiple&encode=url3986`
    );
    const data = await response.json();

    if (data.response_code !== 0 || !Array.isArray(data.results)) {
      return res.status(502).json({ error: 'Unable to load trivia questions' });
    }

    const questions = data.results.map((item, index) => {
      const correctAnswer = decodeTriviaValue(item.correct_answer);
      const question = decodeTriviaValue(item.question);
      const wikipediaSearchTerm = buildWikipediaSearchTerm(question, correctAnswer);
      const choices = shuffleArray([
        ...item.incorrect_answers.map(decodeTriviaValue),
        correctAnswer
      ]);

      return {
        id: `${index}-${Date.now()}`,
        category: decodeTriviaValue(item.category),
        difficulty: decodeTriviaValue(item.difficulty),
        question,
        correctAnswer,
        choices,
        wikipediaUrl: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
          wikipediaSearchTerm
        )}`
      };
    });

    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trivia questions' });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 }).limit(20);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load saved facts' });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const { question, answer, category, difficulty, wikipediaUrl } = req.body;

    if (
      typeof question !== 'string' ||
      typeof answer !== 'string' ||
      typeof category !== 'string' ||
      typeof difficulty !== 'string' ||
      typeof wikipediaUrl !== 'string'
    ) {
      return res.status(400).json({ error: 'Question, answer, category, difficulty, and wikipediaUrl are required.' });
    }

    const item = new Item({
      question: question.trim(),
      answer: answer.trim(),
      category: category.trim(),
      difficulty: difficulty.trim(),
      wikipediaUrl: wikipediaUrl.trim()
    });

    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Unable to save fact' });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({ error: 'Saved fact not found' });
    }

    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: 'Unable to delete saved fact' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API fonctionnelle' });
});

mongoose
  .connect(mongoUrl)
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

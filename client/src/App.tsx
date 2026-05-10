import { useEffect, useState } from 'react';

type Question = {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  wikipediaUrl: string;
};

type SavedItem = {
  _id: string;
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  wikipediaUrl: string;
  createdAt: string;
};

const QUESTION_BATCH_SIZE = 10;
const STAR_STORAGE_KEY = 'trivia-wiki-stars';
const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'General', value: '9' },
  { label: 'Books', value: '10' },
  { label: 'Film', value: '11' },
  { label: 'Music', value: '12' },
  { label: 'Games', value: '15' },
  { label: 'Science', value: '17' },
  { label: 'Computers', value: '18' },
  { label: 'Anime', value: '31' },
  { label: 'Sports', value: '21' },
  { label: 'History', value: '23' }
];

function getStoredStars() {
  const storedStars = Number(window.localStorage.getItem(STAR_STORAGE_KEY));
  return Number.isFinite(storedStars) && storedStars > 0 ? storedStars : 0;
}

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [stars, setStars] = useState(getStoredStars);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [savingItem, setSavingItem] = useState(false);
  const [savedCurrentQuestion, setSavedCurrentQuestion] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuestions();
  }, [selectedCategory]);

  useEffect(() => {
    loadSavedItems();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STAR_STORAGE_KEY, String(stars));
  }, [stars]);

  const fetchQuestions = async () => {
    const params = new URLSearchParams({ amount: String(QUESTION_BATCH_SIZE) });
    if (selectedCategory) {
      params.set('category', selectedCategory);
    }

    const response = await fetch(`/api/trivia?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Could not load questions');
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Trivia response was not a question list');
    }
    return data as Question[];
  };

  const loadQuestions = async (replace = true) => {
    if (replace) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');

    try {
      const data = await fetchQuestions();
      if (replace) {
        setQuestions(data);
        setCurrentIndex(0);
        setSelectedChoice('');
        setShowAnswer(false);
        setSavedCurrentQuestion(false);
      } else {
        setQuestions((current) => [...current, ...data]);
      }
      return true;
    } catch (error) {
      setError('Unable to load trivia questions.');
      return false;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  const handleCategoryChange = (category: string) => {
    if (category !== selectedCategory) {
      setSelectedCategory(category);
    }
  };

  const loadSavedItems = async () => {
    try {
      const response = await fetch('/api/items');
      if (!response.ok) {
        throw new Error('Could not load saved facts');
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setSavedItems(data);
      }
    } catch {
      setError('Unable to load saved facts.');
    }
  };

  const handleSaveCurrentQuestion = async () => {
    if (!currentQuestion || savingItem || savedCurrentQuestion) {
      return;
    }

    setSavingItem(true);
    setError('');

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: currentQuestion.question,
          answer: currentQuestion.correctAnswer,
          category: currentQuestion.category,
          difficulty: currentQuestion.difficulty,
          wikipediaUrl: currentQuestion.wikipediaUrl
        })
      });

      if (!response.ok) {
        throw new Error('Could not save fact');
      }

      const savedItem = (await response.json()) as SavedItem;
      setSavedItems((current) => [savedItem, ...current]);
      setSavedCurrentQuestion(true);
    } catch {
      setError('Unable to save this fact.');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteSavedItem = async (id: string) => {
    if (deletingItemId) {
      return;
    }

    setDeletingItemId(id);
    setError('');

    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Could not delete saved fact');
      }

      setSavedItems((current) => current.filter((item) => item._id !== id));
    } catch {
      setError('Unable to delete this saved fact.');
    } finally {
      setDeletingItemId('');
    }
  };

  const handleAnswer = (choice: string) => {
    if (showAnswer || !currentQuestion) {
      return;
    }
    setSelectedChoice(choice);
    setShowAnswer(true);
    if (choice === currentQuestion.correctAnswer) {
      setStars((current) => current + 1);
    }
  };

  const handleNext = async () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((current) => current + 1);
      setSelectedChoice('');
      setShowAnswer(false);
      setSavedCurrentQuestion(false);
    } else {
      const loaded = await loadQuestions(false);
      if (loaded) {
        setCurrentIndex((current) => current + 1);
        setSelectedChoice('');
        setShowAnswer(false);
        setSavedCurrentQuestion(false);
      }
    }
  };

  const renderQuestionCard = () => {
    if (!currentQuestion) {
      return null;
    }

    return (
      <div className="question-card">
        <div className="question-header">
          <div>
            <strong>{currentQuestion.category}</strong>
            <span>{currentQuestion.difficulty}</span>
          </div>
          <p>{currentQuestion.question}</p>
        </div>

        <div className="choices">
          {currentQuestion.choices.map((choice) => {
            const isCorrect = choice === currentQuestion.correctAnswer;
            const isSelected = choice === selectedChoice;
            const className = showAnswer
              ? isCorrect
                ? 'choice correct'
                : isSelected
                ? 'choice incorrect'
                : 'choice'
              : 'choice';

            return (
              <button
                key={choice}
                type="button"
                className={className}
                onClick={() => handleAnswer(choice)}
                disabled={showAnswer}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {showAnswer && (
          <div className="answer-feedback">
            {selectedChoice === currentQuestion.correctAnswer ? (
              <p className="correct-text">Nice! That answer is correct.</p>
            ) : (
              <p className="incorrect-text">
                Oops — the correct answer was{' '}
                <strong>{currentQuestion.correctAnswer}</strong>.
              </p>
            )}
            <a
              className="wiki-link"
              href={currentQuestion.wikipediaUrl}
              target="_blank"
              rel="noreferrer"
            >
              Learn more on Wikipedia
            </a>
            <button
              type="button"
              className="save-button"
              onClick={handleSaveCurrentQuestion}
              disabled={savingItem || savedCurrentQuestion}
            >
              {savedCurrentQuestion ? 'Saved fact' : savingItem ? 'Saving...' : 'Save fact'}
            </button>
            <button
              type="button"
              className="next-button"
              onClick={handleNext}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Next question'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="app-shell">
      <header>
        <div>
          <h1>Trivium Trivialities </h1>
          <p>
            Answer endless trivia questions and learn more about their answers and subjects.
          </p>
        </div>
        <div className="star-counter" aria-label={`${stars} stars earned`}>
          <span>Stars</span>
          <strong><span aria-hidden="true">★</span>{stars}</strong>
        </div>
      </header>

      {loading ? (
        <p>Loading trivia questions…</p>
      ) : (
        <section className="quiz-area">
          <div className="category-selector" aria-label="Trivia categories">
            {CATEGORIES.map((category) => (
              <button
                key={category.label}
                type="button"
                className={category.value === selectedCategory ? 'active' : ''}
                onClick={() => handleCategoryChange(category.value)}
              >
                {category.label}
              </button>
            ))}
          </div>

          {questions.length === 0 ? (
            <div className="empty-state">
              <p>No questions loaded.</p>
              <button type="button" onClick={() => loadQuestions()}>
                Try again
              </button>
            </div>
          ) : (
            renderQuestionCard()
          )}

          {error && questions.length === 0 && <p className="error">{error}</p>}
        </section>
      )}

      <section className="saved-facts">
        <div className="section-heading">
          <h2>Saved facts</h2>
          <span>{savedItems.length}</span>
        </div>
        {savedItems.length === 0 ? (
          <p className="muted">Save a question after answering it to keep it in MongoDB.</p>
        ) : (
          <ul>
            {savedItems.map((item) => (
              <li key={item._id}>
                <div>
                  <strong>{item.answer}</strong>
                  <span>
                    {item.category} · {item.difficulty}
                  </span>
                </div>
                <p>{item.question}</p>
                <a href={item.wikipediaUrl} target="_blank" rel="noreferrer">
                  Wikipedia
                </a>
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => handleDeleteSavedItem(item._id)}
                  disabled={deletingItemId === item._id}
                >
                  {deletingItemId === item._id ? 'Deleting...' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;

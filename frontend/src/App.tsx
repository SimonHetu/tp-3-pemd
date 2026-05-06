import { FormEvent, useEffect, useState } from 'react';

type Question = {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  wikipediaUrl: string;
};

type ScoreRecord = {
  _id: string;
  player: string;
  score: number;
  createdAt: string;
};

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadQuestions();
    loadLeaderboard();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    setError('');
    setSelectedChoice('');
    setShowAnswer(false);
    setCurrentIndex(0);
    setScore(0);
    setSubmitted(false);

    try {
      const response = await fetch('/api/trivia?amount=6');
      if (!response.ok) {
        throw new Error('Could not load questions');
      }
      const data: Question[] = await response.json();
      setQuestions(data);
    } catch (error) {
      setError('Unable to load trivia questions.');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/scores');
      if (response.ok) {
        const data: ScoreRecord[] = await response.json();
        setLeaderboard(data);
      }
    } catch {
      // ignore leaderboard failures for now
    }
  };

  const currentQuestion = questions[currentIndex];
  const hasFinished = questions.length > 0 && currentIndex >= questions.length;

  const handleAnswer = (choice: string) => {
    if (showAnswer || !currentQuestion) {
      return;
    }
    setSelectedChoice(choice);
    setShowAnswer(true);
    if (choice === currentQuestion.correctAnswer) {
      setScore((current) => current + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((current) => current + 1);
      setSelectedChoice('');
      setShowAnswer(false);
    } else {
      setCurrentIndex(questions.length);
    }
  };

  const handleSaveScore = async (event: FormEvent) => {
    event.preventDefault();
    if (!playerName.trim()) {
      setError('Please enter a player name.');
      return;
    }

    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player: playerName.trim(), score })
      });

      if (!response.ok) {
        throw new Error('Unable to save score.');
      }

      setSubmitted(true);
      setError('');
      await loadLeaderboard();
    } catch {
      setError('Unable to save score.');
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
            <button type="button" className="next-button" onClick={handleNext}>
              {currentIndex + 1 < questions.length ? 'Next question' : 'Finish quiz'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="app-shell">
      <header>
        <h1>Trivia + Wikipedia Explorer</h1>
        <p>
          Answer trivia questions and learn more about the correct answer on Wikipedia.
        </p>
      </header>

      {loading ? (
        <p>Loading trivia questions…</p>
      ) : (
        <section className="quiz-area">
          {questions.length === 0 ? (
            <div className="empty-state">
              <p>No questions loaded.</p>
              <button type="button" onClick={loadQuestions}>
                Try again
              </button>
            </div>
          ) : hasFinished ? (
            <div className="results-card">
              <h2>Quiz complete!</h2>
              <p>
                You answered <strong>{score}</strong> of <strong>{questions.length}</strong>{' '}
                questions correctly.
              </p>
              <form onSubmit={handleSaveScore} className="score-form">
                <label>
                  Save your result:
                  <input
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    placeholder="Your name"
                    maxLength={50}
                  />
                </label>
                <button type="submit" disabled={submitted}>
                  {submitted ? 'Saved' : 'Save score'}
                </button>
              </form>
              <button type="button" className="retry-button" onClick={loadQuestions}>
                Play again
              </button>
            </div>
          ) : (
            renderQuestionCard()
          )}

          {error && <p className="error">{error}</p>}
        </section>
      )}

      <section className="leaderboard">
        <h2>Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p>No scores yet.</p>
        ) : (
          <ol>
            {leaderboard.map((entry) => (
              <li key={entry._id}>
                <span>{entry.player}</span>
                <strong>{entry.score}</strong>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

export default App;

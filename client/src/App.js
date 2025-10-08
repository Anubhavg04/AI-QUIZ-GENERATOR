import React, { useState } from 'react';

function App() {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State to track user's answers: { questionIndex: selectedOptionText }
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);

  // Helper function to check if all questions have been answered
  const allAnswered = quiz && Object.keys(userAnswers).length === quiz.length;

  // Function to calculate the final score
  const calculateScore = (currentQuiz, answers) => {
    let newScore = 0;
    currentQuiz.forEach((q, index) => {
      if (answers[index] === q.answer) {
        newScore++;
      }
    });
    return newScore;
  };

  const generateQuiz = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setQuiz(null);
    setUserAnswers({}); // Reset answers
    setScore(0); // Reset score

    if (!topic || numQuestions < 1 || numQuestions > 10) {
      setError('Please enter a valid topic and question count (1-10).');
      setLoading(false);
      return;
    }

    try {
      // Calls Vercel serverless function
      const response = await fetch('http://localhost:5000/api/generate-quiz', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, numQuestions }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();
      setQuiz(data);
    } catch (err) {
      console.error("Client Error during Quiz Generation:", err);
      setError('Could not generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOptionClick = (questionIndex, selectedOption) => {
      // Prevent changing answer after selection
      if (userAnswers[questionIndex]) return; 

      const newAnswers = {
          ...userAnswers,
          [questionIndex]: selectedOption,
      };

      setUserAnswers(newAnswers);
      
      // Calculate score based on new answers
      const finalScore = calculateScore(quiz, newAnswers);
      setScore(finalScore);
  };

  const getOptionClassName = (qIndex, optionText) => {
      // If the question has been answered
      if (userAnswers[qIndex]) {
          const selected = userAnswers[qIndex] === optionText;
          const isCorrect = optionText === quiz[qIndex].answer;
          
          if (isCorrect) {
              return 'correct-answer';
          } else if (selected) {
              // Only highlight incorrect if it was the user's selected option
              return 'incorrect-answer';
          }
      }
      return '';
  };

  return (
    <>
      <style>
        {`
          @keyframes gradient-shift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          body {
            font-family: 'Inter', sans-serif;
            color: #d0d0d0;
            margin: 0;
            padding: 0;
            /* Deep, professional gray background */
            background-color: #1a1a2e; 
            min-height: 100vh;
          }

          .App {
            text-align: center;
            padding: 0;
            min-height: 100vh;
          }

          .App-header {
            /* Sleek Navbar: Deep Blue to Darker Blue Gradient */
            background: linear-gradient(90deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 15px 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
            /* Fixed position for a true navbar feel */
            position: sticky;
            top: 0;
            z-index: 1000;
            text-align: left;
          }
          
          .App-header h1 {
            margin: 0;
            font-size: 1.8rem;
            letter-spacing: 1px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
            display: inline-block;
          }

          .main-content {
            padding-top: 50px; /* Offset for the fixed header */
          }

          .quiz-form {
            /* Subtle Dark/Glassmorphism container */
            background-color: rgba(255, 255, 255, 0.05);
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(4px);
            display: flex;
            flex-direction: column;
            gap: 15px;
            max-width: 500px; /* Tighter width */
            margin: 0 auto 30px auto;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .quiz-form input {
            padding: 10px;
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.3s, box-shadow 0.3s;
          }
          .quiz-form input::placeholder {
            color: #aaa;
          }
          .quiz-form input:focus {
            border-color: #ff8c00; /* Orange focus color */
            box-shadow: 0 0 5px rgba(255, 140, 0, 0.5);
            outline: none;
          }
          
          .input-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #d0d0d0;
            text-align: left;
          }

          .quiz-form button {
            /* Orange/Yellow Accent Gradient */
            padding: 12px;
            border: none;
            background: linear-gradient(45deg, #ff8c00, #ffc04c);
            color: #1a1a2e; /* Dark text on bright button */
            border-radius: 6px;
            cursor: pointer;
            font-size: 1.1rem;
            font-weight: 700;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
            transition: transform 0.2s, box-shadow 0.2s;
          }

          .quiz-form button:hover:not(:disabled) {
            transform: scale(1.02);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5);
            background: linear-gradient(45deg, #ffc04c, #ff8c00);
          }

          .quiz-form button:disabled {
            background: #333;
            color: #888;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
          }

          .quiz-container {
            text-align: left;
            max-width: 800px;
            margin: 0 auto;
          }

          .question-card {
            background-color: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(4px);
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-left: 5px solid #2a5298; /* Blue accent border */
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            transition: transform 0.3s;
          }
          .question-card:hover {
            transform: translateY(-2px);
          }

          .question-card h3 {
            margin-top: 0;
            color: #fff;
            font-size: 1.2rem;
            border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
            padding-bottom: 10px;
          }

          .question-card ul {
            list-style-type: none;
            padding: 0;
            margin-top: 15px;
          }

          .question-card li {
            background-color: rgba(255, 255, 255, 0.05);
            padding: 10px;
            margin-bottom: 6px; /* Tighter spacing */
            border-radius: 6px;
            font-size: 0.95rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: pointer;
            transition: background-color 0.1s, transform 0.1s;
            color: #d0d0d0;
          }
          
          .question-card li:hover:not(.correct-answer):not(.incorrect-answer) {
            background-color: rgba(255, 255, 255, 0.1);
            transform: scale(1.01);
          }
          
          /* Answer Feedback Styles */
          .correct-answer {
            background-color: #28a745 !important;
            border-color: #28a745 !important;
            color: white !important;
            font-weight: bold;
          }
          .incorrect-answer {
            background-color: #dc3545 !important;
            border-color: #dc3545 !important;
            color: white !important;
            font-weight: bold;
          }

          .question-card p {
            font-size: 1rem;
            padding-top: 10px;
            border-top: 1px dashed rgba(255, 255, 255, 0.1);
            margin-top: 15px;
            color: #d0d0d0;
          }

          .error {
            color: #dc3545;
            background-color: #440000;
            border: 1px solid #dc3545;
            padding: 10px;
            border-radius: 8px;
            font-weight: 600;
            margin: 15px auto;
            max-width: 500px;
          }

          /* Score Card Styles */
          .score-card {
            /* Orange/Yellow gradient for score card */
            background: linear-gradient(135deg, #ff8c00, #ffc04c);
            color: #1a1a2e;
            padding: 20px 30px;
            margin: 20px auto;
            max-width: 500px; 
            border-radius: 12px;
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
            animation: fadeIn 0.5s ease-out;
            margin-bottom: 30px;
          }
          .score-card h2 {
            margin: 0 0 10px 0;
            font-size: 1.8rem;
          }
          .score-card p {
            font-size: 1.2rem;
            font-weight: 500;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
        `}
      </style>

      <div className="App">
        <header className="App-header">
          <h1>AI Quiz Generator</h1>
        </header>
        <main className="main-content">
          <form onSubmit={generateQuiz} className="quiz-form">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic (e.g., 'History of Rome')"
              required
            />
            <div className="input-group">
              <label>Number of Questions:</label>
              <input
                type="number"
                value={numQuestions}
                onChange={(e) => setNumQuestions(e.target.value)}
                min="1"
                max="10"
                required
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Quiz'}
            </button>
          </form>

          {error && <p className="error">{error}</p>}
          
          {/* Display Score Card if all questions are answered */}
          {quiz && allAnswered && (
            <div className="score-card">
              <h2>Quiz Complete!</h2>
              <p>Your Score: {score} / {quiz.length}</p>
            </div>
          )}

          {quiz && (
            <div className="quiz-container">
              {!allAnswered && <h2>Your Quiz ({quiz.length - Object.keys(userAnswers).length} remaining)</h2>}
              {quiz.map((q, index) => (
                <div key={index} className="question-card">
                  <h3>{q.question}</h3>
                  <ul>
                    {q.options.map((option, optIndex) => (
                      <li 
                        key={optIndex} 
                        onClick={() => handleOptionClick(index, option)}
                        className={getOptionClassName(index, option)}
                      >
                        {option}
                      </li>
                    ))}
                  </ul>
                  {/* Show Correct Answer feedback only after selection */}
                  {userAnswers[index] && (
                    <p>
                      <strong>
                        {userAnswers[index] === q.answer ? 'Status: Correct! ' : 'Status: Incorrect. '}
                      </strong>
                      The correct answer is: {q.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default App;

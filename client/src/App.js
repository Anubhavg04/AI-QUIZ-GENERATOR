import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query } from 'firebase/firestore';

// --- Global Variables (Provided by the execution environment) ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-quiz-app';

// Firebase initialization (must be outside the component for single initialization)
let app, db, auth;
if (firebaseConfig) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
    } catch (e) {
        console.error("Firebase initialization failed:", e);
    }
} else {
    console.warn("Firebase configuration not found. Database features disabled.");
}

// Simple unique ID generator (safer than crypto.randomUUID for various environments)
const generateId = () => Math.random().toString(36).substring(2, 9);


function App() {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);

  // Firestore States
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [savedQuizzes, setSavedQuizzes] = useState([]);
  const [dbError, setDbError] = useState(null);

  /* --- EFFECT 1: AUTHENTICATION AND INITIALIZATION --- */
  useEffect(() => {
    if (!auth) {
        setDbError("Database features disabled: Firebase Config missing.");
        setIsAuthReady(true);
        return;
    }
    
    const signIn = async () => {
        try {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }
        } catch (e) {
            console.error("Firebase sign-in failed:", e);
            setDbError(`Authentication failed.`);
        }
    };
    signIn();
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
            setUserId(user.uid);
        } else {
            // Fallback for non-authenticated users if sign-in fails
            setUserId(generateId());
        }
        setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  /* --- EFFECT 2: FIRESTORE DATA FETCHING (Real-time Listener) --- */
  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;

    // Path: /artifacts/{appId}/users/{userId}/quizzes
    const userQuizzesCollectionPath = `artifacts/${appId}/users/${userId}/quizzes`;
    const quizzesRef = collection(db, userQuizzesCollectionPath);
    const q = query(quizzesRef);

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const quizzesData = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            quizzesData.push({ 
                id: doc.id, 
                topic: data.topic, 
                date: data.date, 
                quiz: data.quiz // The array of questions
            });
        });
        setSavedQuizzes(quizzesData);
    }, (error) => {
        console.error("Error fetching saved quizzes:", error);
        setDbError("Failed to fetch quizzes from database.");
    });

    return () => unsubscribeSnapshot();
  }, [isAuthReady, userId]); // Reruns when auth status or userId changes

  // Helper function to check if all questions have been answered
  const allAnswered = quiz && Object.keys(userAnswers).length === quiz.length;

  // Function to calculate the current score
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
    setUserAnswers({});
    setScore(0);

    if (!topic || numQuestions < 1 || numQuestions > 10) {
      setError('Please enter a valid topic and question count (1-10).');
      setLoading(false);
      return;
    }

    try {
      // Calls Vercel serverless function
      const response = await fetch('/api/generate', { 
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
      if (userAnswers[questionIndex]) return; 

      const newAnswers = {
          ...userAnswers,
          [questionIndex]: selectedOption,
      };

      setUserAnswers(newAnswers);
      
      const finalScore = calculateScore(quiz, newAnswers);
      setScore(finalScore);
  };

  const getOptionClassName = (qIndex, optionText) => {
      if (userAnswers[qIndex]) {
          const selected = userAnswers[qIndex] === optionText;
          const isCorrect = optionText === quiz[qIndex].answer;
          
          if (isCorrect) {
              return 'correct-answer';
          } else if (selected) {
              return 'incorrect-answer';
          }
      }
      return '';
  };
  
  /* --- FIRESTORE FUNCTIONS --- */
  const handleSaveQuiz = async () => {
      if (!quiz || !userId || !db) {
          setError("Cannot save quiz: Database not ready or quiz not generated.");
          return;
      }
      
      try {
        const userQuizzesCollectionPath = `artifacts/${appId}/users/${userId}/quizzes`;
        
        await addDoc(collection(db, userQuizzesCollectionPath), {
            topic: topic,
            numQuestions: quiz.length,
            date: new Date().toISOString(),
            quiz: quiz,
        });
        setError('Quiz saved successfully!');
      } catch (e) {
        console.error("Error saving quiz:", e);
        setError("Failed to save quiz to database.");
      }
  };
  
  const handleLoadQuiz = (savedQuiz) => {
      // Load a saved quiz into the active state
      setTopic(savedQuiz.topic);
      setNumQuestions(savedQuiz.quiz.length);
      setQuiz(savedQuiz.quiz);
      setUserAnswers({}); // Clear answers for the new quiz
      setScore(0);
      setError(`Loaded quiz on topic: ${savedQuiz.topic}`);
  };
  
  const statusMessage = isAuthReady 
    ? (dbError ? `DB Error: ${dbError}` : `User ID: ${userId}`)
    : 'Initializing...';


  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          body {
            font-family: 'Inter', sans-serif;
            color: #d0d0d0;
            margin: 0;
            padding: 0;
            background-color: #1a1a2e; 
            min-height: 100vh;
          }

          .App {
            text-align: center;
            padding-bottom: 40px; 
            min-height: 100vh;
          }

          .App-header {
            background: linear-gradient(90deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 15px 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
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
          
          .db-status {
            font-size: 0.8rem;
            color: ${dbError ? '#dc3545' : '#96c93d'};
            margin-top: 5px;
            word-break: break-all;
            padding: 5px;
            background-color: rgba(0,0,0,0.2);
            border-radius: 4px;
          }
          
          .content-wrapper {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 20px;
            max-width: 1400px;
            margin: 0 auto;
            gap: 25px;
          }

          .main-section {
            flex: 2;
            min-width: 400px;
            max-width: 800px;
          }

          .sidebar {
            flex: 1;
            min-width: 280px;
            max-width: 350px;
            background-color: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: sticky;
            top: 80px;
          }
          
          .sidebar h2 {
            margin-top: 0;
            color: #ff8c00;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 10px;
            font-size: 1.5rem;
          }
          
          .saved-quiz-item {
            background-color: rgba(255, 255, 255, 0.08);
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.2s;
            text-align: left;
            border-left: 4px solid #2a5298;
          }

          .saved-quiz-item:hover {
            background-color: rgba(255, 255, 255, 0.15);
            transform: translateX(5px);
          }
          
          .saved-quiz-item p {
            margin: 2px 0;
            font-size: 0.9rem;
          }
          
          .saved-quiz-item .topic {
            font-weight: bold;
            color: #ffc04c;
            font-size: 1rem;
          }
          
          /* Mobile Responsiveness */
          @media (max-width: 1000px) {
            .content-wrapper {
              flex-direction: column;
            }
            .sidebar {
              position: static;
              max-width: 90%;
              width: 100%;
              margin-bottom: 20px;
            }
            .main-section {
              width: 100%;
              min-width: unset;
            }
          }


          .quiz-form {
            background-color: rgba(255, 255, 255, 0.05);
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(4px);
            display: flex;
            flex-direction: column;
            gap: 15px;
            max-width: 500px;
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
          }
          .quiz-form input:focus {
            border-color: #ff8c00; 
            box-shadow: 0 0 5px rgba(255, 140, 0, 0.5);
            outline: none;
          }
          
          .quiz-form button, .save-button {
            padding: 12px;
            border: none;
            background: linear-gradient(45deg, #ff8c00, #ffc04c);
            color: #1a1a2e;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1.1rem;
            font-weight: 700;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
            transition: transform 0.2s;
          }
          
          .save-button {
            margin-top: 15px;
            background: linear-gradient(45deg, #2a5298, #1e3c72);
            color: white;
            font-size: 1rem;
          }

          .quiz-form button:hover:not(:disabled), .save-button:hover:not(:disabled) {
            transform: scale(1.02);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5);
          }
          
          .save-button:hover:not(:disabled) {
            background: linear-gradient(45deg, #1e3c72, #2a5298);
          }

          .quiz-form button:disabled, .save-button:disabled {
            background: #333;
            color: #888;
            cursor: not-allowed;
          }

          .quiz-container {
            text-align: left;
            margin: 0 auto;
          }

          .question-card {
            background-color: rgba(255, 255, 255, 0.05);
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 10px;
            border-left: 5px solid #ff8c00; 
          }

          .question-card h3 {
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
            margin-bottom: 6px;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.1s;
          }
          
          .question-card li:hover:not(.correct-answer):not(.incorrect-answer) {
            background-color: rgba(255, 255, 255, 0.1);
          }
          
          .correct-answer { background-color: #28a745 !important; color: white !important; font-weight: bold; }
          .incorrect-answer { background-color: #dc3545 !important; color: white !important; font-weight: bold; }
          .score-card { 
            background: linear-gradient(135deg, #ff8c00, #ffc04c);
            color: #1a1a2e;
            padding: 20px 30px;
            margin-bottom: 30px; 
            border-radius: 12px;
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
            animation: fadeIn 0.5s ease-out;
          }
        `}
      </style>

      <div className="App">
        <header className="App-header">
          <h1>AI Quiz Generator</h1>
          <div className="db-status">{statusMessage}</div>
        </header>
        
        <div className="content-wrapper">
          
          <aside className="sidebar">
            <h2>Saved Quizzes ({savedQuizzes.length})</h2>
            {isAuthReady ? (
                dbError ? (
                    <p style={{color: '#dc3545'}}>DB Error: {dbError}</p>
                ) : savedQuizzes.length === 0 ? (
                    <p>No quizzes saved yet. Generate and save one!</p>
                ) : (
                    savedQuizzes.map((q) => (
                        <div 
                            key={q.id} 
                            className="saved-quiz-item" 
                            onClick={() => handleLoadQuiz(q)}
                            title={`Click to load: ${q.topic}`}
                        >
                            <p className="topic">{q.topic}</p>
                            <p>Questions: {q.quiz?.length || 'N/A'}</p>
                            <p>Saved: {q.date ? new Date(q.date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    ))
                )
            ) : (
                <p>Connecting to database...</p>
            )}
          </aside>
          
          <section className="main-section">
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
              <button type="submit" disabled={loading || !isAuthReady}>
                {loading ? 'Generating...' : 'Generate Quiz'}
              </button>
            </form>

            {error && <p className="error">{error}</p>}
            
            {quiz && allAnswered && (
              <div className="score-card">
                <h2>Quiz Complete!</h2>
                <p>Your Score: {score} / {quiz.length}</p>
              </div>
            )}
            
            {quiz && isAuthReady && (
                <button 
                    onClick={handleSaveQuiz} 
                    className="save-button" 
                    disabled={!quiz || loading}
                >
                    Save Quiz to Database
                </button>
            )}

            {quiz && (
              <div className="quiz-container">
                <h2>Active Quiz ({quiz.length - Object.keys(userAnswers).length} remaining)</h2>
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
          </section>
        </div>
      </div>
    </>
  );
}

export default App;

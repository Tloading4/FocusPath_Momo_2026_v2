import { useState, useEffect } from 'react';
import { Play, Trophy, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { LevelingService } from '../../services/LevelingService';

/* ---------------------------------
   UTIL: Shuffle Array
---------------------------------- */
const shuffleArray = (array: any[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

/* ---------------------------------
   MINI-GAME DEFINITIONS
---------------------------------- */
const miniGames = [
  {
    id: 'focus-puzzle',
    name: 'Focus Puzzle',
    description: 'Solve visual pattern puzzles',
    icon: '🧩',
    xpReward: 5
  },
  {
    id: 'quick-math',
    name: 'Quick Math',
    description: 'Solve rapid math problems',
    icon: '🔢',
    xpReward: 5
  }
];

interface FocusMiniGameProps {
  onComplete: (xpEarned: number) => void;
  onSkip: () => void;
}

export function FocusMiniGame({ onComplete, onSkip }: FocusMiniGameProps) {
  const { currentUser } = useAuth();

  const [selectedGame, setSelectedGame] = useState(miniGames[0]);
  const [gameState, setGameState] = useState<'selecting' | 'playing' | 'completed'>('selecting');
  const [timeLeft, setTimeLeft] = useState(120);
  const [isRunning, setIsRunning] = useState(false);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const [gameData, setGameData] = useState<any>({});
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string }[]>([]);
  const [dailyCapReached, setDailyCapReached] = useState(false);

  /* ---------------------------------
        DAILY MINI-GAME XP TRACKER
  ---------------------------------- */
  const getMiniGameXpToday = async () => {
    if (!currentUser) return 0;
    const userRef = doc(db, 'userProfiles', currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return 0;

    const data = userSnap.data();
    const lastDate = data.miniGameXpDate;
    const xpToday = data.miniGameXpToday || 0;

    const today = new Date().toDateString();
    return lastDate === today ? xpToday : 0;
  };

  /* ---------------------------------
       SHOW CAP MESSAGE AS SOON AS SESSION ENDS
  ---------------------------------- */
  useEffect(() => {
    if (!isRunning && timeLeft === 0) {
      getMiniGameXpToday().then((xpToday) => {
        if (xpToday >= 20) setDailyCapReached(true);
      });
    }
  }, [isRunning, timeLeft]);

  /* ---------------------------------
      FLOATING EMOJI ANIMATION
  ---------------------------------- */
  const spawnFloatingEmoji = (emoji: string) => {
    const id = Date.now();
    setFloatingEmojis(prev => [...prev, { id, emoji }]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 1200);
  };

  /* ---------------------------------
        TIMER
  ---------------------------------- */
  useEffect(() => {
    let interval: number | null = null;

    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setGameState('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => interval && clearInterval(interval);
  }, [isRunning, timeLeft]);

  /* ---------------------------------
        PUZZLE GENERATOR
  ---------------------------------- */
  const generateFocusPuzzle = () => {
    const patterns = [
      { sequence: ['🔵','🔴','🔵','🔴','?'], answer: '🔵', options: ['🔵','🔴','🟡','🟢'] },
      { sequence: ['🟦','🟩','🟦','🟩','?'], answer: '🟦', options: ['🟦','🟩','🟨','🟪'] },
      { sequence: ['🟡','🟡','🟠','🟡','?'], answer: '🟡', options: ['🟡','🟠','🔴','🟣'] },
      { sequence: ['⭐','⭐⭐','⭐⭐⭐','?'], answer: '⭐⭐⭐⭐', options: ['⭐⭐⭐⭐','⭐⭐','⭐','⭐⭐⭐⭐⭐'] },
      { sequence: ['💧','💧💧','💧💧💧','?'], answer: '💧💧💧💧', options: ['💧💧💧💧','💧','💧💧','💧💧💧💧💧'] },
      { sequence: ['⬜','⬛','⬜','⬛','?'], answer: '⬜', options: ['⬜','⬛','🟪','🟦'] },
      { sequence: ['🔺','🔻','🔺','🔻','?'], answer: '🔺', options: ['🔺','🔻','🔸','🔹'] },
      { sequence: ['↗️','➡️','↘️','⬇️','?'], answer: '↙️', options: ['↙️','⬅️','↖️','⬆️'] },
      { sequence: ['⬅️','⬆️','➡️','⬇️','?'], answer: '⬅️', options: ['⬅️','⬆️','➡️','⬇️'] },
      { sequence: ['1️⃣','2️⃣','3️⃣','?'], answer: '4️⃣', options: ['4️⃣','5️⃣','2️⃣','1️⃣'] },
      { sequence: ['2️⃣','4️⃣','6️⃣','?'], answer: '8️⃣', options: ['8️⃣','6️⃣','4️⃣','1️⃣'] },
      { sequence: ['5️⃣','10️⃣','15️⃣','?'], answer: '20️⃣', options: ['20️⃣','25️⃣','10️⃣','5️⃣'] },
      { sequence: ['🐶','🐱','🐶','🐱','?'], answer: '🐶', options: ['🐶','🐱','🐭','🐹'] },
      { sequence: ['🍎','🍌','🍎','🍌','?'], answer: '🍎', options: ['🍎','🍌','🍇','🍓'] },
      { sequence: ['A','B','A','B','?'], answer: 'A', options: ['A','B','C','D'] },
      { sequence: ['C','C','D','D','?'], answer: 'E', options: ['E','C','D','F'] },
      { sequence: ['⭐','✨','⭐','✨','⭐','?'], answer: '✨', options: ['✨','⭐','💫','🌟'] },
      { sequence: ['🔵','🔵','🔴','🔴','🔵','?'], answer: '🔵', options: ['🔵','🔴','🟡','🟢'] }
    ];

    const puzzle = patterns[Math.floor(Math.random() * patterns.length)];
    return { ...puzzle, options: shuffleArray(puzzle.options) };
  };

  /* ---------------------------------
        ADVANCED MATH GENERATOR
  ---------------------------------- */
  const generateMathProblem = () => {
    const mode = Math.random();

    if (mode < 0.33) {
      const a = Math.floor(Math.random() * 30) + 1;
      const b = Math.floor(Math.random() * 30) + 1;
      const op = Math.random() > 0.5 ? '+' : '-';
      return { a, b, operation: op, answer: op === '+' ? a + b : a - b, question: `${a} ${op} ${b}` };
    }

    if (mode < 0.66) {
      const a = Math.floor(Math.random() * 12) + 1;
      const b = Math.floor(Math.random() * 12) + 1;
      return { a, b, operation: '*', answer: a * b, question: `${a} × ${b}` };
    }

    const b = Math.floor(Math.random() * 10) + 1;
    const result = Math.floor(Math.random() * 10) + 1;
    const a = b * result;

    return { a, b, operation: '/', answer: result, question: `${a} ÷ ${b}` };
  };

  /* ---------------------------------
        INITIALIZE GAME MODE
  ---------------------------------- */
  useEffect(() => {
    if (selectedGame.id === 'focus-puzzle') {
      setGameData({ currentPuzzle: generateFocusPuzzle() });
    } else {
      setGameData({ currentProblem: generateMathProblem(), userAnswer: '' });
    }
  }, [selectedGame]);

  /* ---------------------------------
        START GAME
  ---------------------------------- */
  const startGame = () => {
    setIsRunning(true);
    setGameState('playing');
    setScore(0);
    setStreak(0);
    setDailyCapReached(false);
  };

  /* ---------------------------------
        PUZZLE ANSWER HANDLER
  ---------------------------------- */
  const handlePuzzleAnswer = (option: any, index: number) => {
    const isCorrect = option === gameData.currentPuzzle.answer;

    setSelectedIndex(index);
    setAnswerFeedback(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      setStreak(prev => prev + 1);
      setScore(prev => prev + 20);
      spawnFloatingEmoji('+20');
      if (streak + 1 >= 3) spawnFloatingEmoji('🔥');
    } else {
      setStreak(0);
      setScore(prev => Math.max(0, prev - 10));
      spawnFloatingEmoji('-10');
    }

    setTimeout(() => {
      setAnswerFeedback(null);
      setSelectedIndex(null);
      setGameData({ currentPuzzle: generateFocusPuzzle() });
    }, 500);
  };

  /* ---------------------------------
        MATH HANDLER
  ---------------------------------- */
  const handleMathAnswer = (answer: string) => {
    const userAnswer = parseInt(answer);
    const isCorrect = userAnswer === gameData.currentProblem.answer;

    setAnswerFeedback(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      setStreak(prev => prev + 1);
      setScore(prev => prev + 10);
      spawnFloatingEmoji('+10');
      if (streak + 1 >= 3) spawnFloatingEmoji('🔥');
    } else {
      setStreak(0);
      setScore(prev => Math.max(0, prev - 10));
      spawnFloatingEmoji('-10');
    }

    setTimeout(() => {
      setAnswerFeedback(null);
      setGameData({ currentProblem: generateMathProblem(), userAnswer: '' });
    }, 400);
  };

  /* ---------------------------------
        LOG SESSION
  ---------------------------------- */
  const logMiniGameSession = async (xpEarned: number) => {
    if (!currentUser) return;

    const start = new Date(Date.now() - (120 - timeLeft) * 1000);
    const end = new Date();

    await addDoc(
      collection(db, 'userProfiles', currentUser.uid, 'sessions'),
      {
        sessionType: 'mini-game',
        sessionTypeName: 'Mini Game',
        category: 'mini',
        customTask: selectedGame.name,

        startTime: start,
        endTime: end,
        duration: Math.round((end.getTime() - start.getTime()) / 60000),
        durationSeconds: Math.round((end.getTime() - start.getTime()) / 1000),

        xpEarned,
        completed: timeLeft === 0,
        date: start
      }
    );
  };

  /* ---------------------------------
        COMPLETE SESSION
  ---------------------------------- */
  const handleComplete = async () => {
    const rawXP = selectedGame.xpReward + Math.floor(score / 20);
    const cappedXP = Math.min(rawXP, 20);

    const xpToday = await getMiniGameXpToday();
    const remainingToday = 20 - xpToday;

    const totalXP = Math.max(0, Math.min(cappedXP, remainingToday));

    if (remainingToday <= 0 || totalXP === 0) {
      setDailyCapReached(true);
    }

    if (!currentUser) {
      onComplete(totalXP);
      return;
    }

    try {
      const ref = doc(db, 'userProfiles', currentUser.uid);
      const snap = await getDoc(ref);

      const existingXP = snap.exists() ? snap.data().totalXP || 0 : 0;
      const marketXP = snap.exists() ? snap.data().marketplaceXP || 0 : 0;

      await setDoc(
        ref,
        {
          totalXP: existingXP + totalXP,
          marketplaceXP: marketXP + totalXP,
          level: LevelingService.getLevelFromXP(existingXP + totalXP),
          miniGameXpToday: xpToday + totalXP,
          miniGameXpDate: new Date().toDateString(),
          updatedAt: Date.now()
        },
        { merge: true }
      );

      await logMiniGameSession(totalXP);
      onComplete(totalXP);
    } catch (err) {
      console.error(err);
      onComplete(totalXP);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const progress = ((120 - timeLeft) / 120) * 100;

  /* ---------------------------------
        RENDER UI
  ---------------------------------- */
  return (
    <div className="glass-card rounded-2xl p-8 shadow-2xl relative overflow-hidden text-white">

      {/* FLOATING EMOJIS */}
      <div className="pointer-events-none absolute inset-0">
        {floatingEmojis.map(e => (
          <div
            key={e.id}
            className="floating-emoji text-white"
            style={{
              top: "40%",
              left: "50%",
              transform: "translateX(-50%)",
              animationDuration: "1.2s"
            }}
          >
            {e.emoji}
          </div>
        ))}
      </div>

      {/* SELECT SCREEN */}
      {gameState === 'selecting' && (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Focus Mini Game!</h2>
          <p className="text-gray-300 mb-8">Take a 2-minute brain break and earn XP!</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {miniGames.map(game => (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game)}
                className={`
                  p-6 rounded-xl border-2 transition-all
                  ${
                    selectedGame.id === game.id
                      ? "border-purple-500 bg-purple-600/30"
                      : "border-white/20 bg-white/10 hover:bg-white/20"
                  }
                `}
              >
                <div className="text-4xl mb-3">{game.icon}</div>
                <h3 className="font-bold">{game.name}</h3>
                <p className="text-sm text-gray-300">{game.description}</p>
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={onSkip}
              className="px-6 py-3 bg-gray-400/20 hover:bg-gray-400/30 rounded-xl"
            >
              Skip
            </button>

            <button
              onClick={startGame}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:scale-105 flex gap-2 items-center"
            >
              <Play className="h-5 w-5" /> Start
            </button>
          </div>
        </div>
      )}

      {/* GAME SCREEN */}
      {gameState === 'playing' && (
        <div className="text-center">

          {/* Header */}
          <div className="flex justify-between mb-6">
            <h2 className="text-xl font-bold">{selectedGame.name}</h2>
            <div>
              <div className="text-2xl font-bold">{formatTime(timeLeft)}</div>
              <div className="text-gray-300">Score: {score}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/20 h-2 rounded-full mb-8">
            <div
              className="h-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* PUZZLE MODE */}
          {selectedGame.id === "focus-puzzle" && (
            <div>
              <div className="bg-white/10 p-6 rounded-xl max-w-md mx-auto">
                <div className="text-3xl mb-6">
                  {gameData.currentPuzzle.sequence?.map((s: any, i: number) => (
                    <span key={i}>{s}</span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {gameData.currentPuzzle.options?.map((option: any, i: number) => {
                    const isCorrectAnswer = option === gameData.currentPuzzle.answer;
                    const isSelected = i === selectedIndex;

                    let style = "bg-white/10 border-white/20 hover:bg-white/20";

                    if (answerFeedback === "correct" && isCorrectAnswer) {
                      style = "bg-green-600 border-green-300 scale-105";
                    }

                    if (answerFeedback === "incorrect") {
                      if (isSelected) {
                        style = "bg-red-600 border-red-300 scale-105";
                      } else if (isCorrectAnswer) {
                        style = "bg-green-600 border-green-300 scale-105";
                      } else {
                        style = "opacity-50";
                      }
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handlePuzzleAnswer(option, i)}
                        className={`px-4 py-3 rounded-lg border text-white text-xl transition-all ${style}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* QUICK MATH */}
          {selectedGame.id === "quick-math" && (
            <div>
              <div className="bg-white/10 p-6 rounded-xl max-w-md mx-auto">
                <div className="text-4xl mb-6 font-bold">
                  {gameData.currentProblem.question} = ?
                </div>

                {/* FLASH INPUT */}
                <input
                  type="number"
                  value={gameData.userAnswer || ""}
                  onChange={(e) =>
                    setGameData(prev => ({ ...prev, userAnswer: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleMathAnswer(gameData.userAnswer);
                  }}
                  className={`
                    w-full text-center px-4 py-3 rounded-lg text-xl
                    transition-all border
                    ${
                      answerFeedback === "correct"
                        ? "bg-green-600 border-green-300"
                        : answerFeedback === "incorrect"
                        ? "bg-red-600 border-red-300"
                        : "bg-white/5 border-white/20"
                    }
                  `}
                  placeholder="Your answer"
                />

                {/* FLASH BUTTON */}
                <button
                  onClick={() => handleMathAnswer(gameData.userAnswer)}
                  className={`
                    mt-4 px-6 py-3 rounded-xl text-white font-semibold transition-all border
                    ${
                      answerFeedback === "correct"
                        ? "bg-green-600 border-green-300 scale-105"
                        : answerFeedback === "incorrect"
                        ? "bg-red-600 border-red-300 scale-105"
                        : "bg-green-500/20 border-white/20 hover:bg-green-500/40"
                    }
                  `}
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {/* END BTN */}
          <button
            onClick={() => {
              setIsRunning(false);
              setGameState("completed");
            }}
            className="mt-4 px-6 py-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30"
          >
            End Mini Game
          </button>
        </div>
      )}

      {/* COMPLETED SCREEN */}
      {gameState === "completed" && (
        <div className="text-center fade-in">
          <Trophy className="h-16 w-16 mx-auto mb-6 text-yellow-400 animate-bounce" />
          <h2 className="text-3xl font-bold mb-4">Mini Game Complete!</h2>

          <div className="bg-white/10 p-6 rounded-xl border border-white/20 mb-6">
            <div className="grid grid-cols-2">
              <div>
                <div className="text-2xl font-bold">{score}</div>
                <div className="text-gray-300">Final Score</div>
              </div>

              <div>
                <div className="text-2xl font-bold text-green-300">
                  {timeLeft > 0
                    ? "0 XP"
                    : `+${Math.min(
                        Math.min(selectedGame.xpReward + Math.floor(score / 20), 20),
                        20
                      )} XP`}
                </div>
                <div className="text-gray-300">XP Earned</div>
              </div>
            </div>

            {/* FULL SESSION CAP MESSAGE */}
            {dailyCapReached && (
              <div className="mt-4 bg-red-500/20 border border-red-400/50 p-3 rounded-lg text-red-300 text-sm">
                🔒 You reached your daily mini-game XP limit (20 XP).  
                Come back tomorrow for more XP!
              </div>
            )}
          </div>

          <button
            onClick={handleComplete}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 flex items-center gap-2 mx-auto"
          >
            <CheckCircle className="h-5 w-5" /> Claim XP
          </button>
        </div>
      )}
    </div>
  );
}

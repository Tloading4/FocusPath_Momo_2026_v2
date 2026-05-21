import { useState, useEffect } from 'react';
import { Trophy, CheckCircle, Award, Sparkles } from 'lucide-react';

interface SessionCompletionCelebrationProps {
  isVisible: boolean;
  sessionData: {
    sessionType: string;
    duration: number;
    xpEarned: number;
    completed: boolean;
    focusScore?: number;
    streakDay?: number;
  };
  achievements?: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }>;
  onClose: () => void;
}

const motivationalQuotes = [
  {
    quote: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier",
    category: "persistence"
  },
  {
    quote: "The expert in anything was once a beginner who refused to give up.",
    author: "Helen Hayes",
    category: "growth"
  },
  {
    quote: "Focus is a matter of deciding what things you're not going to do.",
    author: "John Carmack",
    category: "focus"
  },
  {
    quote: "You are never too old to set another goal or to dream a new dream.",
    author: "C.S. Lewis",
    category: "motivation"
  },
  {
    quote: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
    category: "action"
  },
  {
    quote: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson",
    category: "persistence"
  },
  {
    quote: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
    category: "confidence"
  },
  {
    quote: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
    category: "dreams"
  },
  {
    quote: "It is during our darkest moments that we must focus to see the light.",
    author: "Aristotle",
    category: "focus"
  },
  {
    quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
    category: "courage"
  }
];

const sessionTypeMessages = {
  'Easy Focus': [
    "Great start! Every journey begins with a single step.",
    "You're building the foundation of focus mastery!",
    "Small wins lead to big victories!"
  ],
  'Medium Focus': [
    "Excellent focus! You're developing real concentration skills.",
    "30 minutes of pure focus - that's impressive!",
    "You're in the zone and building momentum!"
  ],
  'Hard Focus': [
    "Outstanding dedication! 45 minutes of focus is no small feat.",
    "You're pushing your limits and growing stronger!",
    "This level of focus separates achievers from dreamers!"
  ],
  'Extreme Focus': [
    "Legendary focus! You've achieved something truly remarkable.",
    "60 minutes of pure concentration - you're a focus master!",
    "This is the kind of dedication that changes lives!"
  ]
};

const ConfettiPiece = ({ delay, color, size }: { delay: number; color: string; size: number }) => (
  <div
    className={`absolute w-${size} h-${size} ${color} animate-bounce opacity-80`}
    style={{
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${delay}ms`,
      animationDuration: `${2000 + Math.random() * 1000}ms`,
      transform: `rotate(${Math.random() * 360}deg)`
    }}
  />
);

const AchievementBadge = ({ achievement, delay }: { achievement: any; delay: number }) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-500 to-orange-600';
      case 'epic': return 'from-purple-500 to-pink-600';
      case 'rare': return 'from-blue-500 to-indigo-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div
      className={`bg-gradient-to-r ${getRarityColor(achievement.rarity)} p-4 rounded-2xl border-2 border-white/30 shadow-2xl animate-achievement-unlock`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-center">
        <div className="text-4xl mb-2">{achievement.icon}</div>
        <h4 className="font-bold text-white text-lg mb-1">{achievement.name}</h4>
        <p className="text-white/90 text-sm mb-2">{achievement.description}</p>
        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
          {achievement.rarity}
        </span>
      </div>
    </div>
  );
};

export function SessionCompletionCelebration({ 
  isVisible, 
  sessionData, 
  achievements = [], 
  onClose 
}: SessionCompletionCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(motivationalQuotes[0]);
  const [celebrationPhase, setCelebrationPhase] = useState<'confetti' | 'quote' | 'achievements' | 'summary'>('confetti');

  useEffect(() => {
    if (isVisible && sessionData.completed) {
      // Select appropriate quote based on session type and performance
      let selectedQuote;
      if (sessionData.focusScore && sessionData.focusScore >= 90) {
        selectedQuote = motivationalQuotes.find(q => q.category === 'focus') || motivationalQuotes[0];
      } else if (sessionData.streakDay && sessionData.streakDay >= 7) {
        selectedQuote = motivationalQuotes.find(q => q.category === 'persistence') || motivationalQuotes[0];
      } else {
        selectedQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
      }
      setCurrentQuote(selectedQuote);

      // Start celebration sequence
      setShowConfetti(true);
      setCelebrationPhase('confetti');

      // Phase transitions
      setTimeout(() => setCelebrationPhase('quote'), 1500);
      setTimeout(() => {
        if (achievements.length > 0) {
          setCelebrationPhase('achievements');
          setShowAchievements(true);
        } else {
          setCelebrationPhase('summary');
        }
      }, 4000);
      
      if (achievements.length > 0) {
        setTimeout(() => setCelebrationPhase('summary'), 7000);
      }

      // Auto-close after celebration
      setTimeout(() => {
        setShowConfetti(false);
        setTimeout(onClose, 500);
      }, 10000);
    }
  }, [isVisible, sessionData, achievements, onClose]);

  if (!isVisible || !sessionData.completed) return null;

  const getSessionMessage = () => {
    const messages = sessionTypeMessages[sessionData.sessionType as keyof typeof sessionTypeMessages] || sessionTypeMessages['Medium Focus'];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getPerformanceEmoji = () => {
    if (sessionData.focusScore && sessionData.focusScore >= 95) return '🔥';
    if (sessionData.focusScore && sessionData.focusScore >= 85) return '⭐';
    if (sessionData.focusScore && sessionData.focusScore >= 75) return '💪';
    return '🎯';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <ConfettiPiece
              key={i}
              delay={i * 50}
              color={[
                'bg-yellow-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 
                'bg-pink-400', 'bg-red-400', 'bg-indigo-400', 'bg-orange-400'
              ][i % 8]}
              size={Math.random() > 0.5 ? 2 : 3}
            />
          ))}
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-lg rounded-3xl max-w-2xl w-full border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-white/20 p-8 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-blue-400/10 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce shadow-2xl">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-2 animate-slide-down">
              🎉 Session Complete!
            </h1>
            
            <p className="text-xl text-green-200 animate-fade-in">
              {getSessionMessage()}
            </p>
          </div>
        </div>

        {/* Content based on celebration phase */}
        <div className="p-8">
          {celebrationPhase === 'confetti' && (
            <div className="text-center animate-scale-in">
              <div className="text-8xl mb-6 animate-bounce">
                {getPerformanceEmoji()}
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Amazing Work!
              </h2>
              <p className="text-xl text-gray-300">
                You just completed a {sessionData.sessionType} session!
              </p>
            </div>
          )}

          {celebrationPhase === 'quote' && (
            <div className="text-center animate-slide-up">
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-8 mb-6">
                <div className="text-6xl mb-4">💭</div>
                <blockquote className="text-xl text-white font-medium italic leading-relaxed mb-4">
                  "{currentQuote.quote}"
                </blockquote>
                <cite className="text-gray-300 text-lg">
                  — {currentQuote.author}
                </cite>
              </div>
            </div>
          )}

          {celebrationPhase === 'achievements' && achievements.length > 0 && (
            <div className="animate-slide-up">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                  <Award className="h-8 w-8 text-yellow-400" />
                  New Achievements!
                </h2>
                <p className="text-gray-300">You've unlocked new badges!</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement, index) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    delay={index * 500}
                  />
                ))}
              </div>
            </div>
          )}

          {celebrationPhase === 'summary' && (
            <div className="animate-slide-up">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">Session Summary</h2>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">⏱️</div>
                  <div className="text-2xl font-bold text-white">{sessionData.duration}</div>
                  <div className="text-sm text-gray-300">Minutes</div>
                </div>
                
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">⭐</div>
                  <div className="text-2xl font-bold text-green-400">+{sessionData.xpEarned}</div>
                  <div className="text-sm text-gray-300">XP Earned</div>
                </div>
                
                {sessionData.focusScore && (
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl mb-2">🎯</div>
                    <div className="text-2xl font-bold text-purple-400">{sessionData.focusScore}%</div>
                    <div className="text-sm text-gray-300">Focus Score</div>
                  </div>
                )}
                
                {sessionData.streakDay && (
                  <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl mb-2">🔥</div>
                    <div className="text-2xl font-bold text-orange-400">{sessionData.streakDay}</div>
                    <div className="text-sm text-gray-300">Day Streak</div>
                  </div>
                )}
              </div>

              {/* Performance Message */}
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6 text-center mb-8">
                <div className="text-4xl mb-3">🚀</div>
                <h3 className="text-xl font-bold text-white mb-2">Outstanding Performance!</h3>
                <p className="text-gray-300">
                  {sessionData.focusScore && sessionData.focusScore >= 90 
                    ? "Your focus was exceptional! You're developing incredible concentration skills."
                    : sessionData.focusScore && sessionData.focusScore >= 75
                    ? "Great focus throughout the session! You're building strong habits."
                    : "You completed the session and that's what matters! Consistency beats perfection."
                  }
                </p>
              </div>

              {/* Action Button */}
              <div className="text-center">
                <button
                  onClick={onClose}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 flex items-center gap-3 mx-auto text-lg font-semibold"
                >
                  <CheckCircle className="h-6 w-6" />
                  Continue Your Journey
                  <Sparkles className="h-6 w-6" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {showConfetti && [...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-yellow-400/60 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 100}ms`,
                animationDuration: `${3000 + Math.random() * 2000}ms`,
                fontSize: `${1 + Math.random()}rem`
              }}
            >
              {['✨', '🌟', '💫', '⭐', '🎉', '🎊'][Math.floor(Math.random() * 6)]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
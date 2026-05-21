import { useState, useEffect } from 'react';
import { Quote, Sparkles, X } from 'lucide-react';

interface MotivationalQuote {
  quote: string;
  author: string;
  category: string;
}

interface MotivationalQuoteDisplayProps {
  isVisible: boolean;
  sessionType: string;
  focusScore?: number;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

const motivationalQuotes: MotivationalQuote[] = [
  {
    quote: "The expert in anything was once a beginner who refused to give up.",
    author: "Helen Hayes",
    category: "persistence"
  },
  {
    quote: "Focus is a matter of deciding what things you're not going to do.",
    author: "John Carmack",
    category: "focus"
  },
  {
    quote: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier",
    category: "consistency"
  },
  {
    quote: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
    category: "action"
  },
  {
    quote: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
    category: "confidence"
  },
  {
    quote: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson",
    category: "persistence"
  },
  {
    quote: "It is during our darkest moments that we must focus to see the light.",
    author: "Aristotle",
    category: "focus"
  },
  {
    quote: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
    category: "dreams"
  },
  {
    quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
    category: "courage"
  },
  {
    quote: "Your limitation—it's only your imagination.",
    author: "Unknown",
    category: "potential"
  },
  {
    quote: "Great things never come from comfort zones.",
    author: "Unknown",
    category: "growth"
  },
  {
    quote: "Dream it. Wish it. Do it.",
    author: "Unknown",
    category: "action"
  },
  {
    quote: "Success doesn't just find you. You have to go out and get it.",
    author: "Unknown",
    category: "initiative"
  },
  {
    quote: "The harder you work for something, the greater you'll feel when you achieve it.",
    author: "Unknown",
    category: "achievement"
  },
  {
    quote: "Dream bigger. Do bigger.",
    author: "Unknown",
    category: "ambition"
  }
];

const performanceQuotes = {
  excellent: [
    {
      quote: "Excellence is never an accident. It is always the result of high intention, sincere effort, and intelligent execution.",
      author: "Aristotle",
      category: "excellence"
    },
    {
      quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
      author: "Aristotle",
      category: "excellence"
    }
  ],
  good: [
    {
      quote: "Progress, not perfection, is the goal.",
      author: "Unknown",
      category: "progress"
    },
    {
      quote: "Every expert was once a beginner. Every pro was once an amateur.",
      author: "Robin Sharma",
      category: "growth"
    }
  ],
  improvement: [
    {
      quote: "The only way to do great work is to love what you do.",
      author: "Steve Jobs",
      category: "passion"
    },
    {
      author: "John D. Rockefeller",
      category: "improvement"
    }
  ]
};

export function MotivationalQuoteDisplay({ 
  isVisible, 
  focusScore, 
  onClose, 
  autoClose = true, 
  duration = 4000 
}: MotivationalQuoteDisplayProps) {
  const [currentQuote, setCurrentQuote] = useState<MotivationalQuote>(motivationalQuotes[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Select quote based on performance
      let selectedQuote: MotivationalQuote;
      
      if (focusScore && focusScore >= 90) {
        selectedQuote = performanceQuotes.excellent[Math.floor(Math.random() * performanceQuotes.excellent.length)];
      } else if (focusScore && focusScore >= 75) {
        selectedQuote = performanceQuotes.good[Math.floor(Math.random() * performanceQuotes.good.length)];
      } else if (focusScore && focusScore < 60) {
        selectedQuote = performanceQuotes.improvement[Math.floor(Math.random() * performanceQuotes.improvement.length)];
      } else {
        // Random motivational quote
        selectedQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
      }
      
      setCurrentQuote(selectedQuote);
      setIsAnimating(true);

      if (autoClose) {
        const timer = setTimeout(() => {
          setIsAnimating(false);
          setTimeout(() => onClose?.(), 300);
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, focusScore, autoClose, duration, onClose]);

  const getQuoteIcon = () => {
    if (focusScore && focusScore >= 90) return '🌟';
    if (focusScore && focusScore >= 75) return '💪';
    if (focusScore && focusScore < 60) return '🌱';
    return '💭';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div
        className={`bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-lg border border-blue-500/30 rounded-3xl p-8 max-w-2xl w-full shadow-2xl transition-all duration-500 ${
          isAnimating ? 'animate-quote-reveal opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Close Button */}
        {onClose && (
          <button
            onClick={() => {
              setIsAnimating(false);
              setTimeout(onClose, 300);
            }}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Quote Content */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-3 rounded-2xl">
              <Quote className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Moment of Inspiration</h3>
          </div>

          <div className="text-6xl mb-6 animate-celebration-bounce">
            {getQuoteIcon()}
          </div>

          <blockquote className="text-2xl text-white font-medium italic leading-relaxed mb-6 animate-fade-in">
            "{currentQuote.quote}"
          </blockquote>

          <cite className="text-xl text-gray-300 animate-slide-up">
            — {currentQuote.author}
          </cite>

          {/* Performance Context */}
          {focusScore && (
            <div className="mt-6 bg-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                <span className="text-white font-semibold">Your Focus Score: {focusScore}%</span>
              </div>
              <p className="text-gray-300 text-sm">
                {focusScore >= 90 
                  ? "Exceptional focus! You're developing mastery-level concentration."
                  : focusScore >= 75
                  ? "Great focus! You're building strong concentration habits."
                  : focusScore >= 60
                  ? "Good effort! Every session builds your focus muscle."
                  : "Keep practicing! Focus is a skill that improves with time."
                }
              </p>
            </div>
          )}
        </div>

        {/* Floating Sparkles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute text-yellow-400/40 animate-sparkle-twinkle"
              style={{
                left: `${10 + i * 12}%`,
                top: `${15 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.2}s`,
                fontSize: `${0.8 + Math.random() * 0.4}rem`
              }}
            >
              ✨
            </div>
          ))}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer rounded-3xl pointer-events-none" />
      </div>
    </div>
  );
}
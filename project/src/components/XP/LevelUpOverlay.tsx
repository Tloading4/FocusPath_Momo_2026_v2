import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, X } from 'lucide-react';
import { LevelUpEvent } from '../../services/XPEventService';

interface LevelUpOverlayProps {
  event: LevelUpEvent;
  onDismiss: () => void;
}

export const LevelUpOverlay: React.FC<LevelUpOverlayProps> = ({ event, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<{ id: number; color: string; delay: number }[]>([]);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);

    const pieces = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      color: ['#fbbf24', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'][i % 5],
      delay: Math.random() * 0.3
    }));
    setConfettiPieces(pieces);

    const autoDismissTimer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => clearTimeout(autoDismissTimer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  const getLevelColor = () => {
    if (event.newLevel >= 20) return 'from-purple-500 to-pink-500';
    if (event.newLevel >= 15) return 'from-yellow-500 to-orange-500';
    if (event.newLevel >= 10) return 'from-blue-500 to-cyan-500';
    return 'from-green-500 to-emerald-500';
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center pt-8">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute top-0 w-2 h-2 rounded-full animate-confetti-fall"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${2 + Math.random()}s`
          }}
        />
      ))}

      <div
        className={`
          relative pointer-events-auto
          bg-gradient-to-br ${getLevelColor()}
          rounded-2xl shadow-2xl
          px-8 py-6 max-w-md w-full mx-4
          transform transition-all duration-300 ease-out
          ${isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-full opacity-0 scale-95'}
        `}
        style={{
          boxShadow: '0 0 50px rgba(0, 0, 0, 0.3), 0 0 100px rgba(139, 92, 246, 0.3)'
        }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center text-white">
          <div className="relative mb-4">
            <Trophy className="w-16 h-16 animate-bounce" />
            <Sparkles className="w-6 h-6 absolute -top-1 -right-1 animate-pulse" />
            <Sparkles className="w-6 h-6 absolute -bottom-1 -left-1 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>

          <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">
            Level Up!
          </h2>

          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-4xl font-bold">{event.oldLevel}</div>
              <div className="text-sm opacity-90">{event.oldTitle}</div>
            </div>
            <div className="text-2xl">→</div>
            <div className="text-center">
              <div className="text-5xl font-bold animate-pulse">{event.newLevel}</div>
              <div className="text-base font-semibold">{event.newTitle}</div>
            </div>
          </div>

          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-white rounded-full animate-progress-fill"
              style={{ width: '100%' }}
            />
          </div>

          <p className="mt-4 text-sm opacity-90">
            Keep up the great work!
          </p>
        </div>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes progress-fill {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
        .animate-progress-fill {
          animation: progress-fill 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

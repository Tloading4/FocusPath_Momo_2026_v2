import { useState, useEffect } from 'react';
import { AchievementNotification } from '../Timer/AchievementNotification';
import { AchievementDefinition } from '../../services/AchievementDefinitions';
import { Trophy, Sparkles, CheckCircle } from 'lucide-react';

interface RetroactiveAchievementQueueProps {
  achievements: AchievementDefinition[];
  totalXP: number;
  onComplete: () => void;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward?: number;
}

export function RetroactiveAchievementQueue({
  achievements,
  totalXP,
  onComplete,
}: RetroactiveAchievementQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    if (achievements.length === 0) {
      onComplete();
      return;
    }

    if (currentIndex < achievements.length) {
      const achievement = achievements[currentIndex];
      setCurrentAchievement({
        id: achievement.key,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        xpReward: achievement.xpReward,
      });
    } else {
      setCurrentAchievement(null);
      setShowCelebration(true);

      const celebrationTimer = setTimeout(() => {
        onComplete();
      }, 5000);

      return () => clearTimeout(celebrationTimer);
    }
  }, [currentIndex, achievements, onComplete]);

  const handleAchievementClose = () => {
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 750);
  };

  if (showCelebration) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-3xl p-12 max-w-2xl mx-4 border-4 border-yellow-400 shadow-2xl animate-celebration-bounce">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Trophy className="h-24 w-24 text-yellow-400 animate-bounce" />
                <div className="absolute -top-4 -right-4">
                  <Sparkles className="h-12 w-12 text-yellow-300 animate-spin" />
                </div>
                <div className="absolute -bottom-4 -left-4">
                  <Sparkles className="h-12 w-12 text-purple-300 animate-spin" style={{ animationDirection: 'reverse' }} />
                </div>
              </div>
            </div>

            <h2 className="text-5xl font-bold text-white mb-4 animate-pulse">
              Congratulations!
            </h2>

            <div className="bg-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <span className="text-3xl font-bold text-white">
                  {achievements.length} Achievement{achievements.length !== 1 ? 's' : ''} Unlocked!
                </span>
              </div>

              <div className="text-2xl font-bold text-yellow-400 mb-2">
                +{totalXP.toLocaleString()} Total XP Earned
              </div>

              <p className="text-gray-300 text-lg">
                Your hard work has been recognized!
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {achievements.slice(0, 8).map((achievement, index) => (
                <div
                  key={achievement.key}
                  className="bg-white/10 rounded-xl p-3 text-center transform hover:scale-105 transition-all"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                  }}
                >
                  <div className="text-3xl mb-1">{achievement.icon}</div>
                  <div className="text-xs text-gray-300 font-medium truncate">
                    {achievement.name}
                  </div>
                </div>
              ))}
            </div>

            {achievements.length > 8 && (
              <p className="text-gray-400 text-sm mb-6">
                +{achievements.length - 8} more achievements unlocked
              </p>
            )}

            <div className="text-gray-400 text-sm animate-pulse">
              Returning to dashboard...
            </div>
          </div>

          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute text-2xl animate-sparkle-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              >
                {['✨', '⭐', '🌟', '💫', '🎉'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentAchievement) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />

      <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 rounded-full shadow-2xl border-2 border-white/30">
        <div className="flex items-center gap-3 text-white">
          <Trophy className="h-5 w-5 animate-bounce" />
          <span className="font-bold text-lg">
            Unlocking Achievement {currentIndex + 1} of {achievements.length}
          </span>
          <div className="flex gap-1">
            {achievements.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 w-2 rounded-full transition-all ${
                  idx < currentIndex
                    ? 'bg-green-400'
                    : idx === currentIndex
                    ? 'bg-yellow-400 animate-pulse'
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <AchievementNotification
        achievement={currentAchievement}
        isVisible={true}
        onClose={handleAchievementClose}
        autoCloseDelay={3500}
      />
    </>
  );
}

import { useState, useEffect } from 'react';
import { Trophy, Star, Crown, Zap, X } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward?: number;
}

interface AchievementNotificationProps {
  achievement: Achievement;
  isVisible: boolean;
  onClose: () => void;
  autoCloseDelay?: number;
}

export function AchievementNotification({ 
  achievement, 
  isVisible, 
  onClose, 
  autoCloseDelay = 5000 
}: AchievementNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      // Auto-close after delay
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(onClose, 300); // Wait for exit animation
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoCloseDelay, onClose]);

  const getRarityConfig = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return {
          gradient: 'from-yellow-500 to-orange-600',
          border: 'border-yellow-500/50',
          glow: 'shadow-yellow-500/50',
          icon: Crown,
          particles: '👑✨🌟'
        };
      case 'epic':
        return {
          gradient: 'from-purple-500 to-pink-600',
          border: 'border-purple-500/50',
          glow: 'shadow-purple-500/50',
          icon: Star,
          particles: '💜✨🌟'
        };
      case 'rare':
        return {
          gradient: 'from-blue-500 to-indigo-600',
          border: 'border-blue-500/50',
          glow: 'shadow-blue-500/50',
          icon: Zap,
          particles: '💙✨⭐'
        };
      default: // common
        return {
          gradient: 'from-gray-500 to-gray-600',
          border: 'border-gray-500/50',
          glow: 'shadow-gray-500/50',
          icon: Trophy,
          particles: '🎉✨🎊'
        };
    }
  };

  if (!isVisible) return null;

  const config = getRarityConfig(achievement.rarity);
  const IconComponent = config.icon;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div
        className={`bg-gradient-to-r ${config.gradient} p-6 rounded-2xl border-2 ${config.border} shadow-2xl ${config.glow} transition-all duration-500 ${
          isAnimating ? 'animate-slide-left opacity-100' : 'animate-slide-right opacity-0'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            setIsAnimating(false);
            setTimeout(onClose, 300);
          }}
          className="absolute top-2 right-2 text-white/60 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Achievement Content */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <IconComponent className="h-6 w-6 text-white" />
            <span className="text-white font-bold text-sm uppercase tracking-wide">
              Achievement Unlocked!
            </span>
          </div>
          
          <div className="text-4xl mb-3 animate-celebration-bounce">
            {achievement.icon}
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">
            {achievement.name}
          </h3>
          
          <p className="text-white/90 text-sm mb-3 leading-relaxed">
            {achievement.description}
          </p>
          
          <div className="flex items-center justify-center gap-3">
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
              {achievement.rarity}
            </span>
            {achievement.xpReward && (
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-bold">
                +{achievement.xpReward} XP
              </span>
            )}
          </div>
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {config.particles.split('').map((particle, index) => (
            <div
              key={index}
              className="absolute text-lg animate-sparkle-twinkle"
              style={{
                left: `${20 + index * 25}%`,
                top: `${10 + index * 20}%`,
                animationDelay: `${index * 0.3}s`
              }}
            >
              {particle}
            </div>
          ))}
        </div>

        {/* Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-badge-shine rounded-2xl pointer-events-none" />
      </div>
    </div>
  );
}
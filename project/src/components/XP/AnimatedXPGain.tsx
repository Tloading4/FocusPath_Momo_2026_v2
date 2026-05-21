import React, { useEffect, useState } from 'react';

interface AnimatedXPGainProps {
  amount: number;
  position: { x: number; y: number };
  onComplete: () => void;
}

export const AnimatedXPGain: React.FC<AnimatedXPGainProps> = ({
  amount,
  position,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const getColorClass = () => {
    if (amount >= 50) return 'text-purple-400';
    if (amount >= 30) return 'text-yellow-400';
    if (amount >= 10) return 'text-blue-400';
    return 'text-green-400';
  };

  const getScale = () => {
    if (amount >= 50) return 'scale-150';
    if (amount >= 30) return 'scale-125';
    if (amount >= 10) return 'scale-110';
    return 'scale-100';
  };

  return (
    <div
      className={`
        fixed pointer-events-none z-50 font-bold
        ${getColorClass()}
        ${getScale()}
        transition-all duration-2000 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-20'}
      `}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        textShadow: '0 0 10px currentColor, 0 0 20px currentColor',
        animation: 'float-up 2s ease-out forwards'
      }}
    >
      <div className="flex items-center gap-1">
        <span className="text-2xl">+{amount}</span>
        <span className="text-lg">XP</span>
      </div>
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          20% {
            transform: translateY(-10px) scale(1.2);
            opacity: 1;
          }
          100% {
            transform: translateY(-80px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

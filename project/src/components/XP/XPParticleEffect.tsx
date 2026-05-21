import React, { useEffect, useState } from 'react';
import { Sparkles, Star } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  scale: number;
  color: string;
}

interface XPParticleEffectProps {
  amount: number;
  position: { x: number; y: number };
  onComplete: () => void;
}

export const XPParticleEffect: React.FC<XPParticleEffectProps> = ({
  amount,
  position,
  onComplete
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const particleCount = Math.min(Math.floor(amount / 5) + 3, 15);
    const newParticles: Particle[] = [];

    const colors = amount >= 30
      ? ['#fbbf24', '#f59e0b', '#fcd34d']
      : amount >= 10
      ? ['#60a5fa', '#3b82f6', '#93c5fd']
      : ['#34d399', '#10b981', '#6ee7b7'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 2 + Math.random() * 2;
      newParticles.push({
        id: i,
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    setParticles(newParticles);

    const timer = setTimeout(() => {
      onComplete();
    }, 1000);

    return () => clearTimeout(timer);
  }, [amount, position, onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute transition-all duration-1000 ease-out"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            transform: `translate(-50%, -50%) rotate(${particle.rotation}deg) scale(${particle.scale})`,
            animation: `particle-burst-${particle.id} 1s ease-out forwards`,
            color: particle.color
          }}
        >
          {particle.id % 2 === 0 ? (
            <Star className="w-4 h-4 fill-current" />
          ) : (
            <Sparkles className="w-4 h-4 fill-current" />
          )}
          <style>{`
            @keyframes particle-burst-${particle.id} {
              0% {
                transform: translate(-50%, -50%) rotate(${particle.rotation}deg) scale(${particle.scale});
                opacity: 1;
              }
              100% {
                transform: translate(calc(-50% + ${particle.vx * 50}px), calc(-50% + ${particle.vy * 50}px)) rotate(${particle.rotation + 180}deg) scale(0);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      ))}
    </div>
  );
};

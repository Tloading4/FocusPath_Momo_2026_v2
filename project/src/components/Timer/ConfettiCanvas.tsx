import { useEffect, useRef } from 'react';

interface ConfettiCanvasProps {
  isActive: boolean;
  duration?: number;
  intensity?: 'low' | 'medium' | 'high';
  colors?: string[];
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  gravity: number;
  life: number;
  maxLife: number;
}

export function ConfettiCanvas({ 
  isActive, 
  duration = 3000, 
  intensity = 'medium',
  colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF']
}: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const startTimeRef = useRef<number>(0);

  const getParticleCount = () => {
    switch (intensity) {
      case 'low': return 30;
      case 'high': return 100;
      default: return 60; // medium
    }
  };

  const createParticle = (canvas: HTMLCanvasElement): ConfettiParticle => {
    const maxLife = 3000 + Math.random() * 2000;
    return {
      x: Math.random() * canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      gravity: 0.3 + Math.random() * 0.2,
      life: maxLife,
      maxLife: maxLife
    };
  };

  const updateParticle = (particle: ConfettiParticle, deltaTime: number) => {
    particle.x += particle.vx * deltaTime * 0.016;
    particle.y += particle.vy * deltaTime * 0.016;
    particle.vy += particle.gravity * deltaTime * 0.016;
    particle.rotation += particle.rotationSpeed * deltaTime * 0.016;
    particle.life -= deltaTime;
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, particle: ConfettiParticle) => {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate((particle.rotation * Math.PI) / 180);
    ctx.globalAlpha = alpha;
    
    // Draw confetti piece as a rectangle
    ctx.fillStyle = particle.color;
    ctx.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
    
    ctx.restore();
  };

  const animate = (currentTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;

    if (startTimeRef.current === 0) {
      startTimeRef.current = currentTime;
    }

    const elapsed = currentTime - startTimeRef.current;
    const deltaTime = 16; // Assume 60fps

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Add new particles if still within duration
    if (elapsed < duration && particlesRef.current.length < getParticleCount()) {
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push(createParticle(canvas));
      }
    }

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter(particle => {
      updateParticle(particle, deltaTime);
      
      // Remove particles that are off-screen or dead
      if (particle.y > canvas.height + 50 || particle.life <= 0) {
        return false;
      }
      
      drawParticle(ctx, particle);
      return true;
    });

    // Continue animation if particles exist or still within duration
    if (particlesRef.current.length > 0 || elapsed < duration) {
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (isActive) {
      startTimeRef.current = 0;
      particlesRef.current = [];
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-30"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
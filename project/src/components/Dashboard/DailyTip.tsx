import React, { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';

const tips = [
  {
    title: "The 2-Minute Rule",
    content: "If a task takes less than 2 minutes, do it immediately instead of adding it to your to-do list.",
    category: "Productivity"
  },
  {
    title: "Pomodoro Power",
    content: "Take a 5-minute break after each 25-minute focus session to maintain peak mental performance.",
    category: "Focus"
  },
  {
    title: "Environment Matters",
    content: "Create a dedicated workspace that signals to your brain it's time to focus and be productive.",
    category: "Environment"
  },
  {
    title: "Single-Tasking",
    content: "Focus on one task at a time. Multitasking reduces productivity by up to 40%.",
    category: "Focus"
  },
  {
    title: "Energy Management",
    content: "Schedule your most important tasks during your natural energy peaks, usually in the morning.",
    category: "Energy"
  },
  {
    title: "Digital Detox",
    content: "Turn off notifications during focus sessions to eliminate distractions and improve concentration.",
    category: "Digital"
  },
  {
    title: "Progress Over Perfection",
    content: "Focus on making consistent progress rather than achieving perfection. Small steps lead to big results.",
    category: "Mindset"
  },
  {
    title: "Batch Similar Tasks",
    content: "Group similar activities together to reduce context switching and increase efficiency.",
    category: "Organization"
  }
];

export function DailyTip() {
  const [currentTip, setCurrentTip] = useState(tips[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const tipIndex = dayOfYear % tips.length;
    setCurrentTip(tips[tipIndex]);
    
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const getNewTip = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * tips.length);
      setCurrentTip(tips[randomIndex]);
      setIsAnimating(false);
    }, 300);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Productivity': 'text-blue-400',
      'Focus': 'text-purple-400',
      'Environment': 'text-green-400',
      'Energy': 'text-yellow-400',
      'Digital': 'text-pink-400',
      'Mindset': 'text-indigo-400',
      'Organization': 'text-orange-400'
    };
    return colors[category as keyof typeof colors] || 'text-gray-400';
  };

  return (
    <div className={`glass-card rounded-2xl p-6 shadow-2xl hover-lift h-full flex flex-col transition-all duration-500 ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-8'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-3 rounded-xl animate-pulse-glow">
            <Lightbulb className="h-6 w-6 text-white animate-float" />
          </div>
          <div className="animate-slide-right">
            <h2 className="text-xl font-bold text-white">Daily Focus Tip</h2>
            <p className="text-sm text-gray-300">Boost your productivity</p>
          </div>
        </div>

        <button
          onClick={getNewTip}
          className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all transform hover:scale-110 hover-bounce btn-press focus-ring"
          title="Get new tip"
        >
          <RefreshCw className={`h-5 w-5 text-white transition-transform duration-300 ${isAnimating ? 'animate-spin' : 'hover:rotate-180'}`} />
        </button>
      </div>

      <div className={`flex-grow transition-all duration-300 ${isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}>
        <div className="mb-4 animate-fade-in">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full bg-white/10 ${getCategoryColor(currentTip.category)} animate-bounce-in`}>
            {currentTip.category}
          </span>
        </div>

        <h3 className="text-lg font-bold text-white mb-3 animate-slide-down">
          {currentTip.title}
        </h3>

        <p className="text-sm text-gray-300 leading-relaxed animate-fade-in">
          {currentTip.content}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-white/20 animate-slide-up">
        <p className="text-sm text-gray-400 text-center animate-fade-in">
          💡 New tip daily • Click refresh for more inspiration
        </p>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
        <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
      </div>
      
      {/* Floating sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute text-yellow-400/30 animate-float"
            style={{
              left: `${10 + i * 25}%`,
              top: `${15 + i * 15}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${2 + i * 0.5}s`
            }}
          >
            ✨
          </div>
        ))}
      </div>
    </div>
  );
}
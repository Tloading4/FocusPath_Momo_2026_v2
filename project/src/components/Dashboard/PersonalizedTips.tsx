import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Lightbulb, RefreshCw, Target, Clock, Brain } from 'lucide-react';

interface PersonalizedTipsProps {
  refreshTrigger?: number;
}

export function PersonalizedTips({ refreshTrigger = 0 }: PersonalizedTipsProps) {
  const [personalizedAdvice, setPersonalizedAdvice] = useState<string[]>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { currentUser } = useAuth();

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

  const fetchPersonalizedAdvice = async () => {
    if (currentUser) {
      try {
        const userProfileDoc = await getDoc(doc(db, 'userProfiles', currentUser.uid));
        if (userProfileDoc.exists()) {
          const profileData = userProfileDoc.data();
          const advice = profileData.personalizedAdvice || [];
          // Convert string array to tip objects if needed
          const tipObjects = advice.map((tip: any, index: number) => {
            if (typeof tip === 'string') {
              return {
                title: `Tip ${index + 1}`,
                content: tip,
                category: 'Personal'
              };
            }
            return tip;
          });
          setPersonalizedAdvice(tipObjects);
        }
      } catch (error) {
        console.error('Error fetching personalized advice:', error);
      }
    }
    setLoading(false);
    setTimeout(() => setIsVisible(true), 100);
  };

  useEffect(() => {
    fetchPersonalizedAdvice();
  }, [currentUser, refreshTrigger]);

  const getNextTip = () => {
    if (personalizedAdvice.length === 0) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentTipIndex((prev) => (prev + 1) % personalizedAdvice.length);
      setIsAnimating(false);
    }, 300);
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 shadow-2xl animate-fade-in h-full flex flex-col">
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded mb-4"></div>
          <div className="h-4 bg-white/20 rounded mb-2"></div>
          <div className="h-4 bg-white/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (personalizedAdvice.length === 0) {
    return (
      <div className={`glass-card rounded-2xl p-6 shadow-2xl hover-lift h-full flex flex-col transition-all duration-500 ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-8'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-3 rounded-xl animate-pulse-glow">
            <Target className="h-6 w-6 text-white animate-bounce-in" />
          </div>
          <div className="animate-slide-right">
            <h2 className="text-2xl font-bold text-white">Personalized Tips</h2>
            <p className="text-gray-300">Complete your profile to get custom advice</p>
          </div>
        </div>
        <p className="text-gray-400 text-center py-6 animate-fade-in">
          Set up your profile to receive personalized study tips based on your habits and goals.
        </p>
      </div>
    );
  }

  const currentTip = personalizedAdvice[currentTipIndex];

  return (
    <div className={`glass-card rounded-2xl p-6 shadow-2xl hover-lift h-full flex flex-col transition-all duration-500 ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-8'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-3 rounded-xl animate-pulse-glow">
            <Brain className="h-6 w-6 text-white animate-float" />
          </div>
          <div className="animate-slide-right">
            <h2 className="text-2xl font-bold text-white">Your Personal Tip</h2>
            <p className="text-gray-300">Tailored to your study habits</p>
          </div>
        </div>

        <button
          onClick={getNextTip}
          className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all transform hover:scale-110 hover-bounce btn-press"
          title="Next tip"
        >
          <RefreshCw className={`h-5 w-5 text-white transition-transform duration-300 ${isAnimating ? 'animate-spin' : 'hover:rotate-180'}`} />
        </button>
      </div>

      <div className={`flex-grow transition-all duration-300 ${isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}>
        <div className="mb-4 animate-fade-in">
          <span className="text-sm font-semibold px-3 py-1 rounded-full bg-white/10 text-blue-400 animate-bounce-in">
            Personal
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-4 animate-slide-down">
          {currentTip.title || 'Personal Tip'}
        </h3>

        <p className="text-gray-300 leading-relaxed animate-fade-in">
          {currentTip.content || currentTip}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-white/20 animate-slide-up">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span className="flex items-center gap-3">
            💡 Tip {currentTipIndex + 1} of {personalizedAdvice.length}
            <div className="flex gap-1">
              {personalizedAdvice.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentTipIndex ? 'bg-blue-400' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </span>
          <span>Based on your profile</span>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"></div>
      </div>
      
      {/* Floating sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute text-blue-400/30 animate-float"
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
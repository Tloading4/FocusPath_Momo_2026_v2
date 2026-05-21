import { useState, useEffect } from 'react';
import { Lightbulb, Target, Clock, TrendingUp } from 'lucide-react';

interface TaskSpecificMotivationProps {
  category: string;
  customTask: string;
  goal?: {
    type: string;
    description: string;
    target?: number;
    unit?: string;
  };
  timeRemaining: number;
  sessionDuration: number;
  isVisible: boolean;
}

const categoryMotivation = {
  homework: {
    start: [
      "📚 Every problem you solve builds your knowledge foundation!",
      "🎯 Focus now, celebrate later - you've got this!",
      "💪 Transform confusion into clarity, one step at a time.",
      "⭐ Your future self will thank you for this effort!"
    ],
    midSession: [
      "🔥 You're in the zone! Keep that momentum going!",
      "📈 Each minute of focus is an investment in your success.",
      "💡 Great minds think deeply - you're proving that right now!",
      "🚀 You're building the habits that lead to excellence!"
    ],
    nearEnd: [
      "🏁 Almost there! Finish strong and feel the satisfaction!",
      "💎 The final push often yields the biggest breakthroughs!",
      "🎉 You're so close to completing this challenge!",
      "⚡ Channel that end-of-session energy into focus!"
    ]
  },
  coding: {
    start: [
      "💻 Every line of code is a step toward mastery!",
      "🔧 Debug your way to brilliance - you're a problem solver!",
      "🚀 Code with purpose, build with passion!",
      "⚡ Transform ideas into reality through focused coding!"
    ],
    midSession: [
      "🔥 You're in the flow state - this is where magic happens!",
      "🧠 Complex problems require focused minds - you've got both!",
      "💡 Each function you write makes you a better developer!",
      "🎯 Stay in the zone - breakthrough solutions are coming!"
    ],
    nearEnd: [
      "🏆 Push through to the finish - your code is almost complete!",
      "💪 The best developers finish what they start - that's you!",
      "🎉 You're about to ship something amazing!",
      "⭐ Final sprint - make every keystroke count!"
    ]
  },
  reading: {
    start: [
      "📖 Every page turns you into a more knowledgeable person!",
      "🧠 Feed your mind with focused reading - it's brain food!",
      "💡 Absorb wisdom from the greatest minds through books!",
      "🎯 Deep reading creates deep understanding!"
    ],
    midSession: [
      "📚 You're building knowledge brick by brick!",
      "🔍 Stay curious and engaged - insights are everywhere!",
      "💭 Let the ideas flow and connect in your mind!",
      "⚡ Active reading is active learning - you're doing great!"
    ],
    nearEnd: [
      "🏁 Finish strong - the best insights often come at the end!",
      "💎 You're so close to completing this reading goal!",
      "🎉 Celebrate the knowledge you've gained today!",
      "📈 Every page read is progress toward your goals!"
    ]
  },
  writing: {
    start: [
      "✍️ Every word you write brings your ideas to life!",
      "💭 Transform thoughts into powerful written expression!",
      "🎨 You're crafting something unique - let creativity flow!",
      "📝 Great writing starts with focused thinking!"
    ],
    midSession: [
      "🔥 You're in the creative flow - keep those words coming!",
      "💡 Each sentence builds toward something meaningful!",
      "🎯 Stay focused - your best ideas are emerging!",
      "⚡ You're turning blank pages into compelling content!"
    ],
    nearEnd: [
      "🏆 Push to the finish - your writing is almost complete!",
      "💪 The final paragraphs often contain the best insights!",
      "🎉 You're about to complete something you can be proud of!",
      "⭐ Finish strong - every word matters!"
    ]
  },
  'test-prep': {
    start: [
      "🎓 Every minute of study brings you closer to success!",
      "💪 Prepare with purpose - you're building confidence!",
      "🧠 Feed your mind the knowledge it needs to excel!",
      "🎯 Focused preparation leads to outstanding performance!"
    ],
    midSession: [
      "📚 You're reinforcing knowledge and building mastery!",
      "🔥 Stay focused - this preparation will pay off!",
      "💡 Each concept you master increases your confidence!",
      "⚡ You're training your mind for peak performance!"
    ],
    nearEnd: [
      "🏁 Almost done - finish this study session strong!",
      "🎉 You're so well-prepared now - feel that confidence!",
      "💎 The final review often locks in the most important details!",
      "🚀 You're ready to ace whatever comes your way!"
    ]
  },
  work: {
    start: [
      "💼 Professional excellence starts with focused effort!",
      "🎯 Make every minute count toward your career goals!",
      "💪 You're building the reputation of someone who delivers!",
      "⚡ Transform tasks into achievements through focus!"
    ],
    midSession: [
      "🔥 You're in professional flow mode - excellence in action!",
      "📈 Each task completed builds your professional momentum!",
      "💡 Focused work creates outstanding results!",
      "🚀 You're demonstrating the focus that leads to success!"
    ],
    nearEnd: [
      "🏆 Almost finished - complete this task with excellence!",
      "💪 Strong finishes create strong professional reputations!",
      "🎉 You're about to deliver quality work!",
      "⭐ Finish with the same focus you started with!"
    ]
  },
  creative: {
    start: [
      "🎨 Let your creativity flow through focused expression!",
      "💡 Every creative moment is a gift to the world!",
      "✨ Transform inspiration into beautiful creation!",
      "🌟 Your unique vision deserves focused attention!"
    ],
    midSession: [
      "🔥 You're in the creative zone - let imagination soar!",
      "🎭 Each creative choice shapes something beautiful!",
      "💫 Stay in flow - your best ideas are emerging!",
      "🌈 You're painting the world with your unique perspective!"
    ],
    nearEnd: [
      "🏆 Almost complete - finish this creative masterpiece!",
      "💎 The final touches often make the biggest difference!",
      "🎉 You're about to complete something uniquely yours!",
      "⭐ Finish with the same passion you started with!"
    ]
  },
  learning: {
    start: [
      "🧠 Every moment of learning expands your potential!",
      "📚 You're investing in the most valuable asset - knowledge!",
      "💡 Curiosity + Focus = Unstoppable Growth!",
      "🎯 Transform confusion into understanding through focus!"
    ],
    midSession: [
      "🔥 You're building neural pathways to mastery!",
      "📈 Each concept learned makes the next one easier!",
      "💪 Stay curious and engaged - breakthroughs are coming!",
      "⚡ You're literally rewiring your brain for success!"
    ],
    nearEnd: [
      "🏁 Almost there - complete this learning journey!",
      "🎓 You've grown so much in just this session!",
      "🎉 Celebrate the knowledge you've gained!",
      "🚀 You're becoming the person you want to be!"
    ]
  }
};

export function TaskSpecificMotivation({ 
  category, 
  goal, 
  timeRemaining, 
  sessionDuration, 
  isVisible 
}: TaskSpecificMotivationProps) {
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const progressPercentage = ((sessionDuration * 60 - timeRemaining) / (sessionDuration * 60)) * 100;
    
    let phase: 'start' | 'midSession' | 'nearEnd';
    if (progressPercentage < 25) {
      phase = 'start';
    } else if (progressPercentage < 75) {
      phase = 'midSession';
    } else {
      phase = 'nearEnd';
    }

    const categoryMessages = categoryMotivation[category as keyof typeof categoryMotivation] || categoryMotivation.learning;
    const phaseMessages = categoryMessages[phase];
    const randomMessage = phaseMessages[Math.floor(Math.random() * phaseMessages.length)];
    
    setCurrentMessage(randomMessage);
    setShowMessage(true);

    // Hide message after 4 seconds
    const timer = setTimeout(() => {
      setShowMessage(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [category, timeRemaining, sessionDuration, isVisible]);

  // Show motivational messages at specific intervals
  useEffect(() => {
    if (!isVisible) return;

    const intervals = [
      sessionDuration * 60 * 0.25, // 25% through
      sessionDuration * 60 * 0.5,  // 50% through
      sessionDuration * 60 * 0.75, // 75% through
      sessionDuration * 60 * 0.9   // 90% through
    ];

    const currentProgress = sessionDuration * 60 - timeRemaining;
    const shouldShow = intervals.some(interval => 
      Math.abs(currentProgress - interval) < 2 // Within 2 seconds of interval
    );

    if (shouldShow) {
      setShowMessage(true);
      const timer = setTimeout(() => setShowMessage(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining, sessionDuration, isVisible]);

  if (!showMessage || !isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-30 animate-slide-down">
      <div className="bg-gradient-to-r from-blue-500/90 to-purple-600/90 text-white px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-sm border border-white/20 max-w-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 p-2 rounded-lg">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div className="font-semibold">Stay Motivated!</div>
        </div>
        
        <p className="text-sm leading-relaxed mb-3">{currentMessage}</p>
        
        {goal && (
          <div className="bg-white/10 rounded-lg p-2 text-xs">
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3" />
              <span className="font-medium">Goal: {goal.description}</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mt-3 text-xs opacity-80">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} left</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{Math.round(((sessionDuration * 60 - timeRemaining) / (sessionDuration * 60)) * 100)}% complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}
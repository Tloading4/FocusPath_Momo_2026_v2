import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Play, Target, Award, ShoppingBag, Settings, CheckCircle } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'hover' | 'none';
  icon: React.ComponentType<any>;
  content: React.ReactNode;
}

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Focus Path™! 🎯',
    description: 'Let\'s take a quick tour to get you started on your productivity journey.',
    target: 'center',
    position: 'center',
    icon: Target,
    content: (
      <div className="text-center">
        <div className="text-6xl mb-4">🚀</div>
        <h2 className="text-2xl font-bold text-white mb-4">Welcome to Focus Path™!</h2>
        <p className="text-gray-300 mb-6 leading-relaxed">
          Focus Path™ is a gamified productivity app that helps you build better focus habits through:
        </p>
        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl mb-2">⏱️</div>
            <h3 className="font-semibold text-white">Focus Sessions</h3>
            <p className="text-sm text-gray-300">Timed focus sessions with distraction tracking</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl mb-2">🎮</div>
            <h3 className="font-semibold text-white">Gamification</h3>
            <p className="text-sm text-gray-300">Earn XP, level up, and unlock rewards</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl mb-2">🔥</div>
            <h3 className="font-semibold text-white">Streaks</h3>
            <p className="text-sm text-gray-300">Build daily focus habits and maintain streaks</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold text-white">AI Coach</h3>
            <p className="text-sm text-gray-300">Get personalized insights and recommendations</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'navigation',
    title: 'Navigation Tabs',
    description: 'These tabs let you access different features of Focus Path™.',
    target: 'nav[class*="bg-white/5"]',
    position: 'bottom',
    icon: Target,
    content: (
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Navigation Overview</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <Target className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="font-semibold text-white">Dashboard</div>
              <div className="text-sm text-gray-300">Your main hub with tips and progress</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-green-500/20 p-2 rounded-lg">
              <Play className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <div className="font-semibold text-white">Timer</div>
              <div className="text-sm text-gray-300">Start focus sessions and earn XP</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <Award className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <div className="font-semibold text-white">Progress</div>
              <div className="text-sm text-gray-300">Track your XP, level, and achievements</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/20 p-2 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <div className="font-semibold text-white">Marketplace</div>
              <div className="text-sm text-gray-300">Spend XP on avatars and backgrounds</div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'timer-tab',
    title: 'Start Your First Session',
    description: 'Click on the Timer tab to start your first focus session.',
    target: 'button[data-tab="timer"]',
    position: 'bottom',
    action: 'click',
    icon: Play,
    content: (
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Focus Timer</h3>
        <p className="text-gray-300 mb-4">
          The Timer is where the magic happens! You can choose from different session types:
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 bg-green-500/10 p-2 rounded-lg">
            <span className="text-green-400 font-bold">Easy</span>
            <span className="text-gray-300">15 minutes • 5 XP</span>
          </div>
          <div className="flex items-center gap-3 bg-yellow-500/10 p-2 rounded-lg">
            <span className="text-yellow-400 font-bold">Medium</span>
            <span className="text-gray-300">30 minutes • 10 XP</span>
          </div>
          <div className="flex items-center gap-3 bg-orange-500/10 p-2 rounded-lg">
            <span className="text-orange-400 font-bold">Hard</span>
            <span className="text-gray-300">45 minutes • 15 XP</span>
          </div>
          <div className="flex items-center gap-3 bg-red-500/10 p-2 rounded-lg">
            <span className="text-red-400 font-bold">Extreme</span>
            <span className="text-gray-300">60 minutes • 20 XP</span>
          </div>
        </div>
        <p className="text-blue-300 text-sm mt-4">💡 Start with Easy or Medium sessions to build your focus habit!</p>
      </div>
    )
  },
  {
    id: 'session-types',
    title: 'Choose Your Challenge',
    description: 'Select a session type that matches your current focus ability.',
    target: '.grid.grid-cols-2.gap-2',
    position: 'right',
    icon: Target,
    content: (
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Session Types</h3>
        <p className="text-gray-300 mb-4">
          Each session type offers different challenges and rewards:
        </p>
        <div className="space-y-3">
          <div className="bg-white/10 rounded-lg p-3">
            <h4 className="font-semibold text-white mb-2">🎯 Choosing the Right Session</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• <strong>New to focus training?</strong> Start with Easy (15 min)</li>
              <li>• <strong>Building consistency?</strong> Try Medium (30 min)</li>
              <li>• <strong>Ready for a challenge?</strong> Go for Hard (45 min)</li>
              <li>• <strong>Focus master?</strong> Take on Extreme (60 min)</li>
            </ul>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-200 text-sm">
              💡 <strong>Pro Tip:</strong> It's better to complete shorter sessions consistently than to fail longer ones!
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'start-button',
    title: 'Start Your Session',
    description: 'Click the Start button to begin your first focus session!',
    target: 'button:has(svg[data-lucide="play"])',
    position: 'top',
    action: 'click',
    icon: Play,
    content: (
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Ready to Focus! 🚀</h3>
        <p className="text-gray-300 mb-4">
          When you click Start, you'll enter a pre-session setup where you can:
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300">Choose your task category</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300">Set a specific goal</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-gray-300">Get motivated for success</span>
          </div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-4">
          <p className="text-green-200 text-sm">
            🎵 <strong>Bonus:</strong> Enjoy curated Spotify focus music during your session!
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'xp-system',
    title: 'XP & Leveling System',
    description: 'Earn XP from completed sessions to level up and unlock rewards.',
    target: '[class*="glass-card"]:has([class*="Level"])',
    position: 'left',
    icon: Award,
    content: (
      <div>
        <h3 className="text-lg font-bold text-white mb-3">XP & Progression 📈</h3>
        <p className="text-gray-300 mb-4">
          Focus Path™ uses a gamified progression system to keep you motivated:
        </p>
        <div className="space-y-3">
          <div className="bg-white/10 rounded-lg p-3">
            <h4 className="font-semibold text-white mb-2">🎯 How XP Works</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Complete sessions to earn XP</li>
              <li>• XP requirements increase with each level</li>
              <li>• Higher levels unlock new titles & rewards</li>
              <li>• Spend XP in the Marketplace</li>
            </ul>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <h4 className="font-semibold text-purple-300 mb-2">🏆 Level Titles</h4>
            <div className="text-sm text-purple-200 space-y-1">
              <div>Level 1-4: <strong>Focus Novice</strong></div>
              <div>Level 5-9: <strong>Focus Practitioner</strong></div>
              <div>Level 10-19: <strong>Focus Expert</strong></div>
              <div>Level 20+: <strong>Focus Master</strong></div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'marketplace',
    title: 'Marketplace & Customization',
    description: 'Spend your earned XP on avatars, backgrounds, and other customizations.',
    target: 'button[data-tab="marketplace"]',
    position: 'bottom',
    action: 'click',
    icon: ShoppingBag,
    content: (
      <div>
        <h3 className="text-lg font-bold text-white mb-3">XP Marketplace 🛒</h3>
        <p className="text-gray-300 mb-4">
          Use your hard-earned XP to customize your Focus Path™ experience:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl mb-2">🎭</div>
            <h4 className="font-semibold text-white">Avatars</h4>
            <p className="text-xs text-gray-300">Express your personality</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl mb-2">🖼️</div>
            <h4 className="font-semibold text-white">Backgrounds</h4>
            <p className="text-xs text-gray-300">Beautiful focus environments</p>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl mb-2">🎨</div>
            <h4 className="font-semibold text-white">Themes</h4>
            <p className="text-xs text-gray-300">Color customization</p>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl mb-2">🎵</div>
            <h4 className="font-semibold text-white">Sounds</h4>
            <p className="text-xs text-gray-300">Focus audio experiences</p>
          </div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4">
          <p className="text-yellow-200 text-sm">
            💡 <strong>Tip:</strong> Start with cheaper items and work your way up to premium customizations!
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'streaks',
    title: 'Build Focus Streaks',
    description: 'Complete daily sessions to build and maintain focus streaks.',
    target: '[class*="glass-card"]:has([class*="Focus Streak"])',
    position: 'right',
    icon: Award,
    content: (
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Focus Streaks 🔥</h3>
        <p className="text-gray-300 mb-4">
          Streaks are one of the most powerful features for building consistent focus habits:
        </p>
        <div className="space-y-3">
          <div className="bg-white/10 rounded-lg p-3">
            <h4 className="font-semibold text-white mb-2">🎯 How Streaks Work</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Complete at least 1 session per day</li>
              <li>• Streaks reset if you miss a day</li>
              <li>• Longer streaks = bonus XP rewards</li>
              <li>• Track your best streak ever</li>
            </ul>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <h4 className="font-semibold text-orange-300 mb-2">🏆 Streak Milestones</h4>
            <div className="text-sm text-orange-200 space-y-1">
              <div>3 days: <strong>Good Streak!</strong> 🌟</div>
              <div>7 days: <strong>Great Streak!</strong> ⚡</div>
              <div>14 days: <strong>Epic Streak!</strong> 🔥</div>
              <div>30 days: <strong>Legendary Streak!</strong> 👑</div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'settings',
    title: 'Customize Your Experience',
    description: 'Adjust settings to personalize Focus Path™ for your needs.',
    target: 'button[data-tab="settings"]',
    position: 'bottom',
    action: 'click',
    icon: Settings,
    content: (
      <div>
        <h3 className="text-lg font-bold text-white mb-3">Settings & Customization ⚙️</h3>
        <p className="text-gray-300 mb-4">
          Customize Focus Path™ to work perfectly for your workflow:
        </p>
        <div className="space-y-3">
          <div className="bg-white/10 rounded-lg p-3">
            <h4 className="font-semibold text-white mb-2">🎛️ Key Settings</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Default session type preference</li>
              <li>• Notification preferences</li>
              <li>• Privacy and anonymity options</li>
              <li>• Sound and visual preferences</li>
            </ul>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <h4 className="font-semibold text-green-300 mb-2">🔒 Privacy Control</h4>
            <p className="text-sm text-green-200">
              Toggle anonymous mode to hide your name on leaderboards while keeping all your progress.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🎉',
    description: 'You\'ve completed the tutorial. Start your focus journey now!',
    target: 'center',
    position: 'center',
    icon: CheckCircle,
    content: (
      <div className="text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-4">Tutorial Complete!</h2>
        <p className="text-gray-300 mb-6 leading-relaxed">
          You're now ready to start your focus journey with Focus Path™. Here's what to do next:
        </p>
        <div className="space-y-3 text-left">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-blue-300 mb-2">🎯 Quick Start Guide</h3>
            <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
              <li>Go to the Timer tab</li>
              <li>Choose an Easy or Medium session</li>
              <li>Set up your task and goal</li>
              <li>Complete your first session</li>
              <li>Earn XP and start your streak!</li>
            </ol>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-green-300 mb-2">💡 Pro Tips</h3>
            <ul className="text-sm text-green-200 space-y-1">
              <li>• Start small and build consistency</li>
              <li>• Use the AI coach for personalized advice</li>
              <li>• Check your progress regularly</li>
              <li>• Customize your experience in the marketplace</li>
            </ul>
          </div>
        </div>
        <div className="mt-6">
          <p className="text-yellow-300 font-semibold">
            🚀 Ready to master your focus? Let's begin!
          </p>
        </div>
      </div>
    )
  }
];

export function TutorialOverlay({ isOpen, onClose, onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setCurrentStep(0);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
      removeHighlight();
    }

    return () => {
      document.body.style.overflow = 'unset';
      removeHighlight();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isVisible && currentStep < tutorialSteps.length) {
      highlightTargetElement();
    }
  }, [currentStep, isVisible]);

  const highlightTargetElement = () => {
    removeHighlight();
    
    const step = tutorialSteps[currentStep];
    if (step.target === 'center') return;

    // Find target element
    let targetElement: Element | null = null;
    
    // Try different selectors
    if (step.target.startsWith('button[data-tab=')) {
      const tabName = step.target.match(/data-tab="([^"]+)"/)?.[1];
      targetElement = document.querySelector(`button[data-tab="${tabName}"]`);
    } else {
      targetElement = document.querySelector(step.target);
    }

    if (targetElement) {
      setHighlightedElement(targetElement);
      
      // Add highlight styles
      targetElement.classList.add('tutorial-highlight');
      
      // Scroll element into view
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
    }
  };

  const removeHighlight = () => {
    if (highlightedElement) {
      highlightedElement.classList.remove('tutorial-highlight');
      setHighlightedElement(null);
    }
    
    // Remove all tutorial highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  };

  const handleNext = () => {
    const step = tutorialSteps[currentStep];
    
    // If step has an action, perform it
    if (step.action === 'click' && highlightedElement) {
      (highlightedElement as HTMLElement).click();
      
      // Wait a bit for the action to complete, then move to next step
      setTimeout(() => {
        if (currentStep < tutorialSteps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          handleComplete();
        }
      }, 1000);
    } else {
      if (currentStep < tutorialSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    removeHighlight();
    // Navigate to dashboard tab
    const dashboardTab = document.querySelector('button[data-tab="dashboard"]') as HTMLElement;
    if (dashboardTab) {
      dashboardTab.click();
    }
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    removeHighlight();
    onClose();
  };

  if (!isOpen || !isVisible) return null;

  const step = tutorialSteps[currentStep];
  const IconComponent = step.icon;
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <>
      {/* Tutorial Styles */}
      <style>{`
        .tutorial-highlight {
          position: relative;
          z-index: 10000 !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2) !important;
          border-radius: 8px !important;
          animation: tutorialPulse 2s infinite;
        }
        
        @keyframes tutorialPulse {
          0%, 100% { 
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2);
          }
          50% { 
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.7), 0 0 0 12px rgba(59, 130, 246, 0.3);
          }
        }
      `}</style>

      {/* Overlay */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
        {/* Tutorial Modal */}
        <div className={`glass-card rounded-2xl border border-white/20 shadow-2xl max-w-2xl w-full transition-all duration-500 ${
          step.target === 'center' ? 'max-w-4xl' : ''
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-3 rounded-xl">
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{step.title}</h2>
                  <p className="text-gray-300">{step.description}</p>
                </div>
              </div>
              
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-white transition-colors"
                title="Skip tutorial"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/10 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-300">
                {currentStep + 1} / {tutorialSteps.length}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-6">
              {step.content}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isFirstStep
                    ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSkip}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Skip Tutorial
                </button>
                
                <button
                  onClick={handleNext}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                    isLastStep
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                      : step.action === 'click'
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700'
                      : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700'
                  }`}
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Complete Tutorial
                    </>
                  ) : step.action === 'click' ? (
                    <>
                      Click to Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
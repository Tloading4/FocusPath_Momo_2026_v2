import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { supabase } from '../../supabase';
import { CheckCircle, ArrowRight, ArrowLeft, Brain, Eye, Ear, BookOpen, Hand } from 'lucide-react';
import { UsernameInput } from '../Auth/UsernameInput';

interface StudyHabits {
  preferredStudyTime: string;
  studyEnvironment: string;
  focusDuration: string;
  distractionLevel: string;
  primaryDistractions: string[];
  motivationType: string[];
  studyGoals: string[];
  breakFrequency: string;
  breakActivity: string;
  learningStyle: string;
}

interface ProfileSetupProps {
  onComplete: () => void;
}

const studyTimeOptions = [
  { id: 'early-morning', label: 'Early Morning (5–8 AM)', icon: '🌅', description: 'Fresh mind, quiet environment' },
  { id: 'morning',       label: 'Morning (8–12 PM)',      icon: '☀️',  description: 'Peak energy, good focus' },
  { id: 'afternoon',     label: 'Afternoon (12–5 PM)',    icon: '🌤️', description: 'Post-lunch productivity' },
  { id: 'evening',       label: 'Evening (5–9 PM)',       icon: '🌆', description: 'Winding down, reflective' },
  { id: 'night',         label: 'Night (9 PM+)',          icon: '🌙', description: 'Quiet, deep focus' },
];

const environmentOptions = [
  { id: 'quiet',   label: 'Complete Silence',    icon: '🤫', description: 'No background noise' },
  { id: 'ambient', label: 'Ambient Sounds',       icon: '🌊', description: 'Nature sounds, white noise' },
  { id: 'music',   label: 'Background Music',     icon: '🎵', description: 'Instrumental or lo-fi' },
  { id: 'busy',    label: 'Busy Environment',     icon: '☕', description: 'Café, library buzz' },
];

const focusDurationOptions = [
  { id: 'short',    label: '15–25 minutes', icon: '⚡', description: 'Quick focus bursts, frequent breaks' },
  { id: 'medium',   label: '25–45 minutes', icon: '🎯', description: 'Standard focus sessions' },
  { id: 'long',     label: '45–90 minutes', icon: '🔥', description: 'Deep focus sessions' },
  { id: 'extended', label: '90+ minutes',   icon: '🚀', description: 'Marathon focus sessions' },
];

const goalOptions = [
  { id: 'academic',     label: 'Academic Success',    icon: '🎓' },
  { id: 'professional', label: 'Professional Growth', icon: '💼' },
  { id: 'personal',     label: 'Personal Development',icon: '🌱' },
  { id: 'creative',     label: 'Creative Projects',   icon: '🎨' },
  { id: 'health',       label: 'Health & Wellness',   icon: '💪' },
  { id: 'skills',       label: 'Skill Building',      icon: '🛠️' },
];

const learningStyleOptions = [
  {
    id: 'visual',
    label: 'Visual',
    icon: '👁️',
    description: 'You learn best through diagrams, charts, colour-coding, and mind maps.',
    tip: 'Try colour-coding your notes and drawing concept maps before starting a session.',
  },
  {
    id: 'auditory',
    label: 'Auditory',
    icon: '👂',
    description: 'You learn best by listening, discussing ideas, and talking through concepts.',
    tip: 'Read your notes aloud or explain topics to someone else to reinforce learning.',
  },
  {
    id: 'reading',
    label: 'Reading / Writing',
    icon: '📖',
    description: 'You learn best through reading text, writing notes, and structured lists.',
    tip: 'Summarise each topic in bullet-point lists and rewrite key concepts in your own words.',
  },
  {
    id: 'kinesthetic',
    label: 'Kinesthetic',
    icon: '✋',
    description: 'You learn best by doing — practice problems, experiments, and hands-on work.',
    tip: 'Break tasks into small practice exercises and test yourself as you go.',
  },
];

const distractionLevelOptions = [
  { id: 'low',    label: 'Rarely distracted',              icon: '🧘', description: 'I can focus for long stretches easily' },
  { id: 'medium', label: 'Occasionally distracted',        icon: '😐', description: 'I lose focus sometimes but recover quickly' },
  { id: 'high',   label: 'Frequently distracted',          icon: '😵', description: 'I struggle to stay on task without reminders' },
];

const distractionTypeOptions = [
  { id: 'phone',    label: 'Phone / social media', icon: '📱' },
  { id: 'noise',    label: 'Environmental noise',  icon: '🔊' },
  { id: 'social',   label: 'People around me',     icon: '👥' },
  { id: 'thoughts', label: 'Internal thoughts',    icon: '💭' },
];

const breakFrequencyOptions = [
  { id: '25',  label: 'Every 25 minutes', icon: '⏱️', description: 'Pomodoro-style — short, frequent breaks' },
  { id: '45',  label: 'Every 45 minutes', icon: '⏰', description: 'Balanced work-rest rhythm' },
  { id: '90',  label: 'Every 90 minutes', icon: '🕐', description: 'Deep work block with longer recovery' },
];

const breakActivityOptions = [
  { id: 'walk',  label: 'Walk / stretch',  icon: '🚶' },
  { id: 'snack', label: 'Snack / hydrate', icon: '🍎' },
  { id: 'music', label: 'Listen to music', icon: '🎧' },
  { id: 'nothing', label: 'Eyes closed / rest', icon: '😌' },
];

// Tips shown on the results card, keyed by learning style
const learningStyleBeginnerTips: Record<string, string[]> = {
  visual: [
    'Colour-code your notes by topic or priority before each session.',
    'Draw a quick mind-map of your task before you start the timer.',
    'Use the FocusPath session categories to visualise which subject gets the most time.',
  ],
  auditory: [
    'Narrate your plan out loud before pressing Start — it activates your learning mode.',
    'After each session, record a 60-second voice memo summarising what you did.',
    'Try explaining a concept to yourself while the timer runs — it deepens retention.',
  ],
  reading: [
    'Write a 3-bullet task list before each session to anchor your focus.',
    'After completing a session, jot down one key takeaway in your own words.',
    'Use the custom task field to write a precise, written goal before every timer.',
  ],
  kinesthetic: [
    'Break your work into small, completable exercises and tick them off as you go.',
    'Take a 2-minute physical break between sessions — it resets your focus energy.',
    'Set a concrete deliverable (e.g. "solve 10 problems") in the task field before starting.',
  ],
};

function generatePersonalizedAdvice(habits: StudyHabits): string[] {
  const advice: string[] = [];

  if (habits.preferredStudyTime === 'early-morning') {
    advice.push('Start with your most challenging tasks in the morning when your mind is freshest.');
  }
  if (habits.preferredStudyTime === 'night') {
    advice.push('Use evening sessions for review and reflection rather than learning new concepts.');
  }
  if (habits.focusDuration === 'short') {
    advice.push('Try a Medium Focus Session: 30 minutes of focused work followed by a 5-minute break.');
  }
  if (habits.focusDuration === 'long') {
    advice.push('Take a 15–20 minute break every 90 minutes to maintain peak performance.');
  }
  if (habits.studyEnvironment === 'music') {
    advice.push('Choose instrumental music without lyrics to avoid cognitive interference.');
  }
  if (habits.studyGoals.includes('academic')) {
    advice.push('Schedule regular review sessions to reinforce learning and improve retention.');
  }
  if (habits.learningStyle === 'visual') {
    advice.push('Colour-code your notes and use mind-maps to visualise complex topics.');
  }
  if (habits.learningStyle === 'kinesthetic') {
    advice.push('Practise with real examples and break work into small hands-on exercises.');
  }
  if (habits.distractionLevel === 'high') {
    advice.push('Start with shorter Easy Focus sessions to build your distraction resistance.');
  }

  return advice;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [studyHabits, setStudyHabits] = useState<StudyHabits>({
    preferredStudyTime: '',
    studyEnvironment: '',
    focusDuration: '',
    distractionLevel: '',
    primaryDistractions: [],
    motivationType: [],
    studyGoals: [],
    breakFrequency: '',
    breakActivity: '',
    learningStyle: '',
  });
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { currentUser } = useAuth();

  const totalSteps = 9;

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const toggleMulti = (field: keyof StudyHabits, id: string) => {
    setStudyHabits(prev => {
      const arr = (prev[field] as string[]) || [];
      return {
        ...prev,
        [field]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id],
      };
    });
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return displayName.trim().length > 0 && isUsernameValid;
      case 2: return !!studyHabits.preferredStudyTime;
      case 3: return !!studyHabits.studyEnvironment;
      case 4: return !!studyHabits.focusDuration;
      case 5: return studyHabits.studyGoals.length > 0;
      case 6: return studyHabits.motivationType.length > 0;
      case 7: return !!studyHabits.learningStyle;
      case 8: return !!studyHabits.distractionLevel;
      case 9: return !!studyHabits.breakFrequency && !!studyHabits.breakActivity;
      default: return false;
    }
  };

  const handleComplete = async () => {
    if (!currentUser || !displayName.trim() || !isUsernameValid) return;
    setLoading(true);
    try {
      const personalizedAdvice = generatePersonalizedAdvice(studyHabits);

      const profileData = {
        displayName: displayName.trim(),
        email: currentUser.email,
        isAnonymous: false,
        totalXP: 0,
        currentStreak: 0,
        longestStreak: 0,
        studyHabits,
        personalizedAdvice,
        profileCompleted: true,
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      await setDoc(doc(db, 'userProfiles', currentUser.uid), profileData);

      // Sync to Supabase (best-effort — optional integration)
      if (supabase) {
        try {
          await supabase.from('user_profiles').upsert({
            id: currentUser.uid,
            display_name: displayName.trim(),
            email: currentUser.email,
            profile_completed: true,
            preferences: studyHabits,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Supabase unavailable — Firebase saved successfully
        }
      }

      setShowResults(true);
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('There was an error setting up your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Results card ─────────────────────────────────────────────────────────
  if (showResults) {
    const style = learningStyleOptions.find(o => o.id === studyHabits.learningStyle);
    const tips = learningStyleBeginnerTips[studyHabits.learningStyle] || [];
    const styleIcons: Record<string, React.ReactNode> = {
      visual: <Eye className="h-8 w-8 text-blue-400" />,
      auditory: <Ear className="h-8 w-8 text-purple-400" />,
      reading: <BookOpen className="h-8 w-8 text-green-400" />,
      kinesthetic: <Hand className="h-8 w-8 text-orange-400" />,
    };

    return (
      <div className="min-h-screen theme-bg flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-lg">
          <div className="glass-card rounded-2xl p-8 shadow-2xl border border-white/20 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Brain className="h-10 w-10 text-purple-300" />
              <h1 className="text-2xl font-bold text-white">Your Learning Profile</h1>
            </div>
            <p className="text-gray-300 mb-6">Momo will use this to personalise every coaching tip and session reflection.</p>

            {/* Learning style badge */}
            <div className="bg-white/10 rounded-xl p-5 mb-6 border border-white/20">
              <div className="flex items-center justify-center gap-3 mb-2">
                {styleIcons[studyHabits.learningStyle]}
                <span className="text-xl font-bold text-white">{style?.label} Learner</span>
              </div>
              <p className="text-gray-300 text-sm">{style?.description}</p>
            </div>

            {/* Beginner tips */}
            <div className="text-left mb-6">
              <h3 className="text-white font-semibold mb-3">3 tips to get started:</h3>
              <div className="space-y-3">
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg p-3 border border-white/10">
                    <span className="text-purple-400 font-bold text-sm mt-0.5">{i + 1}.</span>
                    <p className="text-gray-200 text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onComplete}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 text-lg"
            >
              <CheckCircle className="h-5 w-5" />
              Start your focus journey
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Onboarding steps ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen theme-bg flex items-center justify-center p-4">

      <div className="relative z-10 w-full max-w-2xl">
        <div className="glass-card rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/icon16.png" alt="Focus Path™ Logo" className="h-16 w-16 rounded-2xl" />
              <h1 className="text-3xl font-bold text-white">Welcome to Focus Path™!</h1>
            </div>
            <p className="text-xl text-gray-300">Let's personalise your focus journey</p>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-300">Step {currentStep} of {totalSteps}</span>
              <span className="text-sm text-gray-300">{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-500"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step content */}
          <div className="min-h-[400px]">

            {/* Step 1 – Username */}
            {currentStep === 1 && (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">What should we call you?</h2>
                <p className="text-gray-300 mb-8">Choose a unique username for leaderboards and your profile</p>
                <div className="max-w-md mx-auto">
                  <UsernameInput
                    value={displayName}
                    onChange={setDisplayName}
                    onValidationChange={setIsUsernameValid}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Step 2 – Study time */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 text-center">When do you focus best?</h2>
                <p className="text-gray-300 mb-8 text-center">Choose your most productive time of day</p>
                <div className="space-y-3">
                  {studyTimeOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setStudyHabits(prev => ({ ...prev, preferredStudyTime: option.id }))}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        studyHabits.preferredStudyTime === option.id
                          ? 'border-blue-500 bg-blue-500/20 text-white'
                          : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm opacity-80">{option.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3 – Environment */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 text-center">What's your ideal study environment?</h2>
                <p className="text-gray-300 mb-8 text-center">Select the environment that helps you concentrate</p>
                <div className="space-y-3">
                  {environmentOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setStudyHabits(prev => ({ ...prev, studyEnvironment: option.id }))}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        studyHabits.studyEnvironment === option.id
                          ? 'border-green-500 bg-green-500/20 text-white'
                          : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm opacity-80">{option.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4 – Duration */}
            {currentStep === 4 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 text-center">How long can you focus?</h2>
                <p className="text-gray-300 mb-8 text-center">Choose your typical focus session length</p>
                <div className="space-y-3">
                  {focusDurationOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setStudyHabits(prev => ({ ...prev, focusDuration: option.id }))}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        studyHabits.focusDuration === option.id
                          ? 'border-purple-500 bg-purple-500/20 text-white'
                          : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm opacity-80">{option.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5 – Goals */}
            {currentStep === 5 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 text-center">What are your goals?</h2>
                <p className="text-gray-300 mb-8 text-center">Select all that apply</p>
                <div className="grid grid-cols-2 gap-3">
                  {goalOptions.map(goal => (
                    <button
                      key={goal.id}
                      onClick={() => toggleMulti('studyGoals', goal.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        studyHabits.studyGoals.includes(goal.id)
                          ? 'border-yellow-500 bg-yellow-500/20 text-white'
                          : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-center">
                        <span className="text-3xl block mb-2">{goal.icon}</span>
                        <div className="font-semibold text-sm">{goal.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6 – Motivation */}
            {currentStep === 6 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 text-center">What motivates you most?</h2>
                <p className="text-gray-300 mb-8 text-center">Select all that inspire you</p>
                <div className="space-y-3">
                  {[
                    { id: 'achievement', label: 'Achievements & Badges', icon: '🏆', description: 'Unlocking rewards and milestones' },
                    { id: 'progress',    label: 'Progress Tracking',     icon: '📈', description: 'Seeing improvement over time' },
                    { id: 'competition', label: 'Friendly Competition',  icon: '⚔️', description: 'Competing with others on leaderboards' },
                    { id: 'personal',    label: 'Personal Growth',       icon: '🌱', description: 'Self-improvement and learning' },
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => toggleMulti('motivationType', option.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        studyHabits.motivationType.includes(option.id)
                          ? 'border-pink-500 bg-pink-500/20 text-white'
                          : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm opacity-80">{option.description}</div>
                        </div>
                        {studyHabits.motivationType.includes(option.id) && (
                          <div className="ml-auto w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 7 – Learning style */}
            {currentStep === 7 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 text-center">How do you learn best?</h2>
                <p className="text-gray-300 mb-6 text-center">Momo will adapt its coaching style to match yours</p>
                <div className="space-y-3">
                  {learningStyleOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setStudyHabits(prev => ({ ...prev, learningStyle: option.id }))}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        studyHabits.learningStyle === option.id
                          ? 'border-cyan-500 bg-cyan-500/20 text-white'
                          : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm opacity-80">{option.description}</div>
                        </div>
                        {studyHabits.learningStyle === option.id && (
                          <div className="ml-auto w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 8 – Distraction profile */}
            {currentStep === 8 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 text-center">How easily are you distracted?</h2>
                <p className="text-gray-300 mb-5 text-center">Be honest — Momo uses this to tailor its focus strategies</p>

                <div className="space-y-3 mb-6">
                  {distractionLevelOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setStudyHabits(prev => ({ ...prev, distractionLevel: option.id }))}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        studyHabits.distractionLevel === option.id
                          ? 'border-orange-500 bg-orange-500/20 text-white'
                          : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm opacity-80">{option.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-gray-300 text-sm mb-3">What usually distracts you? <span className="text-gray-400">(optional — select all that apply)</span></p>
                <div className="grid grid-cols-2 gap-2">
                  {distractionTypeOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => toggleMulti('primaryDistractions', option.id)}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                        studyHabits.primaryDistractions.includes(option.id)
                          ? 'border-orange-400 bg-orange-500/15 text-white'
                          : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30'
                      }`}
                    >
                      <span>{option.icon}</span>
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 9 – Break preferences */}
            {currentStep === 9 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 text-center">How do you like to take breaks?</h2>
                <p className="text-gray-300 mb-5 text-center">Good breaks are part of great focus</p>

                <p className="text-white font-semibold mb-3 text-sm">Break frequency</p>
                <div className="space-y-3 mb-6">
                  {breakFrequencyOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setStudyHabits(prev => ({ ...prev, breakFrequency: option.id }))}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        studyHabits.breakFrequency === option.id
                          ? 'border-teal-500 bg-teal-500/20 text-white'
                          : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm opacity-80">{option.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-white font-semibold mb-3 text-sm">Favourite break activity</p>
                <div className="grid grid-cols-2 gap-3">
                  {breakActivityOptions.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setStudyHabits(prev => ({ ...prev, breakActivity: option.id }))}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        studyHabits.breakActivity === option.id
                          ? 'border-teal-400 bg-teal-500/15 text-white'
                          : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30'
                      }`}
                    >
                      <span className="text-2xl">{option.icon}</span>
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 text-gray-300 rounded-xl hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!canProceed() || loading}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                <CheckCircle className="h-4 w-4" />
                {loading ? 'Setting up...' : 'See my learning profile'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Target,
  Zap,
  Volume2,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { ExtensionBridge } from '../../services/ExtensionBridge';
import { FocusModeSelector, FocusMode } from './FocusModeSelector';
import { SchoolSubjectSelector, SchoolModeType } from './SchoolSubjectSelector';
import { WorkCategorySelector } from './WorkCategorySelector';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { soundService, SoundType } from '../../services/soundService';
import { MomoPreSession } from '../FocusAI/MomoPreSession';

interface SessionGoal {
  type: 'time' | 'quantity' | 'completion' | 'custom';
  description: string;
  target?: number;
  unit?: string;
}

interface PreSessionData {
  category: string;
  customTask: string;
  goal?: SessionGoal;
  motivation: string;
  focusMode?: FocusMode;
  schoolModeType?: SchoolModeType;
  subject?: string;
  workCategory?: string;
}

interface PreSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (data: PreSessionData) => void;
  sessionType: {
    id: string;
    name: string;
    duration: number;
    xp: number;
  };
}

const motivationalMessages = [
  "You've got this! Every focused minute counts.",
  'Transform your potential into progress.',
  'Focus is your superpower - use it wisely.',
  'Small steps lead to big achievements.',
  'Your future self will thank you for this focus.',
  'Excellence is built one session at a time.',
  'Turn your goals into reality through focus.',
  'Every expert was once a beginner who stayed focused.'
];

export function PreSessionModal({
  isOpen,
  onClose,
  onStartSession,
  sessionType
}: PreSessionModalProps) {
  const [customTask, setCustomTask] = useState<string>('');
  const [goal, setGoal] = useState<SessionGoal | undefined>(undefined);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalType, setGoalType] = useState<'time' | 'quantity' | 'completion' | 'custom'>('completion');
  const [goalDescription, setGoalDescription] = useState<string>('');
  const [goalTarget, setGoalTarget] = useState<number>(0);
  const [goalUnit, setGoalUnit] = useState<string>('');
  const [motivation, setMotivation] = useState<string>('');
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null);

  const [volumeChecked, setVolumeChecked] = useState(false);
  const [distractionsMinimized, setDistractionsMinimized] = useState(false);
  const [materialsReady, setMaterialsReady] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);

  const [focusMode, setFocusMode] = useState<FocusMode | null>(null);
  const [schoolModeType, setSchoolModeType] = useState<SchoolModeType | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [customSubject, setCustomSubject] = useState('');
  const [selectedWorkCategory, setSelectedWorkCategory] = useState<any>(null);
  const [customWorkCategory, setCustomWorkCategory] = useState('');

  const [userSoundType, setUserSoundType] = useState<SoundType>('classic-beep');
  const [userSoundVolume, setUserSoundVolume] = useState<number>(0.5);

  const extensionBridge = ExtensionBridge.getInstance();
  const modalRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();

  const getSubjectTailoredTasks = () => {
    if (focusMode === 'school' && (selectedSubject || customSubject)) {
      const subjectName = selectedSubject?.name || customSubject;
      const isHomework = schoolModeType === 'homework';

      if (isHomework) {
        return [
          `Complete ${subjectName} homework assignment`,
          `Solve 5 ${subjectName} practice problems`,
          `Review and take notes on ${subjectName} chapter`,
          `Finish ${subjectName} worksheet`,
          `Work on ${subjectName} project milestone`
        ];
      } else {
        return [
          `Study ${subjectName} for upcoming test`,
          `Review ${subjectName} flashcards`,
          `Complete ${subjectName} practice exam`,
          `Memorize key ${subjectName} concepts`,
          `Practice ${subjectName} sample questions`
        ];
      }
    } else if (focusMode === 'work' && (selectedWorkCategory || customWorkCategory)) {
      const categoryName = selectedWorkCategory?.name || customWorkCategory;
      return [
        `Complete ${categoryName} task`,
        `Work on ${categoryName} project`,
        `Review ${categoryName} documents`,
        `Update ${categoryName} deliverables`,
        `Plan ${categoryName} next steps`
      ];
    }
    return [];
  };

  const handleSuggestedGoal = (goalText: string, index: number) => {
    setCustomTask(goalText);
    setSelectedSuggestionIndex(index);
  };

  const playTestSound = () => {
    soundService.playSound(userSoundType, userSoundVolume);
    setAudioPlayed(true);
  };

  const handleGoalCreate = () => {
    if (!goalDescription.trim()) return;
    const newGoal: SessionGoal = {
      type: goalType,
      description: goalDescription.trim(),
      ...(goalType === 'quantity' && { target: goalTarget, unit: goalUnit })
    };
    setGoal(newGoal);
    setShowGoalInput(false);
  };

  const handleStartSession = () => {
    const sessionData: PreSessionData = {
      category: focusMode === 'school' ? 'homework' : 'work',
      customTask: customTask.trim(),
      goal,
      motivation,
      focusMode: focusMode || undefined,
      schoolModeType: schoolModeType || undefined,
      subject: selectedSubject ? selectedSubject.name : customSubject || undefined,
      workCategory: selectedWorkCategory ? selectedWorkCategory.name : customWorkCategory || undefined
    };

    extensionBridge.syncSessionData({
      currentSession: {
        ...sessionData,
        sessionType: sessionType.name,
        duration: sessionType.duration,
        xp: sessionType.xp,
        startTime: Date.now()
      },
      sessionStartTime: Date.now(),
      distractionCount: 0,
      focusScore: 100
    });

    onStartSession(sessionData);
  };

  const moveSuggestionSelection = (direction: 'up' | 'down') => {
    const tailoredTasks = getSubjectTailoredTasks();
    if (tailoredTasks.length === 0) return;

    let newIndex = selectedSuggestionIndex ?? 0;

    if (direction === 'up') newIndex = (newIndex - 1 + tailoredTasks.length) % tailoredTasks.length;
    else newIndex = (newIndex + 1) % tailoredTasks.length;

    setSelectedSuggestionIndex(newIndex);
    setCustomTask(tailoredTasks[newIndex]);
  };

  useEffect(() => {
    const loadUserSettings = async () => {
      if (!currentUser) return;

      try {
        const profileRef = doc(db, 'userProfiles', currentUser.uid);
        const profileDoc = await getDoc(profileRef);

        if (profileDoc.exists()) {
          const data = profileDoc.data();
          const soundType = data.settings?.preferences?.soundType || 'classic-beep';
          const soundVolume = data.settings?.preferences?.soundVolume ?? 0.5;

          setUserSoundType(soundType);
          setUserSoundVolume(soundVolume);
        }
      } catch (error) {
        console.error('Error loading user sound settings:', error);
      }
    };

    if (isOpen) {
      loadUserSettings();
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (!isOpen) return;

    setGoal(undefined);
    setShowGoalInput(false);
    setGoalType('completion');
    setGoalDescription('');
    setGoalTarget(0);
    setGoalUnit('');
    setStep(0);
    setFocusMode(null);
    setSchoolModeType(null);
    setSelectedSubject(null);
    setCustomSubject('');
    setSelectedWorkCategory(null);
    setCustomWorkCategory('');

    setCustomTask('');
    setSelectedSuggestionIndex(null);

    const msg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    setMotivation(msg);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 3) {
      const tailoredTasks = getSubjectTailoredTasks();
      if (tailoredTasks.length > 0) {
        setCustomTask(tailoredTasks[0]);
        setSelectedSuggestionIndex(0);
      }
    }
  }, [step]);


  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;

        case 'Enter':
          if (step === 0 && volumeChecked && distractionsMinimized && materialsReady) {
            setStep(1);
          } else if (step === 1 && focusMode) {
            setStep(2);
          } else if (step === 2 && focusMode === 'school' && schoolModeType && (selectedSubject || customSubject.trim())) {
            setStep(3);
          } else if (step === 2 && focusMode === 'work' && (selectedWorkCategory || customWorkCategory.trim())) {
            setStep(3);
          } else if (step === 3 && customTask.trim().length > 0) {
            handleStartSession();
          }
          break;

        case 'ArrowUp':
          if (step === 3) {
            e.preventDefault();
            moveSuggestionSelection('up');
          }
          break;

        case 'ArrowDown':
          if (step === 3) {
            e.preventDefault();
            moveSuggestionSelection('down');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    step,
    customTask,
    selectedSuggestionIndex,
    focusMode,
    schoolModeType,
    selectedSubject,
    customSubject,
    selectedWorkCategory,
    customWorkCategory,
    volumeChecked,
    distractionsMinimized,
    materialsReady,
    onClose
  ]);

  const canStartSession = customTask.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
    >
      <div className="glass-card rounded-2xl w-full max-w-lg border border-white/20 my-8">
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-white/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-2 rounded-xl">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Prepare Your Focus Session</h2>
                <p className="text-sm text-gray-300">
                  {sessionType.name} • {sessionType.duration} min • {sessionType.xp} XP
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-all"
              aria-label="Close modal"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {[0, 1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    step >= stepNum ? 'bg-blue-500 text-white' : 'bg-white/20 text-gray-400'
                  }`}
                >
                  {stepNum + 1}
                </div>
                <span className={`text-xs whitespace-nowrap ${step >= stepNum ? 'text-white' : 'text-gray-400'}`}>
                  {stepNum === 0 ? 'Setup' : stepNum === 1 ? 'Mode' : stepNum === 2 ? 'Subject' : 'Task'}
                </span>
                {stepNum < 3 && <div className="w-4 h-0.5 bg-white/20" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4">
          {step === 0 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-white mb-2">Quick Study Check</h3>
                <p className="text-sm text-gray-300">Let's make sure you're ready for a productive focus session</p>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl p-4 border border-white/10">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setVolumeChecked(!volumeChecked)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {volumeChecked ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1 flex items-center gap-2">
                        <Volume2 className="h-4 w-4" />
                        Volume Check
                      </h4>
                      <p className="text-sm text-gray-300 mb-2">
                        Make sure your volume is on so you can hear when your timer ends
                      </p>
                      <button
                        onClick={playTestSound}
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-1.5 rounded-lg text-sm transition-all"
                      >
                        {audioPlayed ? 'Play Again' : 'Test Sound'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-4 border border-white/10">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setDistractionsMinimized(!distractionsMinimized)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {distractionsMinimized ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1">Minimize Distractions</h4>
                      <p className="text-sm text-gray-300">
                        Close unnecessary tabs, silence your phone, and clear your workspace
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-4 border border-white/10">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setMaterialsReady(!materialsReady)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {materialsReady ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1">Materials Ready</h4>
                      <p className="text-sm text-gray-300">
                        Have everything you need within reach (books, notes, water, etc.)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(1)}
                  disabled={!volumeChecked || !distractionsMinimized || !materialsReady}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    volumeChecked && distractionsMinimized && materialsReady
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg'
                      : 'bg-white/10 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Continue
                  <span className="text-xs opacity-70">(Enter)</span>
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <FocusModeSelector
                selectedMode={focusMode}
                onSelectMode={(mode) => setFocusMode(mode)}
              />

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={!focusMode}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    focusMode
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg'
                      : 'bg-white/10 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Continue
                  <span className="text-xs opacity-70">(Enter)</span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && focusMode === 'school' && (
            <div className="space-y-4">
              <SchoolSubjectSelector
                selectedModeType={schoolModeType}
                selectedSubject={selectedSubject}
                customSubject={customSubject}
                onSelectModeType={(type) => setSchoolModeType(type)}
                onSelectSubject={(subject) => setSelectedSubject(subject)}
                onCustomSubjectChange={(value) => setCustomSubject(value)}
              />

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 px-4 py-2 rounded-lg font-semibold transition-all text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!schoolModeType || (!selectedSubject && !customSubject.trim())}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    schoolModeType && (selectedSubject || customSubject.trim())
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg'
                      : 'bg-white/10 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Continue
                  <span className="text-xs opacity-70">(Enter)</span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && focusMode === 'work' && (
            <div className="space-y-4">
              <WorkCategorySelector
                selectedCategory={selectedWorkCategory}
                customCategory={customWorkCategory}
                onSelectCategory={(category) => setSelectedWorkCategory(category)}
                onCustomCategoryChange={(value) => setCustomWorkCategory(value)}
              />

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 px-4 py-2 rounded-lg font-semibold transition-all text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!selectedWorkCategory && !customWorkCategory.trim()}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    selectedWorkCategory || customWorkCategory.trim()
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg'
                      : 'bg-white/10 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Continue
                  <span className="text-xs opacity-70">(Enter)</span>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-white mb-2">What specifically will you work on?</h3>
                <p className="text-sm text-gray-300">Be specific to stay focused and motivated</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Your Task <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={customTask}
                  onChange={(e) => setCustomTask(e.target.value)}
                  placeholder="e.g., Write introduction for history essay, Debug login authentication, Read Chapter 5 of textbook"
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-sm"
                  rows={2}
                  maxLength={200}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-400">{customTask.length}/200 characters</p>
                </div>
              </div>

              {getSubjectTailoredTasks().length > 0 && (
                <div>
                  <h4 className="font-semibold text-white mb-2 text-sm">
                    💡 Suggested Tasks for {selectedSubject?.name || customSubject || selectedWorkCategory?.name || customWorkCategory} (use ↑/↓ to browse)
                  </h4>
                  <div className="grid grid-cols-1 gap-1">
                    {getSubjectTailoredTasks().map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedGoal(suggestion, index)}
                        className={`text-left px-2 py-1.5 rounded-lg transition-all border text-xs ${
                          selectedSuggestionIndex === index
                            ? 'bg-blue-500/40 text-white border-blue-400'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10 hover:border-white/20'
                        }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg p-3 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white text-sm">Set a Specific Goal (Optional)</h4>
                  <button
                    onClick={() => setShowGoalInput(!showGoalInput)}
                    className="text-violet-400 hover:text-violet-300 text-xs transition-colors"
                  >
                    {showGoalInput ? 'Cancel' : 'Add Goal'}
                  </button>
                </div>

                {showGoalInput && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Goal Type</label>
                      <select
                        value={goalType}
                        onChange={(e) => setGoalType(e.target.value as any)}
                        className="w-full px-4 py-3 bg-transparent border border-white/20 rounded-lg text-white focus:text-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      >
                        <option value="completion">Complete a task</option>
                        <option value="quantity">Achieve a quantity</option>
                        <option value="time">Work for specific time</option>
                        <option value="custom">Custom goal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Goal Description</label>
                      <input
                        type="text"
                        value={goalDescription}
                        onChange={(e) => setGoalDescription(e.target.value)}
                        placeholder={
                          goalType === 'completion'
                            ? 'e.g., Finish the introduction section'
                            : goalType === 'quantity'
                            ? 'e.g., Write 300 words'
                            : goalType === 'time'
                            ? 'e.g., Study for 25 minutes straight'
                            : 'e.g., Review all notes thoroughly'
                        }
                        className="w-full px-2 py-1.5 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        maxLength={100}
                      />
                    </div>

                    {goalType === 'quantity' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">Target</label>
                          <input
                            type="number"
                            value={goalTarget}
                            onChange={(e) => setGoalTarget(parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">Unit</label>
                          <input
                            type="text"
                            value={goalUnit}
                            onChange={(e) => setGoalUnit(e.target.value)}
                            placeholder="e.g., words, pages, problems"
                            className="w-full px-2 py-1.5 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleGoalCreate}
                      disabled={!goalDescription.trim()}
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-300 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                    >
                      Set Goal
                    </button>
                  </div>
                )}

                {goal && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-green-300 text-xs">Goal Set!</div>
                        <div className="text-green-200 text-xs">{goal.description}</div>
                      </div>
                      <button
                        onClick={() => setGoal(undefined)}
                        className="text-green-400 hover:text-green-300 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Momo pre-session tip */}
              {currentUser && (
                <MomoPreSession
                  userId={currentUser.uid}
                  sessionType={sessionType.name}
                  category={
                    focusMode === 'school'
                      ? (selectedSubject?.name || customSubject || undefined)
                      : (selectedWorkCategory?.name || customWorkCategory || undefined)
                  }
                />
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 px-4 py-2 rounded-lg font-semibold transition-all text-sm"
                >
                  Back
                </button>
                <button
                  onClick={handleStartSession}
                  disabled={!canStartSession}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center gap-2 text-sm"
                >
                  Start Session
                  <Zap className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Star, Zap, Battery, BatteryMedium, BatteryLow, Skull, ThumbsUp, ThumbsDown, Minus, X, ChevronRight } from 'lucide-react';

interface SurveyData {
  focus_rating?: number;
  energy_level?: 'exhausted' | 'tired' | 'neutral' | 'energized' | 'pumped';
  difficulty_assessment?: 'too_easy' | 'just_right' | 'too_hard';
  would_repeat?: 'yes' | 'no' | 'maybe';
  notes?: string;
  completed_at?: string;
  skipped?: boolean;
}

interface PostSessionSurveyProps {
  onComplete: (data: SurveyData) => void;
  onSkip: () => void;
  sessionType: string;
  focusScore?: number;
}

export default function PostSessionSurvey({ onComplete, onSkip, sessionType }: PostSessionSurveyProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [surveyData, setSurveyData] = useState<SurveyData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalQuestions = 5;

  const handleAnswer = (field: keyof SurveyData, value: any) => {
    const newData = { ...surveyData, [field]: value };
    setSurveyData(newData);

    if (currentQuestion < totalQuestions - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    } else {
      handleSubmit(newData);
    }
  };

  const handleSubmit = async (finalData: SurveyData) => {
    setIsSubmitting(true);
    const completeData: SurveyData = {
      ...finalData,
      completed_at: new Date().toISOString(),
      skipped: false,
    };

    setTimeout(() => {
      onComplete(completeData);
    }, 300);
  };

  const handleSkipSurvey = () => {
    onSkip();
  };

  const energyOptions = [
    { id: 'exhausted', emoji: '😵', label: 'Exhausted', icon: Skull, color: 'text-red-500' },
    { id: 'tired', emoji: '😪', label: 'Tired', icon: BatteryLow, color: 'text-orange-500' },
    { id: 'neutral', emoji: '😐', label: 'Neutral', icon: BatteryMedium, color: 'text-yellow-500' },
    { id: 'energized', emoji: '😊', label: 'Energized', icon: Battery, color: 'text-green-500' },
    { id: 'pumped', emoji: '🚀', label: 'Pumped', icon: Zap, color: 'text-blue-500' },
  ];

  const renderQuestion = () => {
    switch (currentQuestion) {
      case 0:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-center text-white">
              How focused were you?
            </h3>
            <p className="text-gray-400 text-center text-sm">
              Rate your overall focus during this session
            </p>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleAnswer('focus_rating', rating)}
                  className="group relative transition-all duration-200 hover:scale-110"
                  aria-label={`Rate ${rating} stars`}
                >
                  <Star
                    size={48}
                    className={`transition-all ${
                      surveyData.focus_rating && surveyData.focus_rating >= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-600 group-hover:text-yellow-400/50'
                    }`}
                  />
                  <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {rating}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 px-4">
              <span>Not focused</span>
              <span>Very focused</span>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-center text-white">
              How do you feel now?
            </h3>
            <p className="text-gray-400 text-center text-sm">
              What's your energy level after this session?
            </p>
            <div className="grid grid-cols-5 gap-3">
              {energyOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAnswer('energy_level', option.id)}
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 border-2 border-transparent hover:border-white/20 transition-all duration-200 hover:scale-105"
                  aria-label={option.label}
                >
                  <span className="text-4xl">{option.emoji}</span>
                  <span className={`text-xs font-medium ${option.color}`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-center text-white">
              How was the difficulty?
            </h3>
            <p className="text-gray-400 text-center text-sm">
              Was this {sessionType} session the right challenge level?
            </p>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleAnswer('difficulty_assessment', 'too_easy')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-green-500/10 hover:bg-green-500/20 border-2 border-green-500/30 hover:border-green-500/50 transition-all duration-200 hover:scale-105"
              >
                <div className="text-4xl">😴</div>
                <span className="text-green-400 font-semibold">Too Easy</span>
                <span className="text-xs text-gray-400">Not challenging</span>
              </button>
              <button
                onClick={() => handleAnswer('difficulty_assessment', 'just_right')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border-2 border-blue-500/30 hover:border-blue-500/50 transition-all duration-200 hover:scale-105"
              >
                <div className="text-4xl">👍</div>
                <span className="text-blue-400 font-semibold">Just Right</span>
                <span className="text-xs text-gray-400">Perfect balance</span>
              </button>
              <button
                onClick={() => handleAnswer('difficulty_assessment', 'too_hard')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/30 hover:border-red-500/50 transition-all duration-200 hover:scale-105"
              >
                <div className="text-4xl">😰</div>
                <span className="text-red-400 font-semibold">Too Hard</span>
                <span className="text-xs text-gray-400">Very challenging</span>
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-center text-white">
              Would you do this again?
            </h3>
            <p className="text-gray-400 text-center text-sm">
              Would you repeat a {sessionType} session like this?
            </p>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleAnswer('would_repeat', 'yes')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-green-500/10 hover:bg-green-500/20 border-2 border-green-500/30 hover:border-green-500/50 transition-all duration-200 hover:scale-105"
              >
                <ThumbsUp size={40} className="text-green-400" />
                <span className="text-green-400 font-semibold">Yes</span>
                <span className="text-xs text-gray-400">Definitely</span>
              </button>
              <button
                onClick={() => handleAnswer('would_repeat', 'maybe')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border-2 border-yellow-500/30 hover:border-yellow-500/50 transition-all duration-200 hover:scale-105"
              >
                <Minus size={40} className="text-yellow-400" />
                <span className="text-yellow-400 font-semibold">Maybe</span>
                <span className="text-xs text-gray-400">Not sure</span>
              </button>
              <button
                onClick={() => handleAnswer('would_repeat', 'no')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/30 hover:border-red-500/50 transition-all duration-200 hover:scale-105"
              >
                <ThumbsDown size={40} className="text-red-400" />
                <span className="text-red-400 font-semibold">No</span>
                <span className="text-xs text-gray-400">Not really</span>
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-center text-white">
              Any thoughts?
            </h3>
            <p className="text-gray-400 text-center text-sm">
              Optional: Share what helped you focus or what distracted you
            </p>
            <textarea
              value={surveyData.notes || ''}
              onChange={(e) => setSurveyData({ ...surveyData, notes: e.target.value })}
              placeholder="What helped you focus? What distracted you? (Optional)"
              className="w-full h-32 px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {surveyData.notes?.length || 0}/500 characters
              </span>
              <button
                onClick={() => handleSubmit(surveyData)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="survey-title"
    >
      <div className="w-full max-w-2xl">
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-400">
                    Question {currentQuestion + 1} of {totalQuestions}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={handleSkipSurvey}
                className="ml-4 text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                aria-label="Skip survey"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-8 min-h-[400px] flex items-center justify-center">
            <div className="w-full max-w-xl">
              {renderQuestion()}
            </div>
          </div>

          <div className="p-4 border-t border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkipSurvey}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Skip Survey
              </button>
              <span className="text-xs text-gray-500">
                Takes only 15 seconds
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

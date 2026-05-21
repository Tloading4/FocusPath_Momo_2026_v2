import { useState, useEffect } from 'react';
import { MessageCircle, ArrowRight, Sparkles } from 'lucide-react';
import { buildUserContext } from '../../services/SupabaseMomoAIService';
import { generatePostSessionReflection } from '../../services/claudeAIService';

export interface SessionSummary {
  sessionType?: string;
  sessionTypeName?: string;
  duration?: number;
  completed?: boolean;
  category?: string;
  focusScore?: number;
  distractionCount?: number;
  analytics?: {
    focusScore?: number;
    distractionCount?: number;
  };
}

export interface SurveyResult {
  focus_rating?: number;
  energy_level?: string;
  difficulty_assessment?: string;
  would_repeat?: string;
  notes?: string;
}

interface MomoPostSessionProps {
  userId: string;
  sessionData: SessionSummary;
  surveyData?: SurveyResult;
  onChatWithMomo?: () => void;
  onDone: () => void;
}

export function MomoPostSession({ userId, sessionData, surveyData, onChatWithMomo, onDone }: MomoPostSessionProps) {
  const [reflection, setReflection] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchReflection() {
      try {
        const userContext = await buildUserContext(userId);
        const { reflection, nextStep } = await generatePostSessionReflection(
          userContext,
          sessionData as Record<string, unknown>,
          surveyData as Record<string, unknown> | undefined
        );
        if (!cancelled) {
          setReflection(reflection);
          setNextStep(nextStep);
        }
      } catch {
        if (!cancelled) {
          const score = sessionData.analytics?.focusScore ?? sessionData.focusScore ?? 0;
          const completed = sessionData.completed;
          setReflection(
            completed
              ? `You completed the session with a focus score of ${score}/100. That's real progress!`
              : `You put in the effort — even incomplete sessions build your focus habit.`
          );
          setNextStep("Take a short break, then try another session to keep your streak alive.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReflection();
    return () => { cancelled = true; };
  }, [userId, sessionData, surveyData]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl w-full max-w-md border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-white/20 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/30 p-2 rounded-xl">
              <Sparkles className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Momo's Reflection</h2>
              <p className="text-sm text-gray-300">Personalised feedback on your session</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 bg-white/10 rounded animate-pulse w-full" />
              <div className="h-4 bg-white/10 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-white/10 rounded animate-pulse w-4/5" />
              <div className="h-3 rounded animate-pulse w-3/4 mt-2" />
            </div>
          ) : (
            <>
              {/* Reflection */}
              <div className="rounded-xl p-4 border border-white/10">
                <p className="text-gray-200 text-sm leading-relaxed">{reflection}</p>
              </div>

              {/* Next step */}
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                <p className="text-xs font-semibold text-blue-300 mb-1.5">Next step</p>
                <p className="text-gray-200 text-sm leading-relaxed">{nextStep}</p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            {onChatWithMomo && (
              <button
                onClick={onChatWithMomo}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-sm font-semibold transition-all border border-purple-500/30"
              >
                <MessageCircle className="h-4 w-4" />
                Chat with Momo
              </button>
            )}
            <button
              onClick={onDone}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all"
            >
              Back to Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { buildUserContext } from '../../services/SupabaseMomoAIService';
import { generatePreSessionTip } from '../../services/claudeAIService';

const FALLBACK_TIPS: Record<string, string> = {
  visual: 'Try sketching a quick mind-map of your task before you start — it primes your brain for visual processing.',
  auditory: 'Briefly say your goal out loud before pressing start. Hearing your intention activates your focus mode.',
  kinesthetic: 'Break your task into 3 concrete mini-steps and tackle them one at a time.',
  reading: 'Write a one-sentence goal in the task field. A clear written objective keeps you anchored throughout the session.',
  default: "You've got this! Silence notifications, take a breath, and let the timer do the rest.",
};

interface MomoPreSessionProps {
  userId: string;
  sessionType: string;
  category?: string;
}

export function MomoPreSession({ userId, sessionType, category }: MomoPreSessionProps) {
  const [tip, setTip] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchTip() {
      setLoading(true);
      try {
        const userContext = await buildUserContext(userId);
        const aiTip = await generatePreSessionTip(userContext, sessionType, category);
        if (!cancelled) setTip(aiTip);
      } catch {
        if (!cancelled) {
          try {
            const ctx = await buildUserContext(userId);
            const ls = ((ctx.profile as Record<string, string>)?.learningStyle) || 'default';
            setTip(FALLBACK_TIPS[ls] || FALLBACK_TIPS.default);
          } catch {
            setTip(FALLBACK_TIPS.default);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTip();
    return () => { cancelled = true; };
  }, [userId, sessionType, category]);

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="bg-purple-500/20 p-1.5 rounded-lg flex-shrink-0 mt-0.5">
          <Sparkles className="h-4 w-4 text-purple-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-purple-300 mb-1">Momo's tip</p>
          {loading ? (
            <div className="space-y-1.5">
              <div className="h-3 bg-white/10 rounded animate-pulse w-full" />
              <div className="h-3 bg-white/10 rounded animate-pulse w-4/5" />
            </div>
          ) : (
            <p className="text-gray-200 text-sm leading-relaxed">{tip}</p>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, TrendingUp, Lightbulb, Trophy, AlertCircle, RefreshCw } from 'lucide-react';
import { buildUserContext } from '../../services/SupabaseMomoAIService';
import { firebaseMomoService } from '../../services/FirebaseMomoService';
import { generateInsights } from '../../services/claudeAIService';

interface Insight {
  type: 'pattern' | 'recommendation' | 'achievement' | 'alert';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  action?: string;
}

interface MomoInsightsProps {
  userId: string;
  onChatWithMomo?: () => void;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  pattern:        { icon: <TrendingUp className="h-4 w-4" />,   color: 'text-blue-300',   bg: 'bg-blue-500/15 border-blue-500/30' },
  recommendation: { icon: <Lightbulb className="h-4 w-4" />,   color: 'text-yellow-300', bg: 'bg-yellow-500/15 border-yellow-500/30' },
  achievement:    { icon: <Trophy className="h-4 w-4" />,       color: 'text-green-300',  bg: 'bg-green-500/15 border-green-500/30' },
  alert:          { icon: <AlertCircle className="h-4 w-4" />,  color: 'text-orange-300', bg: 'bg-orange-500/15 border-orange-500/30' },
};

export function MomoInsights({ userId, onChatWithMomo }: MomoInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadInsights = useCallback(async (force = false) => {
    try {
      setError(false);

      // Check cache first (unless forced refresh)
      if (!force) {
        const cached = await firebaseMomoService.getCachedInsights(userId);
        if (cached && cached.length > 0) {
          setInsights(cached);
          setLoading(false);
          return;
        }
      }

      if (force) setRefreshing(true);

      const userContext = await buildUserContext(userId);
      const newInsights = (await generateInsights(userContext)) as Insight[];

      setInsights(newInsights);
      await firebaseMomoService.saveInsights(userId, newInsights);
    } catch {
      setError(true);
      setInsights([
        {
          type: 'recommendation',
          title: 'Complete sessions to unlock insights',
          description: 'Momo needs a few sessions to identify your patterns and give you personalised advice.',
          priority: 'medium',
          action: 'Complete 3 focus sessions to see your first insights.',
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="bg-purple-500/20 p-1.5 rounded-lg">
            <Sparkles className="h-4 w-4 text-purple-300" />
          </div>
          <h3 className="text-white font-semibold">Momo's Insights</h3>
          <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">AI-generated</span>
        </div>
        <button
          onClick={() => loadInsights(true)}
          disabled={refreshing}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          title="Refresh insights"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse border border-white/10" />
          ))
        ) : (
          <>
            {insights.map((insight, i) => {
              const cfg = typeConfig[insight.type] || typeConfig.recommendation;
              return (
                <div key={i} className={`rounded-xl p-4 border ${cfg.bg}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex-shrink-0 ${cfg.color}`}>{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-semibold ${cfg.color}`}>{insight.title}</p>
                        {insight.priority === 'high' && (
                          <span className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full">High priority</span>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{insight.description}</p>
                      {insight.action && (
                        <p className="text-xs text-gray-400 mt-2 italic">→ {insight.action}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {!error && onChatWithMomo && (
              <button
                onClick={onChatWithMomo}
                className="w-full py-3 text-sm text-purple-300 hover:text-purple-200 border border-purple-500/30 hover:border-purple-400/50 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-purple-500/10"
              >
                <Sparkles className="h-4 w-4" />
                Ask Momo about these insights
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

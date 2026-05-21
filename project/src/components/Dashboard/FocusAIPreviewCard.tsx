import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Bot, Sparkles, TrendingUp, ArrowRight, Brain } from 'lucide-react';

interface FocusAIPreviewCardProps {
  refreshTrigger: number;
  onOpenAI: () => void;
}

export function FocusAIPreviewCard({ refreshTrigger, onOpenAI }: FocusAIPreviewCardProps) {
  const [focusScore, setFocusScore] = useState<number>(0);
  const [insightCount, setInsightCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [latestInsight, setLatestInsight] = useState<string>('');
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchAIData();
    }
  }, [currentUser, refreshTrigger]);

  const fetchAIData = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const sessionsQuery = query(
        collection(db, 'userProfiles', currentUser.uid, 'sessions'),
        orderBy('startTime', 'desc')
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessions = sessionsSnapshot.docs.map(doc => doc.data());

      const totalDistractions = sessions.reduce((sum, session) => sum + (session.distractions?.count || 0), 0);
      const avgDistractions = sessions.length > 0 ? totalDistractions / sessions.length : 0;
      const calculatedFocusScore = Math.max(0, Math.min(100, 100 - (avgDistractions * 10)));

      setFocusScore(Math.round(calculatedFocusScore));

      const insights = generateInsightCount(sessions);
      setInsightCount(insights.count);
      setLatestInsight(insights.latest);

    } catch (error) {
      console.error('Error fetching AI data:', error);
      setFocusScore(0);
      setInsightCount(0);
    } finally {
      setLoading(false);
    }
  };

  const generateInsightCount = (sessions: any[]) => {
    let count = 0;
    let latest = 'Start a session to get AI insights';

    if (sessions.length === 0) {
      return { count: 0, latest };
    }

    if (sessions.length >= 5) {
      count++;
      latest = 'Pattern analysis available';
    }

    if (sessions.length >= 10) {
      count++;
      latest = 'Predictive insights ready';
    }

    const recentSessions = sessions.slice(0, 7);
    if (recentSessions.length >= 3) {
      count++;
      latest = 'Weekly performance trends detected';
    }

    const totalDistractions = sessions.reduce((sum, s) => sum + (s.distractions?.count || 0), 0);
    const avgDistractions = totalDistractions / sessions.length;
    if (avgDistractions > 3) {
      count++;
      latest = 'High distraction alert - AI recommendations available';
    } else if (avgDistractions < 1.5) {
      count++;
      latest = 'Excellent focus detected - keep it up!';
    }

    return { count: Math.max(count, sessions.length > 0 ? 1 : 0), latest };
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 shadow-xl hover-lift h-full">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-400 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 shadow-xl hover-lift h-full transition-all duration-300 hover:shadow-2xl group cursor-pointer" onClick={onOpenAI}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl animate-pulse-glow relative">
            <Bot className="h-6 w-6 text-white" />
            <div className="absolute -top-1 -right-1 bg-green-400 w-3 h-3 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Focus AI</h3>
            <p className="text-gray-300 text-xs">AI-Powered Insights</p>
          </div>
        </div>
        <Brain className="h-5 w-5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between rounded-lg p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <span className="text-gray-300 text-sm">Focus Score</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">{focusScore}%</span>
            {focusScore >= 80 ? (
              <span className="text-green-400 text-xs">Excellent</span>
            ) : focusScore >= 60 ? (
              <span className="text-yellow-400 text-xs">Good</span>
            ) : (
              <span className="text-orange-400 text-xs">Needs Work</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-gray-300 text-sm">AI Insights</span>
          </div>
          <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-semibold">
            {insightCount} Available
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
          <p className="text-gray-300 text-xs leading-relaxed">{latestInsight}</p>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenAI();
        }}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 font-medium group-hover:scale-[1.02]"
      >
        <span>Open Focus AI</span>
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}

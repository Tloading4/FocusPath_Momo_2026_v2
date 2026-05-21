import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// Cloud Function callable references (Firebase fallback)
const momoChatFn = httpsCallable<
  { messages: ClaudeMessage[]; systemPrompt?: string; maxTokens?: number; model?: string },
  { text: string }
>(functions, 'momoChat');

const getRemainingMessagesFn = httpsCallable<
  Record<string, never>,
  { used: number; limit: number; remaining: number; isPremium: boolean }
>(functions, 'getRemainingMessages');

async function callClaudeViaEdgeFunction(
  messages: ClaudeMessage[],
  systemPrompt: string,
  maxTokens: number,
  model?: string
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured');
  }
  const res = await fetch(`${supabaseUrl}/functions/v1/momo-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
      Apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ messages, systemPrompt, maxTokens, model }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`momo-chat edge function error: ${err}`);
  }
  const data = await res.json();
  return data.text ?? '';
}

export const MOMO_SYSTEM_PROMPT = `You are Momo, a warm and encouraging AI study companion inside Focus Path™, a personal productivity app. You have access to the user's real study session data, focus scores, streaks, and goals.

Your personality: encouraging, concise, data-driven, slightly playful. You celebrate wins and gently guide improvement without being preachy.

Rules:
- Never use markdown formatting (no **, ##, -, or bullet symbols)
- Keep tips to 1-3 sentences
- Keep chat responses to 2-5 sentences
- Keep insights/reflections to 3-6 sentences
- Reference actual numbers from the user's data when available
- End chat responses with one concrete actionable suggestion when appropriate
- Never say you are an AI or mention Anthropic or Claude`;

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CallClaudeOptions {
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
}

export async function callClaude(
  messages: ClaudeMessage[],
  options: CallClaudeOptions = {}
): Promise<string> {
  const { model, maxTokens = 512, systemPrompt = MOMO_SYSTEM_PROMPT } = options;

  // Try Supabase Edge Function first; fall back to Firebase Cloud Function
  if (import.meta.env.VITE_SUPABASE_URL) {
    return callClaudeViaEdgeFunction(messages, systemPrompt, maxTokens, model);
  }

  const result = await momoChatFn({ messages, systemPrompt, maxTokens, model });
  return result.data.text;
}

export async function getRemainingMessages(): Promise<{
  used: number;
  limit: number;
  remaining: number;
  isPremium: boolean;
}> {
  const result = await getRemainingMessagesFn({});
  return result.data;
}

export async function generatePreSessionTip(
  userContext: Record<string, unknown>,
  sessionType: string,
  category?: string
): Promise<string> {
  const profile = (userContext.profile as Record<string, unknown>) || {};
  const stats = (userContext.statistics as Record<string, unknown>) || {};

  const prompt = `The user is about to start a ${sessionType} focus session${category ? ` on ${category}` : ''}.

Their profile:
- Learning style: ${profile.learningStyle || 'not set'}
- Current streak: ${profile.currentStreak || 0} days
- Average focus score: ${stats.averageFocusScore || 'unknown'}%
- Total sessions completed: ${stats.completedSessions || 0}

Give them a single personalized, encouraging tip to help them get into focus mode right now. 1-2 sentences max.`;

  return callClaude([{ role: 'user', content: prompt }], { maxTokens: 150 });
}

export async function generatePostSessionReflection(
  userContext: Record<string, unknown>,
  sessionData: Record<string, unknown>,
  surveyData?: Record<string, unknown>
): Promise<{ reflection: string; nextStep: string }> {
  const profile = (userContext.profile as Record<string, unknown>) || {};
  const focusScore = sessionData.focusScore ?? (sessionData.analytics as any)?.focusScore ?? 0;
  const distractions = sessionData.distractionCount ?? (sessionData.analytics as any)?.distractionCount ?? 0;
  const duration = sessionData.duration ?? 0;
  const completed = sessionData.completed ?? false;
  const category = sessionData.category || 'general';

  const surveyText = surveyData
    ? `Survey feedback: focus rating ${surveyData.focus_rating || 'N/A'}/5, energy ${surveyData.energy_level || 'N/A'}, difficulty ${surveyData.difficulty_assessment || 'N/A'}`
    : '';

  const prompt = `The user just completed a ${duration}-minute ${category} focus session.
Results: focus score ${focusScore}%, ${distractions} distractions, session ${completed ? 'completed fully' : 'ended early'}.
User name: ${profile.displayName || 'Focus Warrior'}, streak: ${profile.currentStreak || 0} days.
${surveyText}

Provide:
1. A brief, specific reflection (2-3 sentences) acknowledging what they did and what the numbers show
2. One concrete next step they should take (1 sentence)

Format your response as JSON with keys "reflection" and "nextStep". No other text.`;

  try {
    const raw = await callClaude([{ role: 'user', content: prompt }], { maxTokens: 300 });
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      reflection: parsed.reflection || raw,
      nextStep: parsed.nextStep || '',
    };
  } catch {
    const fallback = await callClaude(
      [{ role: 'user', content: `The user just finished a ${duration}-min session with ${focusScore}% focus. Give a 2-sentence encouraging reflection.` }],
      { maxTokens: 150 }
    );
    return { reflection: fallback, nextStep: 'Keep the momentum going with your next session!' };
  }
}

export async function generateInsights(
  userContext: Record<string, unknown>
): Promise<Array<{ type: string; title: string; description: string; priority: string; action?: string }>> {
  const profile = (userContext.profile as Record<string, unknown>) || {};
  const stats = (userContext.statistics as Record<string, unknown>) || {};
  const recentSessions = (userContext.recentSessions as unknown[]) || [];

  const prompt = `Analyze this user's study data and generate 3-4 personalized insights.

User: ${profile.displayName || 'Focus Warrior'}, Level ${profile.currentLevel || 1}, ${profile.currentStreak || 0}-day streak
Stats: ${stats.completedSessions || 0} sessions completed, ${stats.averageFocusScore || 0}% avg focus, ${stats.completionRate || 0}% completion rate
Recent sessions: ${recentSessions.length} tracked

Generate a JSON array of insights. Each insight has: type (one of: pattern, recommendation, achievement, alert), title (5 words max), description (2 sentences), priority (low/medium/high), action (optional short action text).

Return only the JSON array, no other text.`;

  try {
    const raw = await callClaude([{ role: 'user', content: prompt }], { maxTokens: 600 });
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [
      {
        type: 'recommendation',
        title: 'Keep Building Your Streak',
        description: `You're on a ${(profile.currentStreak as number) || 0}-day streak. Consistency is the #1 driver of long-term focus improvement.`,
        priority: 'high',
        action: 'Start a session today',
      },
    ];
  }
}

export async function generateStudyBuddyResponse(
  userMessage: string,
  sessionContext: {
    category: string;
    customTask: string;
    focusScore: number;
    sessionProgress: number;
    timeRemaining: number;
    distractionCount: number;
    keystrokes: number;
  }
): Promise<string> {
  const { category, customTask, focusScore, sessionProgress, timeRemaining, distractionCount } = sessionContext;
  const minutesLeft = Math.floor(timeRemaining / 60);

  const systemPrompt = `${MOMO_SYSTEM_PROMPT}

Current session context:
- Task: "${customTask}" (${category})
- Progress: ${Math.round(sessionProgress)}% complete
- Focus score: ${focusScore}%
- Distractions: ${distractionCount}
- Time remaining: ${minutesLeft} minutes

You are actively monitoring this session. Give highly specific, real-time support based on these exact numbers.`;

  return callClaude(
    [{ role: 'user', content: userMessage }],
    { systemPrompt, maxTokens: 200 }
  );
}

export async function generateWeeklyReport(
  userContext: Record<string, unknown>
): Promise<string> {
  const profile = (userContext.profile as Record<string, unknown>) || {};
  const stats = (userContext.statistics as Record<string, unknown>) || {};
  const recentSessions = (userContext.recentSessions as unknown[]) || [];

  const weekSessions = recentSessions.slice(0, 7);

  const prompt = `Generate a weekly progress report for this user.

User: ${profile.displayName || 'Focus Warrior'}
This week: ${weekSessions.length} sessions, avg focus ${stats.averageFocusScore || 0}%, streak ${profile.currentStreak || 0} days
Total XP: ${profile.totalXP || 0}, Level ${profile.currentLevel || 1}

Write a motivating weekly summary (4-5 sentences). Mention specific numbers. End with one goal for next week.`;

  return callClaude([{ role: 'user', content: prompt }], { maxTokens: 300 });
}

export async function chatWithMomo(
  message: string,
  conversationHistory: ClaudeMessage[],
  userContext: Record<string, unknown>
): Promise<string> {
  const profile = (userContext.profile as Record<string, unknown>) || {};
  const stats = (userContext.statistics as Record<string, unknown>) || {};

  const systemPrompt = `${MOMO_SYSTEM_PROMPT}

User profile summary:
- Name: ${profile.displayName || 'Focus Warrior'}
- Level ${profile.currentLevel || 1}, ${profile.totalXP || 0} XP
- ${profile.currentStreak || 0}-day streak (longest: ${profile.longestStreak || 0})
- ${stats.completedSessions || 0} sessions completed, ${stats.averageFocusScore || 0}% avg focus
- Learning style: ${profile.learningStyle || 'not specified'}
- Study goals: ${(profile.studyGoals as string[])?.join(', ') || 'not specified'}`;

  const messages: ClaudeMessage[] = [
    ...conversationHistory.slice(-8),
    { role: 'user', content: message },
  ];

  return callClaude(messages, { systemPrompt, maxTokens: 400 });
}

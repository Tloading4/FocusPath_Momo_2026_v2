import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { firebaseSessionService } from './FirebaseSessionService';
import { firebaseMomoService, MomoConversation, MomoMessage } from './FirebaseMomoService';
import { chatWithMomo } from './claudeAIService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  last_message_at: string;
  is_active: boolean;
}

export interface ChatResponse {
  message: string;
  conversationId: string;
  remainingMessages: number;
}

export interface UsageInfo {
  allowed: boolean;
  remaining: number;
  limit: number;
  is_premium: boolean;
}

/** Build the full user context object from Firebase to send to the backend */
async function buildUserContext(userId: string): Promise<Record<string, unknown>> {
  try {
    const [profileSnap, sessions] = await Promise.all([
      getDoc(doc(db, 'userProfiles', userId)),
      firebaseSessionService.getUserSessions(userId),
    ]);

    const profileData = profileSnap.data() || {};
    const stats = firebaseSessionService.calculateStats(sessions);
    const studyHabits = profileData.studyHabits || {};

    // Recent survey responses stored under preferences.recentSurveys
    const surveyHistory: unknown[] = profileData.preferences?.recentSurveys || [];

    const recentSessions = sessions.slice(0, 10).map(s => ({
      type: s.sessionType,
      duration: s.duration,
      completed: s.completed,
      focusScore: s.analytics?.focusScore ?? 0,
      distractions: s.analytics?.distractionCount ?? 0,
      category: s.category || 'general',
      subject: s.subject || '',
      date: s.date instanceof Date ? s.date.toISOString() : String(s.date),
      pauseCount: s.analytics?.pauseCount ?? 0,
    }));

    return {
      profile: {
        displayName: profileData.displayName || 'Focus Warrior',
        totalXP: profileData.totalXP || 0,
        currentLevel: profileData.currentLevel || 1,
        currentStreak: profileData.currentStreak || 0,
        longestStreak: profileData.longestStreak || 0,
        learningStyle: studyHabits.learningStyle || '',
        distractionLevel: studyHabits.distractionLevel || '',
        primaryDistractions: studyHabits.primaryDistractions || [],
        studyGoals: studyHabits.studyGoals || [],
        motivationType: studyHabits.motivationType || [],
        preferredStudyTime: studyHabits.preferredStudyTime || '',
        studyEnvironment: studyHabits.studyEnvironment || '',
        breakFrequency: studyHabits.breakFrequency || '',
        breakActivity: studyHabits.breakActivity || '',
      },
      statistics: {
        totalSessions: stats.totalSessions,
        completedSessions: stats.completedSessions,
        completionRate: stats.completionRate,
        averageFocusScore: stats.averageFocusScore,
        averageSessionLength: stats.averageSessionLength,
        totalFocusTime: stats.totalFocusTime,
        averageDistractionsPerSession: stats.averageDistractionsPerSession,
        recentSessionsCount: stats.recentSessionsCount,
        mostProductiveTimeOfDay: stats.commonDistractionPatterns?.mostProductiveTimeOfDay || 'unknown',
      },
      recentSessions,
      surveyHistory,
      currentTime: new Date().toISOString(),
    };
  } catch (error) {
    console.error('buildUserContext error:', error);
    return { currentTime: new Date().toISOString() };
  }
}

class SupabaseMomoAIService {
  async sendMessage(
    message: string,
    userId: string,
    conversationId?: string
  ): Promise<ChatResponse> {
    try {
      const userContext = await buildUserContext(userId);

      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      if (conversationId) {
        const msgs = await firebaseMomoService.getMessages(userId, conversationId);
        msgs.slice(-8).forEach(m => {
          conversationHistory.push({ role: m.role as 'user' | 'assistant', content: m.content });
        });
      }

      const aiMessage = await chatWithMomo(message, conversationHistory, userContext);
      let newConversationId = conversationId;

      // Create conversation in Firebase if this is the first message
      if (!newConversationId) {
        const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
        newConversationId = await firebaseMomoService.createConversation(userId, title);
      }

      // Persist both messages to Firebase
      await firebaseMomoService.saveMessage(userId, newConversationId, 'user', message);
      await firebaseMomoService.saveMessage(userId, newConversationId, 'assistant', aiMessage);

      return {
        message: aiMessage,
        conversationId: newConversationId,
        remainingMessages: 20,
      };
    } catch (error: unknown) {
      console.error('SupabaseMomoAIService.sendMessage error:', error);
      throw error;
    }
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    const convos: MomoConversation[] = await firebaseMomoService.getConversations(userId);
    return convos.map(c => ({
      id: c.id,
      title: c.title,
      last_message_at: c.lastMessageAt,
      is_active: true,
    }));
  }

  async getConversationMessages(conversationId: string, userId: string): Promise<ChatMessage[]> {
    const msgs: MomoMessage[] = await firebaseMomoService.getMessages(userId, conversationId);
    return msgs.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: m.createdAt,
    }));
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await firebaseMomoService.deleteConversation(userId, conversationId);
  }

  async getUsageInfo(_userId: string): Promise<UsageInfo> {
    // Usage is unlimited during beta — all users get premium access
    return { allowed: true, remaining: 999, limit: 999, is_premium: true };
  }

  /** Exposed for external callers (e.g. pre-session, post-session, insights components) */
  async buildContext(userId: string): Promise<Record<string, unknown>> {
    return buildUserContext(userId);
  }
}

export const supabaseMomoAIService = new SupabaseMomoAIService();
export { buildUserContext };

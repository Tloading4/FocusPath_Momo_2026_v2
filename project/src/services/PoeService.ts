import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UserContext {
  level?: number;
  totalXP?: number;
  streakCount?: number;
  totalSessions?: number;
  focusScore?: number;
}

export interface ChatResponse {
  message: string;
  conversationId: string;
  remainingMessages: number;
}

class PoeService {
  private chatWithPoeFn = httpsCallable<{
    message: string;
    conversationId?: string;
    userContext?: UserContext;
  }, ChatResponse>(functions, 'chatWithPoe');

  async sendMessage(
    message: string,
    conversationId?: string,
    userContext?: UserContext
  ): Promise<ChatResponse> {
    try {
      const result = await this.chatWithPoeFn({
        message,
        conversationId,
        userContext
      });

      return result.data;
    } catch (error: any) {
      console.error('Error calling Poe API:', error);

      if (error.code === 'resource-exhausted') {
        throw new Error('Daily message limit reached. Please upgrade to premium for unlimited messages.');
      }

      if (error.code === 'unauthenticated') {
        throw new Error('Please log in to use the AI coach.');
      }

      if (error.code === 'failed-precondition') {
        throw new Error('AI service is currently unavailable. Please try again later.');
      }

      throw new Error('Failed to get AI response. Please try again.');
    }
  }

  buildUserContext(userData: any): UserContext {
    if (!userData) {
      return {
        level: 1,
        totalXP: 0,
        streakCount: 0,
        totalSessions: 0,
        focusScore: 100
      };
    }

    const sessions = userData.sessions || [];
    const totalSessions = sessions.length;

    return {
      level: userData.level || 1,
      totalXP: userData.totalXP || 0,
      streakCount: userData.streaks?.currentStreak || 0,
      totalSessions,
      focusScore: userData.focusScore || 100
    };
  }
}

export const poeService = new PoeService();

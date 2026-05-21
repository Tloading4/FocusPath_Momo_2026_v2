import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit as limitQuery,
  deleteDoc
} from 'firebase/firestore';

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: Date;
  lastMessageAt: Date;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UsageInfo {
  messageCount: number;
  resetDate: string;
  limit: number;
  remaining: number;
}

class FirestoreChatService {
  async getUserConversations(userId: string, limitCount: number = 20): Promise<ConversationSummary[]> {
    try {
      const conversationsRef = collection(db, 'chatConversations');
      const q = query(
        conversationsRef,
        where('userId', '==', userId),
        orderBy('lastMessageAt', 'desc'),
        limitQuery(limitCount)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || 'New Conversation',
          createdAt: data.createdAt?.toDate() || new Date(),
          lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
          messageCount: data.messageCount || 0
        };
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const messagesRef = collection(db, 'chatConversations', conversationId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          role: data.role,
          content: data.content,
          timestamp: data.timestamp?.toDate() || new Date()
        };
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const messagesRef = collection(db, 'chatConversations', conversationId, 'messages');
      const snapshot = await getDocs(messagesRef);

      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      const conversationRef = doc(db, 'chatConversations', conversationId);
      await deleteDoc(conversationRef);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  async getUserUsageInfo(userId: string): Promise<UsageInfo | null> {
    try {
      const usageRef = doc(db, 'poeUsageTracking', userId);
      const usageDoc = await getDoc(usageRef);

      if (!usageDoc.exists()) {
        return null;
      }

      const data = usageDoc.data();
      const today = new Date().toISOString().split('T')[0];

      const messageCount = data.resetDate === today ? data.messageCount : 0;
      const limit = 20;

      return {
        messageCount,
        resetDate: data.resetDate,
        limit,
        remaining: Math.max(0, limit - messageCount)
      };
    } catch (error) {
      console.error('Error fetching usage info:', error);
      return null;
    }
  }
}

export const firestoreChatService = new FirestoreChatService();

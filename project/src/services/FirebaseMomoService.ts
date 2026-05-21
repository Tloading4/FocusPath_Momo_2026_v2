import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface MomoConversation {
  id: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface MomoMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

class FirebaseMomoService {
  private conversationsPath(userId: string) {
    return collection(db, 'userProfiles', userId, 'momoConversations');
  }

  private messagesPath(userId: string, conversationId: string) {
    return collection(db, 'userProfiles', userId, 'momoConversations', conversationId, 'messages');
  }

  async createConversation(userId: string, title: string): Promise<string> {
    try {
      const ref = await addDoc(this.conversationsPath(userId), {
        title,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });
      return ref.id;
    } catch (error) {
      console.error('FirebaseMomoService: createConversation error', error);
      return `local-${Date.now()}`;
    }
  }

  async saveMessage(
    userId: string,
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    try {
      // Skip saving for local-only (fallback) conversation IDs
      if (conversationId.startsWith('local-')) return;

      await addDoc(this.messagesPath(userId, conversationId), {
        role,
        content,
        createdAt: serverTimestamp(),
      });

      // Update lastMessageAt on the conversation
      await setDoc(
        doc(db, 'userProfiles', userId, 'momoConversations', conversationId),
        { lastMessageAt: serverTimestamp() },
        { merge: true }
      );
    } catch (error) {
      console.error('FirebaseMomoService: saveMessage error', error);
    }
  }

  async getConversations(userId: string): Promise<MomoConversation[]> {
    try {
      const q = query(this.conversationsPath(userId), orderBy('lastMessageAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || 'Conversation',
          lastMessageAt: this.toISOString(data.lastMessageAt),
          createdAt: this.toISOString(data.createdAt),
        };
      });
    } catch (error) {
      console.error('FirebaseMomoService: getConversations error', error);
      return [];
    }
  }

  async getMessages(userId: string, conversationId: string): Promise<MomoMessage[]> {
    try {
      if (conversationId.startsWith('local-')) return [];
      const q = query(this.messagesPath(userId, conversationId), orderBy('createdAt', 'asc'), limit(100));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          role: data.role as 'user' | 'assistant',
          content: data.content,
          createdAt: this.toISOString(data.createdAt),
        };
      });
    } catch (error) {
      console.error('FirebaseMomoService: getMessages error', error);
      return [];
    }
  }

  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    try {
      if (conversationId.startsWith('local-')) return;

      // Delete all messages first
      const msgsSnapshot = await getDocs(this.messagesPath(userId, conversationId));
      const deletions = msgsSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletions);

      // Delete the conversation doc
      await deleteDoc(doc(db, 'userProfiles', userId, 'momoConversations', conversationId));
    } catch (error) {
      console.error('FirebaseMomoService: deleteConversation error', error);
    }
  }

  /** Save/update cached insights with a generatedAt timestamp */
  async saveInsights(userId: string, insights: any[]): Promise<void> {
    try {
      await setDoc(
        doc(db, 'userProfiles', userId, 'momoData', 'insights'),
        { insights, generatedAt: serverTimestamp() },
        { merge: false }
      );
    } catch (error) {
      console.error('FirebaseMomoService: saveInsights error', error);
    }
  }

  /** Returns cached insights if generated within the last 24 hours, otherwise null */
  async getCachedInsights(userId: string): Promise<any[] | null> {
    try {
      const snap = await getDoc(doc(db, 'userProfiles', userId, 'momoData', 'insights'));
      if (!snap.exists()) return null;
      const data = snap.data();
      const generatedAt: Timestamp | undefined = data.generatedAt;
      if (!generatedAt) return null;
      const ageMs = Date.now() - generatedAt.toMillis();
      if (ageMs > 24 * 60 * 60 * 1000) return null; // older than 24h
      return data.insights || null;
    } catch (error) {
      console.error('FirebaseMomoService: getCachedInsights error', error);
      return null;
    }
  }

  private toISOString(ts: Timestamp | undefined): string {
    if (!ts) return new Date().toISOString();
    try {
      return ts.toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
}

export const firebaseMomoService = new FirebaseMomoService();

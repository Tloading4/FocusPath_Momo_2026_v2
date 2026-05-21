import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Anthropic from '@anthropic-ai/sdk';

admin.initializeApp();

const MOMO_AI = defineSecret('MOMO_AI');

const FREE_DAILY_LIMIT = 50;
const PREMIUM_DAILY_LIMIT = 500;

const MOMO_SYSTEM_PROMPT = `You are Momo, a warm and encouraging AI study companion inside Focus Path™, a personal productivity app. You have access to the user's real study session data, focus scores, streaks, and goals.

Your personality: encouraging, concise, data-driven, slightly playful. You celebrate wins and gently guide improvement without being preachy.

Rules:
- Never use markdown formatting (no **, ##, -, or bullet symbols)
- Keep tips to 1-3 sentences
- Keep chat responses to 2-5 sentences
- Keep insights/reflections to 3-6 sentences
- Reference actual numbers from the user's data when available
- End chat responses with one concrete actionable suggestion when appropriate
- Never say you are an AI or mention Anthropic or Claude`;

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function checkRateLimit(userId: string, isPremium: boolean): Promise<void> {
  const db = admin.firestore();
  const today = new Date().toISOString().split('T')[0];
  const limitRef = db.doc(`rateLimits/${userId}_${today}`);
  const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(limitRef);
    const count: number = snap.exists ? (snap.data()?.count ?? 0) : 0;
    if (count >= limit) {
      throw new HttpsError(
        'resource-exhausted',
        `Daily limit of ${limit} messages reached.`
      );
    }
    tx.set(limitRef, { count: count + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });
}

async function getUserPremiumStatus(userId: string): Promise<boolean> {
  try {
    const snap = await admin.firestore().doc(`subscriptions/${userId}`).get();
    if (!snap.exists) return false;
    const data = snap.data();
    return data?.status === 'active' && data?.tier !== 'standard';
  } catch {
    return false;
  }
}

export const momoChat = onCall(
  {
    secrets: [MOMO_AI],
    maxInstances: 20,
    timeoutSeconds: 30,
    region: 'us-central1',
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in to chat with Momo.');
    }

    const userId = request.auth.uid;
    const { messages, systemPrompt, maxTokens = 512, model = 'claude-haiku-4-5' } = request.data as {
      messages: ClaudeMessage[];
      systemPrompt?: string;
      maxTokens?: number;
      model?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError('invalid-argument', 'messages array is required');
    }

    const isPremium = await getUserPremiumStatus(userId);
    await checkRateLimit(userId, isPremium);

    const client = new Anthropic({ apiKey: MOMO_AI.value() });

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt || MOMO_SYSTEM_PROMPT,
      messages,
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return { text };
  }
);

export const getRemainingMessages = onCall(
  { maxInstances: 10, timeoutSeconds: 10, region: 'us-central1', invoker: 'public' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in.');
    }

    const userId = request.auth.uid;
    const isPremium = await getUserPremiumStatus(userId);
    const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

    const today = new Date().toISOString().split('T')[0];
    const snap = await admin.firestore().doc(`rateLimits/${userId}_${today}`).get();
    const used: number = snap.exists ? (snap.data()?.count ?? 0) : 0;

    return { used, limit, remaining: Math.max(0, limit - used), isPremium };
  }
);

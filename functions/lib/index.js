"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRemainingMessages = exports.momoChat = void 0;
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const sdk_1 = require("@anthropic-ai/sdk");
admin.initializeApp();
const ANTHROPIC_KEY = (0, params_1.defineSecret)('ANTHROPIC_API_KEY');
// Per-user daily message limits
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
async function checkRateLimit(userId, isPremium) {
    const db = admin.firestore();
    const today = new Date().toISOString().split('T')[0];
    const limitRef = db.doc(`rateLimits/${userId}_${today}`);
    await db.runTransaction(async (tx) => {
        var _a, _b;
        const snap = await tx.get(limitRef);
        const count = snap.exists ? ((_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0) : 0;
        const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
        if (count >= limit) {
            throw new https_1.HttpsError('resource-exhausted', `Daily message limit of ${limit} reached. ${isPremium ? 'Try again tomorrow.' : 'Upgrade to premium for 10x more messages.'}`);
        }
        tx.set(limitRef, { count: count + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
}
async function getUserPremiumStatus(userId) {
    try {
        const db = admin.firestore();
        const subSnap = await db.doc(`subscriptions/${userId}`).get();
        if (!subSnap.exists)
            return false;
        const data = subSnap.data();
        return (data === null || data === void 0 ? void 0 : data.status) === 'active' && (data === null || data === void 0 ? void 0 : data.tier) !== 'standard';
    }
    catch (_a) {
        return false;
    }
}
// Main Momo chat function
exports.momoChat = (0, https_1.onCall)({
    secrets: [ANTHROPIC_KEY],
    maxInstances: 20,
    timeoutSeconds: 30,
    region: 'us-central1',
}, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to chat with Momo.');
    }
    const userId = request.auth.uid;
    const { messages, systemPrompt, maxTokens = 512, model = 'claude-haiku-4-5' } = request.data;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'messages array is required');
    }
    // Check rate limit
    const isPremium = await getUserPremiumStatus(userId);
    await checkRateLimit(userId, isPremium);
    // Call Anthropic
    const client = new sdk_1.default({ apiKey: ANTHROPIC_KEY.value() });
    const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt || MOMO_SYSTEM_PROMPT,
        messages,
    });
    const text = ((_a = response.content[0]) === null || _a === void 0 ? void 0 : _a.type) === 'text' ? response.content[0].text : '';
    return { text };
});
// Lightweight function to get remaining message count for the day
exports.getRemainingMessages = (0, https_1.onCall)({ maxInstances: 10, region: 'us-central1' }, async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in.');
    }
    const userId = request.auth.uid;
    const isPremium = await getUserPremiumStatus(userId);
    const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
    const db = admin.firestore();
    const today = new Date().toISOString().split('T')[0];
    const snap = await db.doc(`rateLimits/${userId}_${today}`).get();
    const used = snap.exists ? ((_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0) : 0;
    return {
        used,
        limit,
        remaining: Math.max(0, limit - used),
        isPremium,
    };
});
//# sourceMappingURL=index.js.map
import { IDataSource } from '../contexts/DataSourceContext';
import { auth, db } from '../firebase';
import { ExtensionBridge } from './ExtensionBridge';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  getDocs,
  increment,
  orderBy,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';

// Helper to get current user UID
const getCurrentUserUid = (): string | null => {
  return auth.currentUser?.uid || null;
};

export class WebAppDataService implements IDataSource {
  private bridge: ExtensionBridge;

  constructor() {
    this.bridge = ExtensionBridge.getInstance();
  }

  // --- User and Profile ---
  async fetchUserData(): Promise<any> {
    const uid = getCurrentUserUid();
    if (!uid) throw new Error('User not authenticated');

    const profileRef = doc(db, 'userProfiles', uid);
    const profileSnap = await getDoc(profileRef);
    const profileData = profileSnap.exists() ? profileSnap.data() : {};

    // Fetch sessions (e.g., for XP calculation, history)
    const sessionsQuery = query(collection(db, 'userProfiles', uid, 'sessions'), orderBy('date', 'desc'));
    const sessionsSnap = await getDocs(sessionsQuery);
    const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Fetch streaks
    const streakRef = doc(db, 'streaks', uid);
    const streakSnap = await getDoc(streakRef);
    const streakData = streakSnap.exists() ? streakSnap.data() : {};

    // Fetch purchases (for marketplace, collections)
    const purchasesQuery = query(collection(db, 'userProfiles', uid, 'purchases'));
    const purchasesSnap = await getDocs(purchasesQuery);
    const purchases = purchasesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return {
      userProfile: profileData,
      sessions: sessions,
      streaks: streakData,
      purchases: purchases,
      // Add other data as needed by components
    };
  }

  async updateUserData(data: any): Promise<any> {
    const uid = getCurrentUserUid();
    if (!uid) throw new Error('User not authenticated');
    const profileRef = doc(db, 'userProfiles', uid);
    await setDoc(profileRef, { ...data, lastUpdated: serverTimestamp() }, { merge: true });
    return { success: true };
  }

  async updateUserProfile(profileData: any): Promise<any> {
    const uid = getCurrentUserUid();
    if (!uid) throw new Error('User not authenticated');
    const profileRef = doc(db, 'userProfiles', uid);
    await setDoc(profileRef, { 
      ...profileData, 
      email: auth.currentUser?.email || null,
      lastUpdated: serverTimestamp() 
    }, { merge: true });
    return { success: true };
  }

  // --- Sessions ---
  async startFocusSession(): Promise<any> {
    // This typically involves setting a 'currentSession' state in the user's profile
    // and potentially creating a session document that will be updated later.
    // For simplicity, we'll assume the component handles the initial state and
    // this method is for logging the start if needed by the backend.
    // The FocusTimer component already handles this logic, so this might be a no-op or a simplified version.
    // For now, let's just return success.
    return { success: true };
  }

  async endFocusSession(sessionRecord: any): Promise<any> {
    const uid = getCurrentUserUid();
    if (!uid) throw new Error('User not authenticated');
    await addDoc(collection(db, 'userProfiles', uid, 'sessions'), {
      ...sessionRecord,
      date: serverTimestamp(), // Use server timestamp for consistency
      userId: uid // Ensure userId is stored with session
    });
    // Update user profile XP and streak data
    const profileRef = doc(db, 'userProfiles', uid);
    await setDoc(profileRef, {
      totalXP: increment(sessionRecord.xpEarned),
      marketplaceXP: increment(sessionRecord.xpEarned), // Assuming marketplace XP is tied to total XP earned
      lastUpdated: serverTimestamp(),
      lastSessionDate: serverTimestamp() // For streak calculation
    }, { merge: true });
    return { success: true };
  }

  async logDistraction(): Promise<any> {
    // This might involve updating the current session document with distraction details
    // or adding a new distraction sub-document.
    // For now, let's assume the component handles this locally and it's part of the endFocusSession record.
    return { success: true };
  }

  async fetchSessionsHistory(): Promise<any> {
    const uid = getCurrentUserUid();
    if (!uid) throw new Error('User not authenticated');
    const sessionsQuery = query(collection(db, 'userProfiles', uid, 'sessions'), orderBy('date', 'desc'));
    const sessionsSnap = await getDocs(sessionsQuery);
    return sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // --- Streaks ---
  async fetchStreaksData(): Promise<any> {
    const uid = getCurrentUserUid();
    if (!uid) throw new Error('User not authenticated');
    const streakRef = doc(db, 'streaks', uid);
    const streakSnap = await getDoc(streakRef);
    return streakSnap.exists() ? streakSnap.data() : null;
  }

  // --- Marketplace ---
  async fetchMarketplaceData(): Promise<any> {
    // Marketplace items are typically static or fetched from a global collection
    // For now, we'll assume they are hardcoded or fetched from a public collection.
    // The Marketplace component has a hardcoded list, so this might be a no-op or return that list.
    // Let's return a placeholder for now.
    return { items: [], purchases: [] }; // Placeholder
  }

  async performPurchase(item: any): Promise<any> {
    return this.bridge.performPurchase(item);
  }

  async equipPurchasedItem(itemId: string, category: string): Promise<any> {
    return this.bridge.equipPurchasedItem(itemId, category);
  }

  async activatePowerUp(powerUpId: string): Promise<any> {
    return this.bridge.activatePowerUp(powerUpId);
  }

  // --- Leaderboard ---
  async fetchLeaderboardData(): Promise<any> {
    return this.bridge.sendToExtension('GET_LEADERBOARD_DATA', {});
  }

  // --- Challenges ---
  async fetchChallengesData(): Promise<any> {
    return this.bridge.sendToExtension('GET_CHALLENGES_DATA', {});
  }

  async claimChallengeReward(challengeId: string): Promise<any> {
    return this.bridge.sendToExtension('CLAIM_CHALLENGE_REWARD', { challengeId });
  }

  // --- Extension-specific ---
  onExtensionMessage(callback: (message: any) => void): () => void {
    return this.bridge.onExtensionMessage(callback);
  }

  syncSessionData(sessionData: any): Promise<any> {
    return this.bridge.syncSessionData(sessionData);
  }

  syncUserProfile(profileData: any): Promise<any> {
    return this.bridge.syncUserProfile(profileData);
  }
}

export const extensionDataService = new ExtensionDataService();
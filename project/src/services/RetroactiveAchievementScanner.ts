import { supabase } from '../supabase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { firebaseSessionService, SessionData } from './FirebaseSessionService';
import {
  AchievementDefinition,
  UserStats,
  checkEarnedAchievements
} from './AchievementDefinitions';

export interface RetroactiveScanResult {
  success: boolean;
  newAchievements: AchievementDefinition[];
  totalXPAwarded: number;
  alreadyScanned: boolean;
  error?: string;
}

class RetroactiveAchievementScanner {
  private static instance: RetroactiveAchievementScanner;

  private constructor() {}

  static getInstance(): RetroactiveAchievementScanner {
    if (!RetroactiveAchievementScanner.instance) {
      RetroactiveAchievementScanner.instance = new RetroactiveAchievementScanner();
    }
    return RetroactiveAchievementScanner.instance;
  }

  async checkIfScanNeeded(userId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('retroactive_scan_completed')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking scan status:', error);
        return true;
      }

      return !data?.retroactive_scan_completed;
    } catch (error) {
      console.error('Error in checkIfScanNeeded:', error);
      return true;
    }
  }

  private async getExistingAchievements(userId: string): Promise<Set<string>> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('achievement_key')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching existing achievements:', error);
        return new Set();
      }

      return new Set((data || []).map(a => a.achievement_key));
    } catch (error) {
      console.error('Error in getExistingAchievements:', error);
      return new Set();
    }
  }

  private calculateUserStats(sessions: SessionData[]): UserStats {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        totalFocusTimeMinutes: 0,
        totalFocusTimeHours: 0,
        longestStreak: 0,
        currentStreak: 0,
        totalXP: 0,
        perfectSessions: 0,
        sessionsWithNoDistractions: 0,
        marathonSessions: 0,
        uniqueDaysActive: 0,
        morningSessionsCount: 0,
        afternoonSessionsCount: 0,
        eveningSessionsCount: 0,
        nightSessionsCount: 0,
        averageFocusScore: 0,
      };
    }

    const completedSessions = sessions.filter(s => s.completed);
    const totalFocusTimeMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalXP = sessions.reduce((sum, s) => sum + s.xpEarned - s.xpDeducted, 0);

    const sessionsWithNoDistractions = completedSessions.filter(
      s => s.analytics.distractionCount === 0
    ).length;

    const marathonSessions = completedSessions.filter(
      s => s.duration >= 60
    ).length;

    const uniqueDays = new Set<string>();
    sessions.forEach(session => {
      const dayKey = session.date.toISOString().split('T')[0];
      uniqueDays.add(dayKey);
    });

    let morningSessionsCount = 0;
    let afternoonSessionsCount = 0;
    let eveningSessionsCount = 0;
    let nightSessionsCount = 0;

    sessions.forEach(session => {
      const hour = session.startTime.getHours();
      if (hour >= 5 && hour < 12) morningSessionsCount++;
      else if (hour >= 12 && hour < 17) afternoonSessionsCount++;
      else if (hour >= 17 && hour < 21) eveningSessionsCount++;
      else nightSessionsCount++;
    });

    const sortedDays = Array.from(uniqueDays).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );

    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDays[i - 1]);
        const currDate = new Date(sortedDays[i]);
        const diffDays = Math.floor(
          (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    let currentStreak = 0;
    const today = new Date();
    let checkDate = new Date(today);
    checkDate.setHours(0, 0, 0, 0);

    while (uniqueDays.has(checkDate.toISOString().split('T')[0])) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const averageFocusScore = sessions.reduce(
      (sum, s) => sum + s.analytics.focusScore, 0
    ) / sessions.length;

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      totalFocusTimeMinutes,
      totalFocusTimeHours: Math.floor(totalFocusTimeMinutes / 60),
      longestStreak,
      currentStreak,
      totalXP,
      perfectSessions: sessionsWithNoDistractions,
      sessionsWithNoDistractions,
      marathonSessions,
      uniqueDaysActive: uniqueDays.size,
      morningSessionsCount,
      afternoonSessionsCount,
      eveningSessionsCount,
      nightSessionsCount,
      averageFocusScore: Math.round(averageFocusScore),
    };
  }

  private async awardAchievement(
    userId: string,
    achievement: AchievementDefinition
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('achievements')
        .insert({
          user_id: userId,
          achievement_key: achievement.key,
          achievement_name: achievement.name,
          description: achievement.description,
          xp_reward: achievement.xpReward,
          icon: achievement.icon,
          rarity: achievement.rarity,
          unlocked_at: new Date().toISOString(),
          metadata: {
            category: achievement.category,
            retroactive: true,
          },
        });

      if (error) {
        if (error.code === '23505') {
          console.log(`Achievement ${achievement.key} already exists for user`);
          return false;
        }
        console.error('Error awarding achievement:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in awardAchievement:', error);
      return false;
    }
  }

  private async updateUserXP(userId: string, xpToAdd: number): Promise<void> {
    try {
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('total_xp')
        .eq('id', userId)
        .maybeSingle();

      const currentXP = currentProfile?.total_xp || 0;
      const newXP = currentXP + xpToAdd;

      await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          total_xp: newXP,
          updated_at: new Date().toISOString(),
        });

      const firebaseProfileRef = doc(db, 'userProfiles', userId);
      const firebaseProfile = await getDoc(firebaseProfileRef);

      if (firebaseProfile.exists()) {
        await setDoc(
          firebaseProfileRef,
          {
            totalXP: newXP,
            lastUpdated: new Date(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error('Error updating user XP:', error);
    }
  }

  private async markScanComplete(
    userId: string,
    achievementsAwarded: number
  ): Promise<void> {
    try {
      await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          retroactive_scan_completed: true,
          retroactive_scan_date: new Date().toISOString(),
          retroactive_achievements_count: achievementsAwarded,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error marking scan complete:', error);
    }
  }

  async performRetroactiveScan(userId: string): Promise<RetroactiveScanResult> {
    // Supabase not configured — skip retroactive scan entirely
    if (!supabase) {
      return { success: true, newAchievements: [], totalXPAwarded: 0, alreadyScanned: true };
    }

    try {
      const scanNeeded = await this.checkIfScanNeeded(userId);

      if (!scanNeeded) {
        return {
          success: true,
          newAchievements: [],
          totalXPAwarded: 0,
          alreadyScanned: true,
        };
      }

      const sessions = await firebaseSessionService.getUserSessions(userId);

      if (sessions.length === 0) {
        await this.markScanComplete(userId, 0);
        return {
          success: true,
          newAchievements: [],
          totalXPAwarded: 0,
          alreadyScanned: false,
        };
      }

      const stats = this.calculateUserStats(sessions);

      const earnedAchievements = checkEarnedAchievements(stats);

      const existingAchievements = await this.getExistingAchievements(userId);

      const newAchievements = earnedAchievements.filter(
        achievement => !existingAchievements.has(achievement.key)
      );

      let totalXPAwarded = 0;
      const successfullyAwarded: AchievementDefinition[] = [];

      for (const achievement of newAchievements) {
        const awarded = await this.awardAchievement(userId, achievement);
        if (awarded) {
          totalXPAwarded += achievement.xpReward;
          successfullyAwarded.push(achievement);
        }
      }

      if (totalXPAwarded > 0) {
        await this.updateUserXP(userId, totalXPAwarded);
      }

      await this.markScanComplete(userId, successfullyAwarded.length);

      return {
        success: true,
        newAchievements: successfullyAwarded,
        totalXPAwarded,
        alreadyScanned: false,
      };
    } catch (error) {
      console.error('Error in performRetroactiveScan:', error);
      return {
        success: false,
        newAchievements: [],
        totalXPAwarded: 0,
        alreadyScanned: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const retroactiveAchievementScanner = RetroactiveAchievementScanner.getInstance();

import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface SessionData {
  id: string;
  sessionType: string;
  sessionTypeName: string;
  category?: string;
  customTask?: string;
  focusMode?: 'school' | 'work';
  schoolModeType?: 'homework' | 'test_prep';
  subject?: string;
  workCategory?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  durationSeconds: number;
  xpEarned: number;
  xpDeducted: number;
  baseXP: number;
  completionPercentage: number;
  completed: boolean;
  date: Date;
  analytics: {
    focusScore: number;
    distractionCount: number;
    actualFocusTime?: number;
    plannedFocusTime?: number;
    focusEfficiency?: number;
    pauseCount?: number;
    totalPauseTime?: number;
    pausePenalty?: boolean;
    pauseEvents?: Array<{ timestamp: Date; duration: number; sessionProgress: number }>;
  };
}

export interface UserSessionStats {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  averageFocusScore: number;
  averageSessionLength: number;
  totalFocusTime: number;
  totalXPEarned: number;
  currentStreak: number;
  longestStreak: number;
  averageDistractionsPerSession: number;
  recentSessionsCount: number;
  recentSessions: SessionData[];
  commonDistractionPatterns: {
    highDistractionSessions: number;
    averagePauseCount: number;
    mostProductiveTimeOfDay?: string;
    pausePatterns?: {
      earlySessionPauses: number; // pauses in first 25% of session
      midSessionPauses: number; // pauses in middle 50% of session
      lateSessionPauses: number; // pauses in last 25% of session
      averagePauseDuration: number; // average seconds per pause
      longPauses: number; // pauses over 2 minutes
    };
  };
}

class FirebaseSessionService {
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const sessionsQuery = query(
        collection(db, 'userProfiles', userId, 'sessions'),
        orderBy('startTime', 'desc')
      );

      const snapshot = await getDocs(sessionsQuery);
      const sessions: SessionData[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        let startTime: Date;
        let endTime: Date;
        let date: Date;

        if (data.startTime?.toDate) {
          startTime = data.startTime.toDate();
        } else if (data.startTime) {
          startTime = new Date(data.startTime);
        } else {
          startTime = new Date();
        }

        if (data.endTime?.toDate) {
          endTime = data.endTime.toDate();
        } else if (data.endTime) {
          endTime = new Date(data.endTime);
        } else {
          endTime = startTime;
        }

        if (data.date?.toDate) {
          date = data.date.toDate();
        } else if (data.date) {
          date = new Date(data.date);
        } else {
          date = startTime;
        }

        const session: SessionData = {
          id: doc.id,
          sessionType: data.sessionType || 'unknown',
          sessionTypeName: data.sessionTypeName || data.sessionType || 'Focus Session',
          category: data.category,
          customTask: data.customTask,
          focusMode: data.focusMode,
          schoolModeType: data.schoolModeType,
          subject: data.subject,
          workCategory: data.workCategory,
          startTime,
          endTime,
          duration: data.duration || 0,
          durationSeconds: data.durationSeconds || (data.duration || 0) * 60,
          xpEarned: data.xpEarned || 0,
          xpDeducted: data.xpDeducted || 0,
          baseXP: data.baseXP || data.xpEarned || 0,
          completionPercentage: data.completionPercentage || 0,
          completed: data.completed !== false,
          date,
          analytics: {
            focusScore: data.analytics?.focusScore || 70,
            distractionCount: data.analytics?.distractionCount || 0,
            actualFocusTime: data.analytics?.actualFocusTime,
            plannedFocusTime: data.analytics?.plannedFocusTime,
            focusEfficiency: data.analytics?.focusEfficiency,
            pauseCount: data.analytics?.pauseCount || 0,
            totalPauseTime: data.analytics?.totalPauseTime || 0,
            pausePenalty: data.analytics?.pausePenalty || false,
            pauseEvents: data.analytics?.pauseEvents?.map((evt: any) => ({
              timestamp: evt.timestamp?.toDate ? evt.timestamp.toDate() : new Date(evt.timestamp),
              duration: evt.duration || 0,
              sessionProgress: evt.sessionProgress || 0
            })) || []
          }
        };

        sessions.push(session);
      });

      return sessions;
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }

  calculateStats(sessions: SessionData[]): UserSessionStats {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        completedSessions: 0,
        completionRate: 0,
        averageFocusScore: 0,
        averageSessionLength: 0,
        totalFocusTime: 0,
        totalXPEarned: 0,
        currentStreak: 0,
        longestStreak: 0,
        averageDistractionsPerSession: 0,
        recentSessionsCount: 0,
        recentSessions: [],
        commonDistractionPatterns: {
          highDistractionSessions: 0,
          averagePauseCount: 0
        }
      };
    }

    const completedSessions = sessions.filter(s => s.completed);
    const totalFocusTime = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalXPEarned = sessions.reduce((sum, s) => sum + s.xpEarned, 0);
    const totalXPDeducted = sessions.reduce((sum, s) => sum + s.xpDeducted, 0);
    const averageFocusScore = sessions.reduce((sum, s) => sum + s.analytics.focusScore, 0) / sessions.length;
    const completionRate = (completedSessions.length / sessions.length) * 100;
    const averageSessionLength = totalFocusTime / sessions.length;

    const totalDistractions = sessions.reduce((sum, s) => sum + s.analytics.distractionCount, 0);
    const averageDistractionsPerSession = totalDistractions / sessions.length;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSessions = sessions.filter(s => s.date >= sevenDaysAgo);

    const today = new Date();
    const uniqueDays = new Set<string>();
    completedSessions.forEach(session => {
      const dayKey = session.date.toDateString();
      uniqueDays.add(dayKey);
    });

    let currentStreak = 0;
    let checkDate = new Date(today);
    checkDate.setHours(0, 0, 0, 0);

    while (uniqueDays.has(checkDate.toDateString())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDays = Array.from(uniqueDays).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );

    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDays[i - 1]);
        const currDate = new Date(sortedDays[i]);
        const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    const highDistractionSessions = sessions.filter(s => s.analytics.distractionCount > 3).length;
    const totalPauses = sessions.reduce((sum, s) => sum + (s.analytics.pauseCount || 0), 0);
    const averagePauseCount = totalPauses / sessions.length;

    const timeOfDayMap = new Map<string, number>();
    sessions.forEach(session => {
      const hour = session.startTime.getHours();
      let timeOfDay = '';
      if (hour >= 5 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
      else timeOfDay = 'night';

      timeOfDayMap.set(timeOfDay, (timeOfDayMap.get(timeOfDay) || 0) + 1);
    });

    let mostProductiveTimeOfDay = '';
    let maxSessions = 0;
    timeOfDayMap.forEach((count, time) => {
      if (count > maxSessions) {
        maxSessions = count;
        mostProductiveTimeOfDay = time;
      }
    });

    // Analyze detailed pause patterns
    let earlySessionPauses = 0;
    let midSessionPauses = 0;
    let lateSessionPauses = 0;
    let totalPauseDurations = 0;
    let totalPauseEventsCount = 0;
    let longPauses = 0;

    sessions.forEach(session => {
      const pauseEvents = session.analytics.pauseEvents || [];
      pauseEvents.forEach(event => {
        totalPauseEventsCount++;
        totalPauseDurations += event.duration;

        if (event.duration > 120) { // over 2 minutes
          longPauses++;
        }

        if (event.sessionProgress < 25) {
          earlySessionPauses++;
        } else if (event.sessionProgress > 75) {
          lateSessionPauses++;
        } else {
          midSessionPauses++;
        }
      });
    });

    const averagePauseDuration = totalPauseEventsCount > 0
      ? Math.round(totalPauseDurations / totalPauseEventsCount)
      : 0;

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      completionRate: Math.round(completionRate),
      averageFocusScore: Math.round(averageFocusScore),
      averageSessionLength: Math.round(averageSessionLength),
      totalFocusTime: Math.round(totalFocusTime),
      totalXPEarned: totalXPEarned - totalXPDeducted,
      currentStreak,
      longestStreak,
      averageDistractionsPerSession: Math.round(averageDistractionsPerSession * 10) / 10,
      recentSessionsCount: recentSessions.length,
      recentSessions: sessions.slice(0, 5),
      commonDistractionPatterns: {
        highDistractionSessions,
        averagePauseCount: Math.round(averagePauseCount * 10) / 10,
        mostProductiveTimeOfDay,
        pausePatterns: totalPauseEventsCount > 0 ? {
          earlySessionPauses,
          midSessionPauses,
          lateSessionPauses,
          averagePauseDuration,
          longPauses
        } : undefined
      }
    };
  }
}

export const firebaseSessionService = new FirebaseSessionService();

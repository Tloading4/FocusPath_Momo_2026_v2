import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface SurveySettings {
  totalCompleted: number;
  totalSkipped: number;
  lastSurveyDate: string | null;
  sessionsSinceLastSurvey: number;
  autoSkipEnabled: boolean;
  consecutiveSkips: number;
  skipUntilDate: string | null;
}

const DEFAULT_SURVEY_SETTINGS: SurveySettings = {
  totalCompleted: 0,
  totalSkipped: 0,
  lastSurveyDate: null,
  sessionsSinceLastSurvey: 0,
  autoSkipEnabled: false,
  consecutiveSkips: 0,
  skipUntilDate: null,
};

export class SurveyStateService {
  static async getSurveySettings(userId: string): Promise<SurveySettings> {
    try {
      const profileRef = doc(db, 'userProfiles', userId);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const data = profileSnap.data();
        const surveySettings = data.preferences?.surveySettings || DEFAULT_SURVEY_SETTINGS;
        return { ...DEFAULT_SURVEY_SETTINGS, ...surveySettings };
      }

      return DEFAULT_SURVEY_SETTINGS;
    } catch (error) {
      console.error('Error getting survey settings:', error);
      return DEFAULT_SURVEY_SETTINGS;
    }
  }

  static async updateSurveySettings(userId: string, updates: Partial<SurveySettings>): Promise<void> {
    try {
      const profileRef = doc(db, 'userProfiles', userId);
      const currentSettings = await this.getSurveySettings(userId);

      const newSettings = { ...currentSettings, ...updates };

      await setDoc(profileRef, {
        preferences: {
          surveySettings: newSettings
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error updating survey settings:', error);
    }
  }

  static async recordSurveyCompletion(userId: string): Promise<void> {
    const settings = await this.getSurveySettings(userId);

    await this.updateSurveySettings(userId, {
      totalCompleted: settings.totalCompleted + 1,
      lastSurveyDate: new Date().toISOString(),
      sessionsSinceLastSurvey: 0,
      consecutiveSkips: 0,
    });
  }

  static async recordSurveySkip(userId: string): Promise<void> {
    const settings = await this.getSurveySettings(userId);
    const consecutiveSkips = settings.consecutiveSkips + 1;

    const updates: Partial<SurveySettings> = {
      totalSkipped: settings.totalSkipped + 1,
      consecutiveSkips,
      sessionsSinceLastSurvey: 0,
    };

    if (consecutiveSkips >= 3) {
      const skipUntilDate = new Date();
      skipUntilDate.setDate(skipUntilDate.getDate() + 7);
      updates.skipUntilDate = skipUntilDate.toISOString();
    }

    await this.updateSurveySettings(userId, updates);
  }

  static async incrementSessionCount(userId: string): Promise<void> {
    const settings = await this.getSurveySettings(userId);

    await this.updateSurveySettings(userId, {
      sessionsSinceLastSurvey: settings.sessionsSinceLastSurvey + 1,
    });
  }

  static async shouldShowSurvey(
    userId: string,
    sessionDurationMinutes: number
  ): Promise<boolean> {
    if (sessionDurationMinutes < 10) {
      return false;
    }

    const settings = await this.getSurveySettings(userId);

    if (settings.skipUntilDate) {
      const skipUntil = new Date(settings.skipUntilDate);
      if (new Date() < skipUntil) {
        return false;
      } else {
        await this.updateSurveySettings(userId, {
          skipUntilDate: null,
          consecutiveSkips: 0,
        });
      }
    }

    if (settings.autoSkipEnabled) {
      return false;
    }

    if (settings.totalCompleted < 3) {
      return true;
    }

    if (settings.totalCompleted <= 10) {
      return settings.sessionsSinceLastSurvey >= 1;
    }

    if (settings.totalCompleted <= 25) {
      return settings.sessionsSinceLastSurvey >= 3;
    }

    return settings.sessionsSinceLastSurvey >= 5;
  }

  static getSurveyFrequencyText(totalCompleted: number): string {
    if (totalCompleted < 3) {
      return 'Showing after every session (first 3 sessions)';
    } else if (totalCompleted <= 10) {
      return 'Showing every session';
    } else if (totalCompleted <= 25) {
      return 'Showing every 3rd session';
    } else {
      return 'Showing every 5th session';
    }
  }
}

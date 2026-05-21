export interface LevelInfo {
  level: number;
  currentLevelXP: number;
  xpForNextLevel: number;
  xpIntoCurrentLevel: number;
  progressPercent: number;
  totalXP: number;
}

export interface LevelTitle {
  minLevel: number;
  maxLevel: number | null;
  title: string;
  color: string;
}

const BASE_XP = 100;

const LEVEL_TITLES: LevelTitle[] = [
  { minLevel: 1, maxLevel: 9, title: 'Focus Novice', color: 'from-green-500 to-emerald-600' },
  { minLevel: 10, maxLevel: 19, title: 'Focus Practitioner', color: 'from-blue-500 to-indigo-600' },
  { minLevel: 20, maxLevel: 29, title: 'Focus Expert', color: 'from-purple-500 to-pink-600' },
  { minLevel: 30, maxLevel: 49, title: 'Focus Master', color: 'from-yellow-500 to-orange-600' },
  { minLevel: 50, maxLevel: null, title: 'Focus Legend', color: 'from-red-500 to-pink-600' }
];

export class LevelingService {
  static getXPRequiredForLevel(level: number): number {
    if (level <= 1) return 0;
    return BASE_XP * level;
  }

  static getTotalXPForLevel(level: number): number {
    if (level <= 1) return 0;

    let totalXP = 0;
    for (let i = 2; i <= level; i++) {
      totalXP += this.getXPRequiredForLevel(i);
    }
    return totalXP;
  }

  static getLevelFromXP(totalXP: number): number {
    if (totalXP < 0) return 1;

    let level = 1;
    let xpAccumulated = 0;

    while (true) {
      const xpForNextLevel = this.getXPRequiredForLevel(level + 1);
      if (xpAccumulated + xpForNextLevel > totalXP) {
        break;
      }
      xpAccumulated += xpForNextLevel;
      level++;

      if (level > 1000) break;
    }

    return level;
  }

  static getLevelInfo(totalXP: number): LevelInfo {
    const level = this.getLevelFromXP(totalXP);
    const currentLevelStartXP = this.getTotalXPForLevel(level);
    const xpForNextLevel = this.getXPRequiredForLevel(level + 1);
    const xpIntoCurrentLevel = totalXP - currentLevelStartXP;
    const progressPercent = (xpIntoCurrentLevel / xpForNextLevel) * 100;

    return {
      level,
      currentLevelXP: currentLevelStartXP,
      xpForNextLevel,
      xpIntoCurrentLevel,
      progressPercent: Math.min(100, Math.max(0, progressPercent)),
      totalXP
    };
  }

  static getLevelTitle(level: number): string {
    const titleInfo = LEVEL_TITLES.find(
      t => level >= t.minLevel && (t.maxLevel === null || level <= t.maxLevel)
    );
    return titleInfo?.title || 'Focus Master';
  }

  static getLevelColor(level: number): string {
    const titleInfo = LEVEL_TITLES.find(
      t => level >= t.minLevel && (t.maxLevel === null || level <= t.maxLevel)
    );
    return titleInfo?.color || 'from-yellow-500 to-orange-600';
  }

  static getXPTableForLevels(startLevel: number, endLevel: number): Array<{ level: number; xpRequired: number; totalXP: number }> {
    const table: Array<{ level: number; xpRequired: number; totalXP: number }> = [];

    for (let level = startLevel; level <= endLevel; level++) {
      table.push({
        level,
        xpRequired: this.getXPRequiredForLevel(level),
        totalXP: this.getTotalXPForLevel(level)
      });
    }

    return table;
  }
}

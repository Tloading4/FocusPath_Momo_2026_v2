export interface XPGainEvent {
  source: string;
  amount: number;
  position?: { x: number; y: number };
  timestamp: number;
  metadata?: {
    sessionId?: string;
    questId?: string;
    achievementId?: string;
    streakMultiplier?: number;
    [key: string]: any;
  };
}

export interface LevelUpEvent {
  oldLevel: number;
  newLevel: number;
  oldTitle: string;
  newTitle: string;
  timestamp: number;
}

type XPEventCallback = (event: XPGainEvent) => void;
type LevelUpEventCallback = (event: LevelUpEvent) => void;

class XPEventServiceClass {
  private xpSubscribers: Map<string, XPEventCallback> = new Map();
  private levelUpSubscribers: Map<string, LevelUpEventCallback> = new Map();
  private eventQueue: XPGainEvent[] = [];
  private levelUpQueue: LevelUpEvent[] = [];
  private isProcessing = false;
  private isProcessingLevelUp = false;
  private maxConcurrentAnimations = 3;
  private activeAnimations = 0;
  private pendingLevelUpEvent: LevelUpEvent | null = null;
  private xpAnimationDelay = 1500;
  private debugMode = false;

  emitXPGain(
    source: string,
    amount: number,
    position?: { x: number; y: number },
    metadata?: any
  ): void {
    const event: XPGainEvent = {
      source,
      amount,
      position,
      timestamp: Date.now(),
      metadata
    };

    this.eventQueue.push(event);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.eventQueue.length > 0 && this.activeAnimations < this.maxConcurrentAnimations) {
      const event = this.eventQueue.shift();
      if (event) {
        this.activeAnimations++;
        this.notifyXPSubscribers(event);

        setTimeout(() => {
          this.activeAnimations--;
          this.processQueue();
        }, 100);
      }
    }

    this.isProcessing = false;
  }

  private notifyXPSubscribers(event: XPGainEvent): void {
    this.xpSubscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in XP event subscriber:', error);
      }
    });
  }

  subscribeToXPEvents(id: string, callback: XPEventCallback): () => void {
    this.xpSubscribers.set(id, callback);

    return () => {
      this.xpSubscribers.delete(id);
    };
  }

  emitLevelUp(
    oldLevel: number,
    newLevel: number,
    oldTitle: string,
    newTitle: string
  ): void {
    const event: LevelUpEvent = {
      oldLevel,
      newLevel,
      oldTitle,
      newTitle,
      timestamp: Date.now()
    };

    if (this.debugMode) {
      console.log('[XPEventService] Level up event queued:', event);
    }

    this.levelUpQueue.push(event);
    this.pendingLevelUpEvent = event;

    setTimeout(() => {
      this.processLevelUpQueue();
    }, this.xpAnimationDelay);
  }

  private processLevelUpQueue(): void {
    if (this.isProcessingLevelUp || this.levelUpQueue.length === 0) {
      return;
    }

    this.isProcessingLevelUp = true;

    const event = this.levelUpQueue.shift();
    if (event) {
      if (this.debugMode) {
        console.log('[XPEventService] Processing level up event:', event);
      }

      this.notifyLevelUpSubscribers(event);
    }

    this.isProcessingLevelUp = false;
  }

  private notifyLevelUpSubscribers(event: LevelUpEvent): void {
    if (this.debugMode) {
      console.log('[XPEventService] Notifying level up subscribers, count:', this.levelUpSubscribers.size);
    }

    this.levelUpSubscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in level-up event subscriber:', error);
      }
    });
  }

  subscribeToLevelUpEvents(id: string, callback: LevelUpEventCallback): () => void {
    this.levelUpSubscribers.set(id, callback);

    if (this.debugMode) {
      console.log('[XPEventService] New level up subscriber added:', id);
    }

    if (this.pendingLevelUpEvent) {
      if (this.debugMode) {
        console.log('[XPEventService] Replaying pending level up event for new subscriber');
      }
      setTimeout(() => {
        if (this.pendingLevelUpEvent) {
          callback(this.pendingLevelUpEvent);
        }
      }, 100);
    }

    return () => {
      this.levelUpSubscribers.delete(id);
      if (this.debugMode) {
        console.log('[XPEventService] Level up subscriber removed:', id);
      }
    };
  }

  clearQueue(): void {
    this.eventQueue = [];
  }

  getQueueLength(): number {
    return this.eventQueue.length;
  }

  getPendingLevelUpEvent(): LevelUpEvent | null {
    return this.pendingLevelUpEvent;
  }

  clearPendingLevelUpEvent(): void {
    this.pendingLevelUpEvent = null;
    if (this.debugMode) {
      console.log('[XPEventService] Pending level up event cleared');
    }
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

export const XPEventService = new XPEventServiceClass();

export function calculateLevelFromXP(xp: number): number {
  if (xp < 100) return 1;
  if (xp < 300) return 2;
  if (xp < 600) return 3;
  if (xp < 1000) return 4;
  if (xp < 1500) return 5;
  if (xp < 2100) return 6;
  if (xp < 2800) return 7;
  if (xp < 3600) return 8;
  if (xp < 4500) return 9;
  if (xp < 5500) return 10;
  if (xp < 6600) return 11;
  if (xp < 7800) return 12;
  if (xp < 9100) return 13;
  if (xp < 10500) return 14;
  if (xp < 12000) return 15;
  if (xp < 13600) return 16;
  if (xp < 15300) return 17;
  if (xp < 17100) return 18;
  if (xp < 19000) return 19;
  return 20 + Math.floor((xp - 19000) / 2000);
}

export function getLevelTitle(level: number): string {
  if (level >= 50) return "Legend";
  if (level >= 40) return "Grandmaster";
  if (level >= 30) return "Master";
  if (level >= 25) return "Expert";
  if (level >= 20) return "Veteran";
  if (level >= 15) return "Professional";
  if (level >= 10) return "Adept";
  if (level >= 7) return "Skilled";
  if (level >= 5) return "Apprentice";
  if (level >= 3) return "Novice";
  return "Beginner";
}

export function detectLevelUp(oldXP: number, newXP: number): LevelUpEvent | null {
  const oldLevel = calculateLevelFromXP(oldXP);
  const newLevel = calculateLevelFromXP(newXP);

  if (newLevel > oldLevel) {
    return {
      oldLevel,
      newLevel,
      oldTitle: getLevelTitle(oldLevel),
      newTitle: getLevelTitle(newLevel),
      timestamp: Date.now()
    };
  }

  return null;
}

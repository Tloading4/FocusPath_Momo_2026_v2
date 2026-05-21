import { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Trophy, CheckCircle, RefreshCw, Zap, Keyboard, Pause } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  query,
  getDocs,
  where,
  setDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { PreSessionModal } from './PreSessionModal';
import { FocusMiniGame } from './FocusMiniGame';
import PostSessionSurvey from './PostSessionSurvey';
import { MomoPostSession } from '../FocusAI/MomoPostSession';
import { ExtensionBridge } from '../../services/ExtensionBridge';
import { ConfettiCanvas } from './ConfettiCanvas';
import { soundService, SoundType } from '../../services/soundService';
import { notificationService, tabAlertService } from '../../services/notificationService';
import { LevelingService } from '../../services/LevelingService';
import { XPEventService, detectLevelUp } from '../../services/XPEventService';
import { SurveyStateService } from '../../services/SurveyStateService';

interface SessionType {
  id: string;
  name: string;
  duration: number; // minutes
  xp: number;
  color: string;
  bgColor: string;
}

interface PreSessionData {
  category: string;
  customTask: string;
  goal?: {
    type: 'time' | 'quantity' | 'completion' | 'custom';
    description: string;
    target?: number;
    unit?: string;
  };
  motivation: string;
  focusMode?: 'school' | 'work';
  schoolModeType?: 'homework' | 'test_prep';
  subject?: string;
  workCategory?: string;
}

const sessionTypes: SessionType[] = [
  { id: 'easy',    name: 'Easy Focus',    duration: 15
   , xp: 5,  color: 'text-green-400',  bgColor: 'from-green-500 to-emerald-600' },
  { id: 'medium',  name: 'Medium Focus',  duration: 30, xp: 10, color: 'text-yellow-400', bgColor: 'from-yellow-500 to-orange-600' },
  { id: 'hard',    name: 'Hard Focus',    duration: 45, xp: 15, color: 'text-orange-400', bgColor: 'from-orange-500 to-red-600' },
  { id: 'extreme', name: 'Extreme Focus', duration: 60, xp: 20, color: 'text-red-400',    bgColor: 'from-red-500 to-pink-600' },
];

interface FocusTimerProps {
  onSessionComplete: (xpDelta: number) => void;
}

// localStorage key helper for per-user minimized state
const spotifyMinKey = (uid?: string) => `ui:spotifyMinimized:${uid ?? 'anon'}`;

export function FocusTimer({ onSessionComplete }: FocusTimerProps) {
  const [selectedSession, setSelectedSession] = useState(sessionTypes[1]);
  const [timeLeft, setTimeLeft] = useState(selectedSession.duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false); // true only when the timer naturally hits 0
  const [showEndSession, setShowEndSession] = useState(false);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [pulseIntensity, setPulseIntensity] = useState(1);
  const [showMotivation, setShowMotivation] = useState(false);
  const [showPreSessionModal, setShowPreSessionModal] = useState(false);
  const [sessionData, setSessionData] = useState<PreSessionData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [eligibleForMiniGame, setEligibleForMiniGame] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false); // visible keyboard shortcuts
  const [showConfetti, setShowConfetti] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [completionTimeLeft, setCompletionTimeLeft] = useState<number | null>(null); // 60 sec countdown after timer ends
  const [timedOut, setTimedOut] = useState(false); // tracks if user timed out without ending session
  const [isPaused, setIsPaused] = useState(false); // pause state
  const [pauseCount, setPauseCount] = useState(0); // number of times paused
  const [totalPauseTime, setTotalPauseTime] = useState(0); // total seconds paused
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null); // when current pause started
  const [pauseEvents, setPauseEvents] = useState<Array<{ timestamp: Date; duration: number; sessionProgress: number }>>([]); // detailed pause tracking
  const [showPostSurvey, setShowPostSurvey] = useState(false);
  const [pendingSurveyData, setPendingSurveyData] = useState<any>(null);
  const [showMomoReflection, setShowMomoReflection] = useState(false);
  const [completedSurveyResult, setCompletedSurveyResult] = useState<any>(null);

  const { currentUser } = useAuth();

  // timing refs
  const intervalRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null); // wall-clock start
  const endTimeRef = useRef<number | null>(null); // absolute end timestamp
  const activeSecondsRef = useRef(0);                      // tracks only active focus seconds
  const lastTickRef = useRef<number | null>(null);         // last active tick timestamp (ms)
  const completionIntervalRef = useRef<number | null>(null); // 10 sec countdown interval
  const pauseTimeRef = useRef(0); // accumulated pause time in ms

  // defaults handling
  const appliedDefaultOnceRef = useRef(false);
  const userManuallyChangedRef = useRef(false);

  const extensionBridge = useRef(ExtensionBridge.getInstance());

  // Persisted Spotify minimized state (restored from localStorage)
  const [isSpotifyMinimized, setIsSpotifyMinimized] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem(spotifyMinKey()); // before auth: use anon key
      return raw === '1';
    } catch {
      return false;
    }
  });

  // Derived flags from settings (safe defaults)
  const autoStartBreaks = !!userSettings?.preferences?.autoStartBreaks;
  const soundEnabled = userSettings?.preferences?.soundEnabled ?? true;
  const soundType = (userSettings?.preferences?.soundType as SoundType) || 'classic-beep';
  const soundVolume = userSettings?.preferences?.soundVolume ?? 0.5;
  const notificationsEnabled = userSettings?.preferences?.notificationsEnabled ?? true;
  const repeatingSoundEnabled = userSettings?.preferences?.repeatingSoundEnabled ?? false;
  const repeatingSoundInterval = userSettings?.preferences?.repeatingSoundInterval ?? 30;
  const tabFlashEnabled = userSettings?.preferences?.tabFlashEnabled ?? true;

  // --- Helpers ---
  const startTicking = () => {
    lastTickRef.current = Date.now();
    // Calculate absolute end time when starting
    if (sessionStartTimeRef.current) {
      endTimeRef.current = sessionStartTimeRef.current + (selectedSession.duration * 60 * 1000);
    }
    setIsRunning(true);
  };

  const finalizeActiveTime = () => {
    if (lastTickRef.current) {
      activeSecondsRef.current += Math.floor((Date.now() - lastTickRef.current) / 1000);
      lastTickRef.current = null;
    }
  };

  // Pause/Resume handlers
  const handlePause = () => {
    if (!isRunning || isPaused) return;

    // Finalize active time before pausing
    finalizeActiveTime();

    // Record pause start
    const now = Date.now();
    setPauseStartTime(now);
    setIsPaused(true);
    setPauseCount(prev => prev + 1);

    // Stop the timer interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Sync with extension
    extensionBridge.current.syncSessionData({
      currentSession: selectedSession.name,
      sessionStartTime: sessionStartTimeRef.current,
      isPaused: true,
      pauseCount: pauseCount + 1,
      distractionCount: 0,
      focusScore: 100,
    });
  };

  const handleResume = () => {
    if (!isRunning || !isPaused || !pauseStartTime) return;

    // Calculate pause duration
    const now = Date.now();
    const pauseDuration = now - pauseStartTime;
    pauseTimeRef.current += pauseDuration;
    setTotalPauseTime(prev => prev + Math.floor(pauseDuration / 1000));

    // Record pause event with context
    const sessionElapsedSeconds = activeSecondsRef.current;
    const sessionTotalSeconds = selectedSession.duration * 60;
    const sessionProgress = Math.min((sessionElapsedSeconds / sessionTotalSeconds) * 100, 100);

    setPauseEvents(prev => [...prev, {
      timestamp: new Date(pauseStartTime),
      duration: Math.floor(pauseDuration / 1000),
      sessionProgress: Math.round(sessionProgress)
    }]);

    // Extend the end time by the pause duration
    if (endTimeRef.current) {
      endTimeRef.current += pauseDuration;
    }

    // Reset pause tracking
    setPauseStartTime(null);
    setIsPaused(false);

    // Resume ticking
    lastTickRef.current = now;

    // Sync with extension
    extensionBridge.current.syncSessionData({
      currentSession: selectedSession.name,
      sessionStartTime: sessionStartTimeRef.current,
      isPaused: false,
      pauseCount: pauseCount,
      distractionCount: 0,
      focusScore: 100,
    });
  };

  // Load user settings from Firestore
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!currentUser) return;
      try {
        const userProfileDoc = await getDoc(doc(db, 'userProfiles', currentUser.uid));
        if (userProfileDoc.exists()) {
          const profileData = userProfileDoc.data();
          const settings = (profileData as any).settings;
          setUserSettings(settings);
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };
    loadUserSettings();
  }, [currentUser]);

  // Apply the default session from settings ONCE (respect manual changes)
  useEffect(() => {
    if (appliedDefaultOnceRef.current) return;
    const def = userSettings?.preferences?.defaultSessionType as SessionType['id'] | undefined;
    if (!def) return;
    if (isRunning || showEndSession || sessionEnded) return; // don't switch mid-session
    if (userManuallyChangedRef.current) return;              // user picked something

    const s = sessionTypes.find(x => x.id === def);
    if (s) {
      setSelectedSession(s);
      setTimeLeft(s.duration * 60);
    }
    appliedDefaultOnceRef.current = true;
  }, [userSettings?.preferences?.defaultSessionType, isRunning, showEndSession, sessionEnded]);

  // Restore per-user minimized state once we know the uid
  useEffect(() => {
    try {
      const key = spotifyMinKey(currentUser?.uid);
      const raw = localStorage.getItem(key);
      if (raw === '1' || raw === '0') setIsSpotifyMinimized(raw === '1');
    } catch {}
  }, [currentUser?.uid]);

  // Keep multiple tabs/windows in sync for this user
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === spotifyMinKey(currentUser?.uid)) {
        setIsSpotifyMinimized(e.newValue === '1');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [currentUser?.uid]);

  // Toggle + persist minimized state
  const toggleSpotifyMinimized = () => {
    setIsSpotifyMinimized(prev => {
      const next = !prev;
      try {
        localStorage.setItem(spotifyMinKey(currentUser?.uid), next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  // Handle messages from Chrome extension
  const handleExtensionMessage = (message: any) => {
    switch (message.type) {
      case 'SESSION_STARTED':
        if (message.data) {
          setSessionData({
            category: message.data.category || 'general',
            customTask: message.data.customTask || 'Focus Session',
            motivation: message.data.motivation || 'Stay focused!',
          });
          const incoming = sessionTypes.find(s => s.name === message.data.sessionType) || sessionTypes[1];
          setSelectedSession(incoming);
          setTimeLeft((message.data.duration || incoming.duration) * 60);

          const start = message.data.startTime;
          sessionStartTimeRef.current = typeof start === 'number' ? start : Date.now();

          // reset counters & begin active ticking
          activeSecondsRef.current = 0;
          lastTickRef.current = null;
          setEligibleForMiniGame(false);
          startTicking();
        }
        break;
      case 'SESSION_ENDED':
        finalizeActiveTime();
        setIsRunning(false);
        setShowEndSession(true);
        setEligibleForMiniGame(false);
        break;
    }
  };

  // Listen for extension messages
  useEffect(() => {
    const unsubscribe = extensionBridge.current.onExtensionMessage((message: any) => {
      handleExtensionMessage(message);
    });
    return unsubscribe;
  }, []);

  // Timer effect (ticks only while running and not paused)
  useEffect(() => {
    if (!isRunning || isPaused) return;

    intervalRef.current = window.setInterval(() => {
      // accumulate only active time
      if (lastTickRef.current) {
        const now = Date.now();
        activeSecondsRef.current += Math.floor((now - lastTickRef.current) / 1000);
        lastTickRef.current = now;
      } else {
        lastTickRef.current = Date.now();
      }

      setTimeLeft(prev => {
        // Calculate remaining time based on absolute end time
        const now = Date.now();
        const remaining = endTimeRef.current ? Math.max(0, Math.floor((endTimeRef.current - now) / 1000)) : prev - 1;
        
        if (remaining <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          finalizeActiveTime(); // Ensure active time is recorded
          setIsRunning(false);
          setIsCompleted(true);
          setShowEndSession(true);
          setCompletionTimeLeft(60); // Start 60 second countdown
          setTimedOut(false);
          startCompletionAlerts();
          return 0;
        }
        return remaining;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isPaused, selectedSession.duration]);

  // Handle tab visibility changes to sync timer
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && !isPaused && endTimeRef.current) {
        // Recalculate time when tab becomes visible again
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
        setTimeLeft(remaining);
        
        // Update last tick to maintain active time accuracy
        lastTickRef.current = now;
        
        // If session should have ended while tab was hidden
        if (remaining <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          finalizeActiveTime(); // Ensure active time is recorded
          setIsRunning(false);
          setIsCompleted(true);
          setShowEndSession(true);
          setCompletionTimeLeft(60); // Start 60 second countdown
          setTimedOut(false);
          startCompletionAlerts();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, isPaused]);

  // Smooth pulse based on progress
  useEffect(() => {
    const total = selectedSession.duration * 60;
    const p = Math.min(1, Math.max(0, (total - timeLeft) / total));
    setPulseIntensity(1 + p * 0.5);
  }, [timeLeft, selectedSession.duration]);

  // Motivation pop-up (first 30s after start)
  useEffect(() => {
    if (isRunning && sessionData) {
      const t1 = setTimeout(() => {
        setShowMotivation(true);
        const t2 = setTimeout(() => setShowMotivation(false), 3000);
        return () => clearTimeout(t2);
      }, 30000);
      return () => clearTimeout(t1);
    }
  }, [isRunning, sessionData]);

  // Guard against accidental navigation while running
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isRunning]);

  // 60-second countdown after session completes
  useEffect(() => {
    if (completionTimeLeft !== null && completionTimeLeft > 0) {
      completionIntervalRef.current = window.setInterval(() => {
        setCompletionTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            // Time's up! Session still complete but with focus penalty
            if (completionIntervalRef.current) clearInterval(completionIntervalRef.current);
            setTimedOut(true); // Mark that user timed out
            // Keep isCompleted as true, but apply penalty in handleCompleteSession
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (completionIntervalRef.current) clearInterval(completionIntervalRef.current);
      };
    }
  }, [completionTimeLeft]);

  // Auto-complete session when countdown expires
  useEffect(() => {
    if (timedOut && completionTimeLeft === 0 && isCompleted && !sessionEnded && !isProcessing) {
      // Automatically complete the session with penalty after a short delay
      const timeoutId = setTimeout(() => {
        // Trigger completion by simulating button click
        const completeButton = document.querySelector('[data-complete-session]') as HTMLButtonElement;
        if (completeButton) {
          completeButton.click();
        }
      }, 2000); // 2 second delay to show the warning message

      return () => clearTimeout(timeoutId);
    }
  }, [timedOut, completionTimeLeft, isCompleted, sessionEnded, isProcessing]);

  // Power-up timestamp safety
  const isActiveAndUnexpired = (powerup?: { isActive?: boolean; expiresAt?: any }) => {
    if (!powerup?.isActive || !powerup.expiresAt) return false;
    const toDate =
      typeof powerup.expiresAt?.toDate === 'function'
        ? powerup.expiresAt.toDate()
        : new Date(powerup.expiresAt);
    return new Date() < toDate;
  };

  // Play completion sound using sound service
  const playCompletionBeep = () => {
    if (!soundEnabled) return;
    soundService.playCompletionSound({
      soundType,
      volume: soundVolume,
      enabled: soundEnabled
    });
  };

  // Start all completion alerts (sound, notification, tab flash)
  const startCompletionAlerts = async () => {
    playCompletionBeep();

    if (notificationsEnabled) {
      await notificationService.showTimerCompleteNotification(
        selectedSession.name,
        selectedSession.xp
      );

      notificationService.sendToExtension({
        type: 'TIMER_COMPLETE',
        data: {
          sessionName: selectedSession.name,
          xp: selectedSession.xp
        }
      });
    }

    if (tabFlashEnabled) {
      tabAlertService.startAlertMode('⏰ TIMER COMPLETE!');
    }

    if (repeatingSoundEnabled && soundEnabled) {
      soundService.startRepeatingSound(soundType, soundVolume, repeatingSoundInterval);
    }
  };

  // Stop all completion alerts
  const stopCompletionAlerts = () => {
    soundService.stopRepeatingSound();
    tabAlertService.stopAlertMode();
    notificationService.stopRepeatingAlert();
  };

  // Handlers
  const handleSessionChange = (session: SessionType) => {
    if (isRunning || isProcessing || showEndSession) return;
    userManuallyChangedRef.current = true; // mark manual override
    setSelectedSession(session);
    setTimeLeft(session.duration * 60);
    setIsCompleted(false);
    setShowEndSession(false);
    setSessionEnded(false);
    setEligibleForMiniGame(false);
    sessionStartTimeRef.current = null;
    endTimeRef.current = null;
    activeSecondsRef.current = 0;
    lastTickRef.current = null;
  };

  const getMotivationalMessage = (): string => {
    const messages = [
      "Keep going, you're doing great!",
      'Stay focused, success is near.',
      'Your future self will thank you.',
      "One step at a time, you've got this!",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const confirmEndSession = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    // If paused, finalize the pause time
    if (isPaused && pauseStartTime) {
      const pauseDuration = Date.now() - pauseStartTime;
      pauseTimeRef.current += pauseDuration;
      setTotalPauseTime(prev => prev + Math.floor(pauseDuration / 1000));
      setPauseStartTime(null);
    }

    finalizeActiveTime();
    setIsRunning(false);
    setIsPaused(false);
    setIsCompleted(false); // manual end - check completion percentage in handleCompleteSession
    setShowEndSession(true);
    setEligibleForMiniGame(false);
    setShowEndConfirmation(false);
    playCompletionBeep();
  };

  const handleEndSession = () => {
    setShowEndConfirmation(true);
  };

  const handleCompleteSession = async () => {
    if (!currentUser) return;

    // Stop all completion alerts
    stopCompletionAlerts();

    // Stop the completion countdown if user clicks in time
    if (completionIntervalRef.current) {
      clearInterval(completionIntervalRef.current);
      completionIntervalRef.current = null;
    }
    setCompletionTimeLeft(null);

    if (!sessionStartTimeRef.current) {
      // If user skipped modal, set a reasonable start based on elapsed
      sessionStartTimeRef.current = Date.now() - (selectedSession.duration * 60 - timeLeft) * 1000;
    }
    setIsProcessing(true);

    try {
      // finalize any in-flight active time
      finalizeActiveTime();

      const endTime = Date.now();
      const durationSec = Math.max(0, activeSecondsRef.current); // focused seconds only

      // Completion logic
      const sessionDurationSec = selectedSession.duration * 60;
      const completionPercentage = Math.min(durationSec / sessionDurationSec, 1);
      const completionThreshold = 0.8; // 80%
      // Session is complete if timer naturally ended (isCompleted) OR if 80%+ of time was spent
      const isSessionComplete = isCompleted || completionPercentage >= completionThreshold;

      // Duration recording logic
      // For completed sessions: record the planned duration
      // For incomplete sessions: record the actual focused time
      const recordedDurationSeconds = isSessionComplete ? sessionDurationSec : durationSec;
      const recordedDurationMinutes = isSessionComplete ? selectedSession.duration : Math.round(durationSec / 60);

      // Load profile & powerups
      const profileRef = doc(db, 'userProfiles', currentUser.uid);
      const profileSnap = await getDoc(profileRef);
      const profileData = profileSnap.exists() ? profileSnap.data() : {};
      const activePowerUps = (profileData as any).activePowerUps || {};

      // XP multiplier
      let xpMultiplier = 1;
      if (isActiveAndUnexpired(activePowerUps.powerup_double_xp)) {
        xpMultiplier = 2;
      }

      // Focus score penalty calculation
      let focusScorePenalty = 0;

      // Penalty for timing out (not ending session within 60 seconds)
      if (timedOut) {
        focusScorePenalty += 30;
      }

      // Penalty for pausing: 5 points per pause, max 40 points
      if (pauseCount > 0) {
        const pausePenalty = Math.min(pauseCount * 5, 40);
        focusScorePenalty += pausePenalty;
      }

      // Additional penalty based on total pause time (1 point per 30 seconds paused)
      if (totalPauseTime > 0) {
        const timePenalty = Math.min(Math.floor(totalPauseTime / 30), 20);
        focusScorePenalty += timePenalty;
      }

      // Penalty for ending session early (incomplete session)
      if (!isSessionComplete) {
        // Penalty scales with how early the session was ended
        // 0% complete = 40 point penalty, 79% complete = ~8 point penalty
        const earlyEndPenalty = Math.floor((1 - completionPercentage) * 40);
        focusScorePenalty += earlyEndPenalty;
      }

      // Determine XP
      let xpEarned = 0;
      let xpDeducted = 0;

      if (isSessionComplete) {
        xpEarned = Math.floor(selectedSession.xp * xpMultiplier);
      } else {
        xpDeducted = Math.max(Math.floor(selectedSession.xp * 0.1), 5);
      }

      // Calculate focus score
      const calculatedFocusScore = Math.max(0, 100 - focusScorePenalty);

      // Save session log
      const sessionDocRef = await addDoc(
        collection(db, 'userProfiles', currentUser.uid, 'sessions'),
        {
          userId: currentUser.uid,
          sessionType: selectedSession.id,
          sessionTypeName: selectedSession.name,
          category: sessionData?.category || null,
          customTask: sessionData?.customTask || null,
          goal: sessionData?.goal || null,
          motivation: sessionData?.motivation || null,
          focusMode: sessionData?.focusMode || null,
          schoolModeType: sessionData?.schoolModeType || null,
          subject: sessionData?.subject || null,
          workCategory: sessionData?.workCategory || null,
          startTime: new Date(sessionStartTimeRef.current),
          endTime: new Date(endTime),
          duration: recordedDurationMinutes, // planned duration for completed, actual for incomplete
          durationSeconds: recordedDurationSeconds, // planned duration for completed, actual for incomplete
          targetDuration: selectedSession.duration, // planned duration in minutes
          targetDurationSeconds: selectedSession.duration * 60, // planned duration in seconds
          xpEarned,
          xpDeducted: isSessionComplete ? 0 : xpDeducted,
          baseXP: selectedSession.xp,
          xpMultiplier,
          completionPercentage: Math.round(completionPercentage * 100),
          completed: isSessionComplete,
          date: new Date(),
          analytics: {
            focusScore: calculatedFocusScore,
            distractionCount: 0,
            actualFocusTime: durationSec, // seconds of actual focus
            plannedFocusTime: selectedSession.duration * 60, // planned seconds
            focusEfficiency: Math.round(completionPercentage * 100), // percentage of planned time achieved
            timedOut, // track if user timed out
            pauseCount, // number of times paused
            totalPauseTime, // total seconds paused
            pausePenalty: pauseCount > 0 || totalPauseTime > 0, // flag if pause penalty applied
            pauseEvents, // detailed pause tracking with timestamps and context
          },
        }
      );

      // Update profile XP atomically
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(profileRef);
        const data = snap.exists() ? (snap.data() as any) : {};
        const curTotal = typeof data.totalXP === 'number' ? data.totalXP : 0;
        const curMarket = typeof data.marketplaceXP === 'number' ? data.marketplaceXP : 0;

        if (isSessionComplete) {
          const nextTotal = curTotal + xpEarned;
          const nextMarket = curMarket + xpEarned;
          tx.set(
            profileRef,
            {
              totalXP: nextTotal,
              marketplaceXP: nextMarket,
              lastUpdated: new Date(),
              lastSessionDate: new Date(),
            },
            { merge: true }
          );
        } else if (xpDeducted > 0) {
          const nextTotal = Math.max(0, curTotal - xpDeducted);
          tx.set(
            profileRef,
            {
              totalXP: nextTotal,
              lastUpdated: new Date(),
            },
            { merge: true }
          );
        }
      });

      // Parent callback: positive XP if complete, negative if deduction
      onSessionComplete(isSessionComplete ? xpEarned : -xpDeducted);

      // Emit XP event and check for level-up
      if (isSessionComplete && xpEarned > 0) {
        const profileRef = doc(db, 'userProfiles', currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        const profileData = profileSnap.exists() ? profileSnap.data() : {};
        const oldXP = (profileData.totalXP || 0) - xpEarned;
        const newXP = profileData.totalXP || 0;

        XPEventService.emitXPGain(
          'Focus Session',
          xpEarned,
          { x: window.innerWidth / 2, y: window.innerHeight / 2 },
          {
            sessionId: selectedSession.id,
            sessionType: selectedSession.name,
            duration: selectedSession.duration,
            streakMultiplier: xpMultiplier
          }
        );

        const levelUpEvent = detectLevelUp(oldXP, newXP);
        if (levelUpEvent) {
          XPEventService.emitLevelUp(
            levelUpEvent.oldLevel,
            levelUpEvent.newLevel,
            levelUpEvent.oldTitle,
            levelUpEvent.newTitle
          );
        }
      }

      // UI state
      setEligibleForMiniGame(isSessionComplete); // 🚦 only complete sessions unlock minigame
      setShowEndSession(false);

      // Show celebration for completed sessions
      if (isSessionComplete) {
        // Check for new achievements
        await checkForNewAchievements(xpEarned);

        // Start celebration sequence
        setShowConfetti(true);

        // Check if survey should be shown
        const shouldShow = await SurveyStateService.shouldShowSurvey(
          currentUser.uid,
          selectedSession.duration
        );

        if (shouldShow) {
          // Store session data for survey - SHOW SURVEY IMMEDIATELY
          setPendingSurveyData({
            sessionId: sessionDocRef.id,
            sessionType: selectedSession.name,
            focusScore: calculatedFocusScore,
            duration: selectedSession.duration,
            xpEarned
          });

          // Show survey immediately after confetti ends (before mini games)
          setTimeout(() => {
            setShowConfetti(false);
            setShowPostSurvey(true);
          }, 3000);
        } else {
          // Increment session count even if not showing survey
          await SurveyStateService.incrementSessionCount(currentUser.uid);

          // Show mini games after confetti if eligible
          setTimeout(() => {
            setShowConfetti(false);
            if (eligibleForMiniGame) {
              setShowMiniGame(true);
            } else {
              setSessionEnded(true);
            }
          }, 3000);
        }
      } else {
        // If not complete, just end normally
        setSessionEnded(true);
      }

      // Auto-start break if enabled and session complete
      if (isSessionComplete && autoStartBreaks) {
        setTimeout(() => {
          alert('🎉 Session completed! Auto-starting a 5-minute break as per your settings.');
        }, 500);
      }

      // Sync with extension
      await extensionBridge.current.syncSessionData({
        currentSession: null,
        sessionStartTime: null,
        distractionCount: 0,
        focusScore: 100,
      });
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save session. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const checkForNewAchievements = async (xpEarned: number) => {
    if (!currentUser) return [];
    
    try {
      // Get current user stats
      const profileRef = doc(db, 'userProfiles', currentUser.uid);
      const profileSnap = await getDoc(profileRef);
      const profileData = profileSnap.exists() ? profileSnap.data() : {};
      
      const currentXP = profileData.totalXP || 0;
      const newTotalXP = currentXP + xpEarned;
      
      // Get session count
      const sessionsQuery = query(collection(db, 'userProfiles', currentUser.uid, 'sessions'));
      const sessionsSnap = await getDocs(sessionsQuery);
      const sessionCount = sessionsSnap.docs.filter((docSnap) => docSnap.data().completed !== false).length;
      
      // Get streak data
      const streakRef = doc(db, 'streaks', currentUser.uid);
      const streakSnap = await getDoc(streakRef);
      const streakData = streakSnap.exists() ? streakSnap.data() : {};
      const currentStreak = streakData.currentStreak || 0;
      
      const achievements = [];

      // Check for level up achievements
      const oldLevel = LevelingService.getLevelFromXP(currentXP);
      const newLevel = LevelingService.getLevelFromXP(newTotalXP);

      if (newLevel > oldLevel) {
        achievements.push({
          id: `level_${newLevel}`,
          name: `Level ${newLevel} Achieved!`,
          description: `You've reached Level ${newLevel}!`,
          icon: newLevel >= 10 ? '👑' : newLevel >= 5 ? '⭐' : '🎯',
          rarity: newLevel >= 10 ? 'epic' : newLevel >= 5 ? 'rare' : 'common',
          xpReward: 50
        });
      }
      
      // Check for XP milestones
      if (currentXP < 1000 && newTotalXP >= 1000) {
        achievements.push({
          id: 'xp_1000',
          name: 'XP Master',
          description: 'Earned 1,000 total XP!',
          icon: '💎',
          rarity: 'rare',
          xpReward: 100
        });
      }
      
      // Check for session milestones
      if (sessionCount === 10) {
        achievements.push({
          id: 'sessions_10',
          name: 'Dedicated Focuser',
          description: 'Completed 10 focus sessions!',
          icon: '🔥',
          rarity: 'rare',
          xpReward: 75
        });
      }
      
      // Check for streak achievements
      if (currentStreak === 7) {
        achievements.push({
          id: 'streak_7',
          name: 'Week Warrior',
          description: 'Maintained a 7-day streak!',
          icon: '⚡',
          rarity: 'epic',
          xpReward: 150
        });
      }
      
      return achievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  };

  const checkForLevelAvatarRewards = async (xpEarned: number) => {
    if (!currentUser) return;
    
    try {
      const profileRef = doc(db, 'userProfiles', currentUser.uid);
      const profileSnap = await getDoc(profileRef);
      const profileData = profileSnap.exists() ? profileSnap.data() : {};
      
      const currentXP = profileData.totalXP || 0;
      const newTotalXP = currentXP + xpEarned;

      const oldLevel = LevelingService.getLevelFromXP(currentXP);
      const newLevel = LevelingService.getLevelFromXP(newTotalXP);

      // Level-based avatar rewards
      const levelAvatars = {
        5: 'avatar_star',      // Level 5: Star Avatar
        10: 'avatar_crown',    // Level 10: Crown Avatar  
        15: 'avatar_gem',      // Level 15: Gem Avatar
        20: 'avatar_trophy',   // Level 20: Trophy Avatar
        25: 'avatar_lightning' // Level 25: Lightning Avatar
      };
      
      // Check if user reached a new level that has an avatar reward
      if (newLevel > oldLevel) {
        const rewardAvatar = levelAvatars[newLevel as keyof typeof levelAvatars];
        
        if (rewardAvatar) {
          // Check if user already has this avatar
          const purchasesQuery = query(
            collection(db, 'userProfiles', currentUser.uid, 'purchases'),
            where('itemId', '==', rewardAvatar)
          );
          const existingPurchase = await getDocs(purchasesQuery);
          
          if (existingPurchase.empty) {
            // Award the level avatar
            await addDoc(collection(db, 'userProfiles', currentUser.uid, 'purchases'), {
              itemId: rewardAvatar,
              itemName: `Level ${newLevel} Reward Avatar`,
              category: 'avatar',
              xpSpent: 0, // Free reward
              datePurchased: new Date(),
              source: 'level_reward'
            });
            
            // Set as active avatar
            await setDoc(profileRef, {
              activeAvatar: rewardAvatar,
              lastUpdated: new Date()
            }, { merge: true });
            
            // Show notification
            alert(`🎉 Level ${newLevel} Reward! You've unlocked a special avatar!`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking level avatar rewards:', error);
    }
  };

  const handleSurveyComplete = async (surveyData: any) => {
    if (!currentUser || !pendingSurveyData) return;

    try {
      // Save survey data to session metadata
      const sessionRef = doc(db, 'userProfiles', currentUser.uid, 'sessions', pendingSurveyData.sessionId);
      await setDoc(sessionRef, {
        session_metadata: {
          post_survey: {
            ...surveyData,
            logged_at: new Date().toISOString()
          }
        }
      }, { merge: true });

      // Record survey completion in user stats
      await SurveyStateService.recordSurveyCompletion(currentUser.uid);

      // Hide survey, show Momo reflection before mini game
      setShowPostSurvey(false);
      setCompletedSurveyResult(surveyData);
      setTimeout(() => {
        setShowMomoReflection(true);
      }, 300);
    } catch (error) {
      console.error('Error saving survey:', error);
      setShowPostSurvey(false);
      setShowMiniGame(true);
    }
  };

  const handleSurveySkip = async () => {
    if (!currentUser || !pendingSurveyData) return;

    try {
      // Record survey skip in session metadata
      const sessionRef = doc(db, 'userProfiles', currentUser.uid, 'sessions', pendingSurveyData.sessionId);
      await setDoc(sessionRef, {
        session_metadata: {
          post_survey: {
            skipped: true,
            skipped_at: new Date().toISOString()
          }
        }
      }, { merge: true });

      // Record survey skip in user stats
      await SurveyStateService.recordSurveySkip(currentUser.uid);
    } catch (error) {
      console.error('Error recording survey skip:', error);
    }

    // Skip Momo reflection on survey skip, go straight to mini game
    setShowPostSurvey(false);
    setTimeout(() => {
      setShowMiniGame(true);
    }, 300);
  };

  const handleStartNewSession = () => {
    // Stop all alerts
    stopCompletionAlerts();

    // If user never manually changed, reset to default each time
    if (!userManuallyChangedRef.current && userSettings?.preferences?.defaultSessionType) {
      const defId = userSettings.preferences.defaultSessionType as SessionType['id'];
      const s = sessionTypes.find(x => x.id === defId);
      if (s) {
        setSelectedSession(s);
        setTimeLeft(s.duration * 60);
      } else {
        setTimeLeft(selectedSession.duration * 60);
      }
    } else {
      setTimeLeft(selectedSession.duration * 60);
    }

    setSessionData(null);
    setIsCompleted(false);
    setShowEndSession(false);
    setSessionEnded(false);
    setEligibleForMiniGame(false);
    setIsPaused(false);
    setPauseCount(0);
    setTotalPauseTime(0);
    setPauseStartTime(null);
    sessionStartTimeRef.current = null;
    endTimeRef.current = null;
    activeSecondsRef.current = 0;
    lastTickRef.current = null;
    pauseTimeRef.current = 0;

    extensionBridge.current.syncSessionData({
      currentSession: null,
      sessionStartTime: null,
      distractionCount: 0,
      focusScore: 100,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress =
    ((selectedSession.duration * 60 - timeLeft) / (selectedSession.duration * 60)) * 100;

  // Keyboard shortcuts:
  //  - S: Start ONLY
  //  - P: Pause/Resume
  //  - E: End Session ONLY while actively running
  //  - M: Toggle Focus Music player
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      if (k === 's') {
        if (!isRunning && !showEndSession && !sessionEnded) {
          if (sessionData) {
            if (!sessionStartTimeRef.current) sessionStartTimeRef.current = Date.now();
            endTimeRef.current = sessionStartTimeRef.current + (selectedSession.duration * 60 * 1000);
            startTicking();
          } else {
            setShowPreSessionModal(true);
          }
        }
      }

      if (k === 'p') {
        if (isRunning && sessionStartTimeRef.current && !showEndSession && !sessionEnded) {
          if (isPaused) {
            handleResume();
          } else {
            handlePause();
          }
        }
      }

      if (k === 'e') {
        if (isRunning && sessionStartTimeRef.current && !showEndSession && !sessionEnded) {
          handleEndSession();
        }
      }

      if (k === 'm') {
        toggleSpotifyMinimized();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRunning, isPaused, sessionData, showEndSession, sessionEnded, pauseCount]);

  return (
    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-2xl hover-lift animate-fade-in relative overflow-hidden">
      {/* Header with Shortcuts button */}
      <div className="flex items-center justify-between mb-4">
        <div />
        <button
          onClick={() => setShowShortcuts(true)}
          className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all text-white flex items-center gap-2"
          aria-label="Show keyboard shortcuts"
          title="Keyboard Shortcuts"
        >
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">Shortcuts</span>
        </button>
      </div>

      {/* Pre-Session Modal */}
      <PreSessionModal
        isOpen={showPreSessionModal}
        onClose={() => setShowPreSessionModal(false)}
        onStartSession={data => {
          setSessionData(data);
          setShowPreSessionModal(false);
          sessionStartTimeRef.current = Date.now();
          endTimeRef.current = sessionStartTimeRef.current + (selectedSession.duration * 60 * 1000);
          activeSecondsRef.current = 0;
          lastTickRef.current = null;
          setEligibleForMiniGame(false);
          setTimeout(() => startTicking(), 300);
        }}
        sessionType={selectedSession}
      />

      {/* Motivational popup */}
      {showMotivation && isRunning && !sessionData && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 animate-bounce-in">
          <div className="bg-gradient-to-r from-blue-500/90 to-purple-600/90 text-white px-4 py-2 rounded-full backdrop-blur-sm">
            {getMotivationalMessage()}
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Focus Session</h2>
        <p className="text-gray-300">Choose your challenge and start focusing</p>

        {sessionData && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-blue-200">
            <div>
              <strong>{sessionData.category}</strong> • {sessionData.customTask}
            </div>
            {sessionData.goal && <div>Goal: {sessionData.goal.description}</div>}
          </div>
        )}
      </div>

      {/* Session Type Selector */}
      <div className="grid grid-cols-2 gap-2 mb-8">
        {sessionTypes.map((session, i) => (
          <button
            key={session.id}
            onClick={() => handleSessionChange(session)}
            disabled={isRunning || isProcessing || showEndSession}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedSession.id === session.id
                ? `border-white bg-gradient-to-r ${session.bgColor} text-white`
                : 'border-white/20 bg-white/5 text-gray-300'
            } ${isRunning || isProcessing || showEndSession ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ animationDelay: `${i * 0.1}s` }}
            aria-pressed={selectedSession.id === session.id}
            aria-label={`Select ${session.name}`}
          >
            <div className="font-semibold">{session.name}</div>
            <div className="opacity-80 text-sm">
              {session.duration}m • {session.xp} XP
            </div>
          </button>
        ))}
      </div>

      {/* Timer Display */}
      <div className="relative mb-8">
        <div className="w-64 h-64 mx-auto relative">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="url(#gradient)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              style={{
                filter: isRunning ? `drop-shadow(0 0 ${pulseIntensity * 10}px rgba(59,130,246,0.6))` : 'none',
              }}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-5xl font-bold text-white ${isRunning ? 'animate-timer-pulse' : ''}`} aria-live="polite">
              {formatTime(timeLeft)}
            </div>
            <div className={`text-lg font-semibold ${selectedSession.color}`}>{selectedSession.name}</div>
          </div>
        </div>
      </div>

      {/* Pause Warning Banner */}
      {isPaused && isRunning && (
        <div className="mb-6 bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 text-center animate-pulse">
          <div className="text-yellow-300 font-bold text-lg mb-2">⏸️ Session Paused</div>
          <div className="text-yellow-200 text-sm">
            {pauseCount > 0 && (
              <div className="mb-1">Paused {pauseCount} time{pauseCount > 1 ? 's' : ''} • Focus score penalty: -{Math.min(pauseCount * 5, 40)} points</div>
            )}
            {totalPauseTime > 0 && (
              <div>Total pause time: {Math.floor(totalPauseTime / 60)}m {totalPauseTime % 60}s</div>
            )}
          </div>
        </div>
      )}

      {/* Timer Controls */}
      {!showEndSession && !sessionEnded && (
        <div className="flex justify-center gap-4 mb-6">
          {!isRunning && (
            <button
              onClick={() => {
                if (!sessionData) {
                  setShowPreSessionModal(true);
                } else {
                  if (!sessionStartTimeRef.current) sessionStartTimeRef.current = Date.now();
                  endTimeRef.current = sessionStartTimeRef.current + (selectedSession.duration * 60 * 1000);
                  startTicking();
                }
              }}
              disabled={isProcessing}
              className={`bg-green-500 px-6 py-3 rounded-xl text-white flex items-center gap-2 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Start session"
              title="Press S to start"
            >
              <Play /> {isProcessing ? 'Please wait...' : 'Start'}
            </button>
          )}
          {isRunning && (
            <button
              onClick={isPaused ? handleResume : handlePause}
              disabled={isProcessing}
              className={`${isPaused ? 'bg-green-500' : 'bg-yellow-500'} px-6 py-3 rounded-xl text-white flex items-center gap-2 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={isPaused ? 'Resume session' : 'Pause session'}
              title={isPaused ? 'Press P to resume' : 'Press P to pause'}
            >
              {isPaused ? (
                <>
                  <Play /> Resume
                </>
              ) : (
                <>
                  <Pause /> Pause
                </>
              )}
            </button>
          )}
          <button
            onClick={handleEndSession}
            disabled={isProcessing || !sessionStartTimeRef.current}
            className={`bg-red-500 px-6 py-3 rounded-xl text-white flex items-center gap-2 ${
              isProcessing || !sessionStartTimeRef.current ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            aria-label="End session early"
            title="Press E to end (while running)"
          >
            <RotateCcw /> End Session
          </button>
        </div>
      )}

      {/* Spotify Focus Music */}
      <div className="mb-6 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">🎵 Focus Music</h3>
          <button
            onClick={toggleSpotifyMinimized}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all text-white"
            title={isSpotifyMinimized ? 'Expand player' : 'Minimize player'}
            aria-label={isSpotifyMinimized ? 'Expand Spotify player' : 'Minimize Spotify player'}
          >
            {isSpotifyMinimized ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" />
              </svg>
            )}
          </button>
        </div>

        {!isSpotifyMinimized && (
          <div className="max-w-md mx-auto">
            <iframe
              data-testid="embed-iframe"
              style={{ borderRadius: '12px' }}
              src="https://open.spotify.com/embed/playlist/5bBfx44br2c723x36zVOoR?utm_source=generator"
              width="100%"
              height="352"
              frameBorder="0"
              allowFullScreen={true}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Focus Music Playlist"
            />
          </div>
        )}

        {isSpotifyMinimized && (
          <div className="text-center py-4">
            <div className="text-gray-400 text-sm">🎵 Music playing in background — click to expand player</div>
          </div>
        )}

        {/* Hidden iframe when minimized to keep music playing */}
        {isSpotifyMinimized && (
          <div className="hidden">
            <iframe
              data-testid="embed-iframe-hidden"
              style={{ borderRadius: '12px' }}
              src="https://open.spotify.com/embed/playlist/5bBfx44br2c723x36zVOoR?utm_source=generator"
              width="100%"
              height="352"
              frameBorder="0"
              allowFullScreen={true}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Focus Music Playlist (hidden)"
            />
          </div>
        )}

        <div className="mt-3 text-center">
          <p className="text-xs text-gray-400">Curated focus playlist to enhance concentration</p>
        </div>
      </div>

{/* FULL-SCREEN SESSION COMPLETE MODAL */}
{showEndSession && (
  <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
    <div
      className="w-full max-w-lg rounded-2xl p-8 text-center shadow-2xl bg-black/90 border border-white/10"
    >
      {isCompleted ? (
        <Trophy className="mx-auto mb-4 text-yellow-400" size={48} />
      ) : (
        <div className="mx-auto mb-4 text-orange-400 text-4xl">⚠️</div>
      )}

      <h3
        className={`text-3xl font-bold mb-3 ${
          isCompleted ? 'text-green-300' : 'text-orange-300'
        }`}
      >
        {isCompleted ? '🎉 Session Complete!' : '⏰ Session Ended Early'}
      </h3>

      {isCompleted && completionTimeLeft !== null && completionTimeLeft > 0 && (
        <div className="mb-3 text-yellow-300 font-bold text-lg animate-pulse">
          ⏱️ End session within {completionTimeLeft} seconds or your focus score will decrease!
        </div>
      )}

      {isCompleted && completionTimeLeft === 0 && !sessionEnded && (
        <div className="mb-3 text-red-300 font-bold text-lg">
          ⚠️ Time expired! Your focus score has been reduced.
        </div>
      )}

      <p className={`${isCompleted ? 'text-green-200' : 'text-orange-200'} mb-6`}>
        {isCompleted ? (
          <>
            Base XP: <strong>{selectedSession.xp}</strong>
          </>
        ) : (
          <>
            XP Deduction:{' '}
            <strong>-{Math.max(Math.floor(selectedSession.xp * 0.1), 5)}</strong>
          </>
        )}
      </p>

      {/* Completed UI Options */}
      {isCompleted ? (
        <>
          <p className="text-green-200 text-lg font-semibold mb-6">
            What would you like to do next?
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4">
            <button
              onClick={async () => {
                await handleCompleteSession();
                setShowMiniGame(true);
              }}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-xl w-full sm:w-auto text-white flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:scale-105 transition-all ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              data-complete-session
            >
              <Zap className="h-5 w-5" />
              {isProcessing ? 'Saving...' : 'Mini Game + New Session'}
            </button>

            <button
              onClick={async () => {
                await handleCompleteSession();
                handleStartNewSession();
              }}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-xl w-full sm:w-auto text-white flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-105 transition-all ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className="h-5 w-5" />
              {isProcessing ? 'Saving...' : 'Start New Session'}
            </button>
          </div>

          <p className="text-green-200/80 text-sm">
            💡 Mini-games provide a fun brain break and bonus XP!
          </p>
        </>
      ) : (
        // Not completed
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={handleCompleteSession}
            disabled={isProcessing}
            className={`px-6 py-3 rounded-xl w-full sm:w-auto text-white bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2 ${
              isProcessing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            data-complete-session
          >
            <CheckCircle />
            {isProcessing ? 'Saving...' : 'Accept & Continue'}
          </button>

          <button
            onClick={handleStartNewSession}
            disabled={isProcessing}
            className={`px-6 py-3 rounded-xl w-full sm:w-auto text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 ${
              isProcessing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw />
            New Session
          </button>
        </div>
      )}
    </div>
  </div>
)}


      {/* Session Ended Confirmation */}
      {sessionEnded && (
        <div className="bg-blue-100 rounded-xl p-6 text-center">
          <Trophy className="mx-auto mb-3 text-yellow-400" size={24} />
          <h3 className="text-2xl font-bold mb-2">Session Saved!</h3>
          <p className="text-gray-700 mb-4">
            You {eligibleForMiniGame ? 'earned XP and kept your streak.' : 'updated your stats.'}
          </p>
          <button onClick={handleStartNewSession} className="bg-blue-600 px-6 py-3 rounded-xl text-white flex items-center gap-2 mx-auto" aria-label="Start another session">
            <RefreshCw /> Start Another Session
          </button>
        </div>
      )}

      {/* Confetti Canvas */}
      <ConfettiCanvas
        isActive={showConfetti}
        duration={3000}
        intensity="high"
      />

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 text-white shadow-2xl border border-white/10">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 id="shortcuts-title" className="text-lg font-semibold flex items-center gap-2">
                <Keyboard className="h-5 w-5" /> Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-white/70 hover:text-white rounded-lg px-2 py-1"
                aria-label="Close shortcuts"
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-white/80">Start</span>
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20">S</kbd>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-white/80">
                    Pause / Resume <span className="text-white/50">(while running)</span>
                  </span>
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20">P</kbd>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-white/80">
                    End Session <span className="text-white/50">(while running)</span>
                  </span>
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20">E</kbd>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-white/80">Toggle Focus Music</span>
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20">M</kbd>
                </li>
              </ul>

              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs text-yellow-200">
                  ⚠️ Note: Pausing reduces your focus score. Each pause: -5 points (max -40)
                </p>
              </div>

              <p className="mt-5 text-xs text-white/60">
                Tip: Use the buttons anytime — the keyboard just makes it faster.
              </p>
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowShortcuts(false)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Session Confirmation Modal */}
      {showEndConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-confirmation-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 text-white shadow-2xl border border-white/10">
            <div className="p-6">
              <h3 id="end-confirmation-title" className="text-xl font-bold mb-3 text-center">
                End Session Early?
              </h3>
              <p className="text-gray-300 text-center mb-6">
                Are you sure you want to end this session early? You'll lose XP for not completing the full session.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirmation(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 px-4 py-3 rounded-lg text-white transition-all"
                  aria-label="Cancel and continue session"
                >
                  Continue Session
                </button>
                <button
                  onClick={confirmEndSession}
                  className="flex-1 bg-red-500 hover:bg-red-600 px-4 py-3 rounded-lg text-white transition-all"
                  aria-label="Confirm end session"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini Game Modal (gated - shown after survey) */}
      {showMiniGame && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
          <FocusMiniGame
            onComplete={xp => {
              setShowMiniGame(false);
              setSessionEnded(true);
              onSessionComplete(xp);
              handleStartNewSession();
            }}
            onSkip={() => {
              setShowMiniGame(false);
              setSessionEnded(true);
              handleStartNewSession();
            }}
          />
        </div>
      )}

      {/* Post-Session Survey */}
      {showPostSurvey && pendingSurveyData && (
        <PostSessionSurvey
          onComplete={handleSurveyComplete}
          onSkip={handleSurveySkip}
          sessionType={pendingSurveyData.sessionType}
          focusScore={pendingSurveyData.focusScore}
        />
      )}

      {/* Momo Post-Session Reflection */}
      {showMomoReflection && currentUser && pendingSurveyData && (
        <MomoPostSession
          userId={currentUser.uid}
          sessionData={pendingSurveyData}
          surveyData={completedSurveyResult}
          onDone={() => {
            setShowMomoReflection(false);
            setTimeout(() => setShowMiniGame(true), 300);
          }}
        />
      )}

      {/* Settings Info */}
      {userSettings && (
        <div className="mt-6 pt-6 border-t border-gray-700 text-center text-xs text-gray-400">
          Default:{' '}
          {sessionTypes.find(s => s.id === userSettings.preferences?.defaultSessionType)?.name || 'Medium'} • Sound:{' '}
          {userSettings.preferences?.soundEnabled ? 'On' : 'Off'} • Auto-breaks:{' '}
          {userSettings.preferences?.autoStartBreaks ? 'On' : 'Off'}
        </div>
      )}

      {/* Background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-1 h-1 bg-blue-400/20 rounded-full absolute animate-float"
            style={{
              top: `${20 + i * 15}%`,
              left: `${10 + i * 20}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${4 + i * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

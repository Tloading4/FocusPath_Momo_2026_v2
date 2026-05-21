import React, { useEffect, useState, useRef } from 'react';
import { AnimatedXPGain } from './AnimatedXPGain';
import { XPParticleEffect } from './XPParticleEffect';
import { LevelUpOverlay } from './LevelUpOverlay';
import { XPEventService, XPGainEvent, LevelUpEvent } from '../../services/XPEventService';
import { NotificationService } from '../../services/NotificationDataService';
import { soundService, SoundType } from '../../services/soundService';

interface ActiveAnimation {
  id: string;
  event: XPGainEvent;
}

interface Preferences {
  enable_xp_animations: boolean;
  enable_levelup_overlays: boolean;
  enable_notification_sounds: boolean;
  show_small_xp_gains: boolean;
}

export const XPAnimationContainer: React.FC = () => {
  const [activeAnimations, setActiveAnimations] = useState<ActiveAnimation[]>([]);
  const [activeParticles, setActiveParticles] = useState<ActiveAnimation[]>([]);
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);

  const preferencesRef = useRef<Preferences>({
    enable_xp_animations: true,
    enable_levelup_overlays: true,
    enable_notification_sounds: true,
    show_small_xp_gains: true
  });

  useEffect(() => {
    const initializeAndSubscribe = async () => {
      const prefs = await NotificationService.getPreferences();
      if (prefs) {
        preferencesRef.current = {
          enable_xp_animations: prefs.enable_xp_animations,
          enable_levelup_overlays: prefs.enable_levelup_overlays,
          enable_notification_sounds: prefs.enable_notification_sounds,
          show_small_xp_gains: prefs.show_small_xp_gains
        };
      }

      const unsubscribeXP = XPEventService.subscribeToXPEvents('animation-container', (event) => {
        if (!preferencesRef.current.enable_xp_animations) return;
        if (event.amount < 5 && !preferencesRef.current.show_small_xp_gains) return;

        const id = `${Date.now()}-${Math.random()}`;

        setActiveAnimations(prev => [...prev, { id, event }]);
        setActiveParticles(prev => [...prev, { id: `${id}-particles`, event }]);

        if (preferencesRef.current.enable_notification_sounds) {
          soundService.playSound('gentle-chime' as SoundType);
        }

        NotificationService.addNotification(
          'xp_gain',
          `+${event.amount} XP Earned`,
          `From ${event.source}`,
          event.amount,
          '⚡',
          event.metadata
        );
      });

      const unsubscribeLevelUp = XPEventService.subscribeToLevelUpEvents('animation-container', (event) => {
        if (!preferencesRef.current.enable_levelup_overlays) return;

        setLevelUpEvent(event);

        if (preferencesRef.current.enable_notification_sounds) {
          soundService.playSound('success-fanfare' as SoundType);
        }

        NotificationService.addNotification(
          'level_up',
          `Level ${event.newLevel} Reached!`,
          `You are now ${event.newTitle}`,
          0,
          '🏆',
          { oldLevel: event.oldLevel, newLevel: event.newLevel }
        );
      });

      return () => {
        unsubscribeXP();
        unsubscribeLevelUp();
      };
    };

    const cleanupPromise = initializeAndSubscribe();

    return () => {
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
    };
  }, []);

  const handleAnimationComplete = (id: string) => {
    setActiveAnimations(prev => prev.filter(a => a.id !== id));
  };

  const handleParticleComplete = (id: string) => {
    setActiveParticles(prev => prev.filter(a => a.id !== id));
  };

  const handleLevelUpDismiss = () => {
    setLevelUpEvent(null);
    XPEventService.clearPendingLevelUpEvent();
  };

  return (
    <>
      {activeAnimations.map(({ id, event }) => (
        <AnimatedXPGain
          key={id}
          amount={event.amount}
          position={event.position || { x: window.innerWidth / 2, y: window.innerHeight / 2 }}
          onComplete={() => handleAnimationComplete(id)}
        />
      ))}

      {activeParticles.map(({ id, event }) => (
        <XPParticleEffect
          key={id}
          amount={event.amount}
          position={event.position || { x: window.innerWidth / 2, y: window.innerHeight / 2 }}
          onComplete={() => handleParticleComplete(id)}
        />
      ))}

      {levelUpEvent && (
        <LevelUpOverlay
          event={levelUpEvent}
          onDismiss={handleLevelUpDismiss}
        />
      )}
    </>
  );
};

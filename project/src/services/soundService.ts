export type SoundType =
  | 'classic-beep'
  | 'gentle-chime'
  | 'digital-bell'
  | 'success-fanfare'
  | 'meditation-bowl'
  | 'nature-chirp'
  | 'soft-gong';

export interface SoundSettings {
  soundType: SoundType;
  volume: number;
  enabled: boolean;
}

export class SoundService {
  private static instance: SoundService;
  private audioContext: AudioContext | null = null;

  private constructor() {}

  static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private playTone(
    frequency: number,
    duration: number,
    delay: number = 0,
    volume: number = 0.3,
    type: OscillatorType = 'sine'
  ): void {
    setTimeout(() => {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    }, delay);
  }

  private playClassicBeep(volume: number): void {
    this.playTone(800, 0.2, 0, volume, 'sine');
    this.playTone(800, 0.2, 300, volume, 'sine');
    this.playTone(800, 0.2, 600, volume, 'sine');
  }

  private playGentleChime(volume: number): void {
    this.playTone(523.25, 0.4, 0, volume * 0.8, 'sine');
    this.playTone(659.25, 0.4, 200, volume * 0.8, 'sine');
    this.playTone(783.99, 0.6, 400, volume * 0.8, 'sine');
  }

  private playDigitalBell(volume: number): void {
    this.playTone(1046.50, 0.15, 0, volume, 'square');
    this.playTone(1318.51, 0.15, 150, volume * 0.9, 'square');
    this.playTone(1567.98, 0.3, 300, volume * 0.8, 'square');
  }

  private playSuccessFanfare(volume: number): void {
    this.playTone(523.25, 0.2, 0, volume, 'triangle');
    this.playTone(659.25, 0.2, 150, volume, 'triangle');
    this.playTone(783.99, 0.2, 300, volume, 'triangle');
    this.playTone(1046.50, 0.4, 450, volume, 'triangle');
  }

  private playMeditationBowl(volume: number): void {
    this.playTone(196, 1.2, 0, volume * 0.7, 'sine');
    this.playTone(220, 1.2, 50, volume * 0.6, 'sine');
    this.playTone(246.94, 1.2, 100, volume * 0.5, 'sine');
  }

  private playNatureChirp(volume: number): void {
    this.playTone(2093, 0.08, 0, volume * 0.6, 'sine');
    this.playTone(2349.32, 0.08, 100, volume * 0.7, 'sine');
    this.playTone(2793.83, 0.12, 200, volume * 0.6, 'sine');
    this.playTone(2349.32, 0.08, 400, volume * 0.5, 'sine');
  }

  private playSoftGong(volume: number): void {
    this.playTone(110, 0.8, 0, volume * 0.8, 'sine');
    this.playTone(165, 0.8, 50, volume * 0.6, 'sine');
    this.playTone(220, 1.0, 100, volume * 0.5, 'sine');
  }

  playSound(soundType: SoundType, volume: number = 0.3): void {
    try {
      const adjustedVolume = Math.max(0, Math.min(1, volume));

      switch (soundType) {
        case 'classic-beep':
          this.playClassicBeep(adjustedVolume);
          break;
        case 'gentle-chime':
          this.playGentleChime(adjustedVolume);
          break;
        case 'digital-bell':
          this.playDigitalBell(adjustedVolume);
          break;
        case 'success-fanfare':
          this.playSuccessFanfare(adjustedVolume);
          break;
        case 'meditation-bowl':
          this.playMeditationBowl(adjustedVolume);
          break;
        case 'nature-chirp':
          this.playNatureChirp(adjustedVolume);
          break;
        case 'soft-gong':
          this.playSoftGong(adjustedVolume);
          break;
        default:
          this.playClassicBeep(adjustedVolume);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  playCompletionSound(settings: SoundSettings): void {
    if (!settings.enabled) return;
    this.playSound(settings.soundType, settings.volume);
  }

  private repeatInterval: number | null = null;

  startRepeatingSound(soundType: SoundType, volume: number, intervalSeconds: number): void {
    this.stopRepeatingSound();

    this.playSound(soundType, volume);

    this.repeatInterval = window.setInterval(() => {
      this.playSound(soundType, volume);
    }, intervalSeconds * 1000);
  }

  stopRepeatingSound(): void {
    if (this.repeatInterval !== null) {
      clearInterval(this.repeatInterval);
      this.repeatInterval = null;
    }
  }
}

export const soundService = SoundService.getInstance();

export const SOUND_OPTIONS: { value: SoundType; label: string; description: string; emoji: string }[] = [
  {
    value: 'classic-beep',
    label: 'Classic Beep',
    description: 'Traditional triple beep sound',
    emoji: '🔔'
  },
  {
    value: 'gentle-chime',
    label: 'Gentle Chime',
    description: 'Soft ascending musical chime',
    emoji: '🎵'
  },
  {
    value: 'digital-bell',
    label: 'Digital Bell',
    description: 'Modern digital notification',
    emoji: '🔊'
  },
  {
    value: 'success-fanfare',
    label: 'Success Fanfare',
    description: 'Celebratory victory sound',
    emoji: '🎉'
  },
  {
    value: 'meditation-bowl',
    label: 'Meditation Bowl',
    description: 'Calming singing bowl tone',
    emoji: '🧘'
  },
  {
    value: 'nature-chirp',
    label: 'Nature Chirp',
    description: 'Pleasant bird-like chirp',
    emoji: '🐦'
  },
  {
    value: 'soft-gong',
    label: 'Soft Gong',
    description: 'Deep resonant gong',
    emoji: '🪘'
  }
];

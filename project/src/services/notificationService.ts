export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  requireInteraction?: boolean;
  tag?: string;
  actions?: { action: string; title: string }[];
}

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private repeatInterval: number | null = null;

  private constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  hasPermission(): boolean {
    return this.permission === 'granted';
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  async showNotification(options: NotificationOptions): Promise<Notification | null> {
    if (!this.hasPermission()) {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon128.png',
        badge: '/icons/icon48.png',
        requireInteraction: options.requireInteraction ?? false,
        tag: options.tag || 'focus-timer',
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  async showTimerCompleteNotification(sessionName: string, xp: number): Promise<Notification | null> {
    return this.showNotification({
      title: '🎉 Focus Session Complete!',
      body: `${sessionName} completed! You earned ${xp} XP. Click to continue.`,
      icon: '/icons/icon128.png',
      requireInteraction: true,
      tag: 'timer-complete',
    });
  }

  startRepeatingAlert(
    options: NotificationOptions,
    intervalSeconds: number,
    onDismiss?: () => void
  ): void {
    this.stopRepeatingAlert();

    const showAlert = async () => {
      const notification = await this.showNotification(options);
      if (notification && onDismiss) {
        notification.onclick = () => {
          onDismiss();
          this.stopRepeatingAlert();
          notification.close();
        };
      }
    };

    showAlert();

    this.repeatInterval = window.setInterval(() => {
      showAlert();
    }, intervalSeconds * 1000);
  }

  stopRepeatingAlert(): void {
    if (this.repeatInterval !== null) {
      clearInterval(this.repeatInterval);
      this.repeatInterval = null;
    }
  }

  async sendToExtension(message: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        await chrome.runtime.sendMessage(message);
      } catch (error) {
        console.log('Extension not available:', error);
      }
    }
  }
}

export const notificationService = NotificationService.getInstance();

export class TabAlertService {
  private originalTitle: string = '';
  private originalFavicon: string = '';
  private flashInterval: number | null = null;
  private isFlashing: boolean = false;

  constructor() {
    this.originalTitle = document.title;
    this.originalFavicon = this.getFaviconUrl();
  }

  private getFaviconUrl(): string {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    return link?.href || '';
  }

  startTitleFlash(message: string, alternateMessage: string = ''): void {
    if (this.isFlashing) return;

    this.isFlashing = true;
    this.originalTitle = document.title;
    let showPrimary = true;

    this.flashInterval = window.setInterval(() => {
      document.title = showPrimary ? message : (alternateMessage || this.originalTitle);
      showPrimary = !showPrimary;
    }, 1000);
  }

  stopTitleFlash(): void {
    if (this.flashInterval !== null) {
      clearInterval(this.flashInterval);
      this.flashInterval = null;
    }
    this.isFlashing = false;
    document.title = this.originalTitle;
  }

  updateFavicon(iconUrl: string): void {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (link) {
      link.href = iconUrl;
    }
  }

  restoreFavicon(): void {
    if (this.originalFavicon) {
      this.updateFavicon(this.originalFavicon);
    }
  }

  startAlertMode(titleMessage: string = '⏰ TIMER COMPLETE!'): void {
    this.startTitleFlash(titleMessage, '🎯 Focus Path™');
  }

  stopAlertMode(): void {
    this.stopTitleFlash();
    this.restoreFavicon();
  }
}

export const tabAlertService = new TabAlertService();

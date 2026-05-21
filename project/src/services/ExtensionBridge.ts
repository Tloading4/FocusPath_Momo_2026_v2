// Bridge service for communication between Chrome extension and web app
export class ExtensionBridge {
  private static instance: ExtensionBridge;
  private isExtensionAvailable = false;

  private constructor() {
    this.checkExtensionAvailability();
  }

  static getInstance(): ExtensionBridge {
    if (!ExtensionBridge.instance) {
      ExtensionBridge.instance = new ExtensionBridge();
    }
    return ExtensionBridge.instance;
  }

  private checkExtensionAvailability() {
    // Check if we're running in a Chrome extension context
    this.isExtensionAvailable = !!(window as any).chrome?.runtime?.id;
  }

  // Send data to extension
  async sendToExtension(type: string, data: any): Promise<any> {
    if (!this.isExtensionAvailable) {
      console.log('Extension not available, storing data locally');
      return this.storeDataLocally(type, data);
    }

    try {
      return await (window as any).chrome.runtime.sendMessage({
        type,
        data,
        source: 'webapp'
      });
    } catch (error) {
      console.error('Failed to send message to extension:', error);
      return this.storeDataLocally(type, data);
    }
  }

  // Listen for messages from extension
  onExtensionMessage(callback: (message: any) => void): (() => void) {
    if (!this.isExtensionAvailable) return;

    const listener = (message: any, _sender: any, sendResponse: any) => {
      if (message.source === 'extension') {
        callback(message);
        sendResponse({ success: true });
      }
    };

    (window as any).chrome.runtime.onMessage.addListener(listener);
    
    // Return cleanup function
    return () => {
      (window as any).chrome.runtime.onMessage.removeListener(listener);
    };
  }

  // Sync session data
  async syncSessionData(sessionData: any) {
    return this.sendToExtension('SYNC_SESSION_DATA', sessionData);
  }

  // Sync user profile
  async syncUserProfile(profileData: any) {
    return this.sendToExtension('SYNC_USER_PROFILE', profileData);
  }

  // Get extension status
  async getExtensionStatus() {
    return this.sendToExtension('GET_EXTENSION_STATUS', {});
  }

  // Fallback for when extension is not available
  private storeDataLocally(type: string, data: any) {
    const key = `focusPath_${type}`;
    localStorage.setItem(key, JSON.stringify({
      ...data,
      timestamp: Date.now(),
      source: 'webapp'
    }));
    return { success: true, stored: 'locally' };
  }

  // Get locally stored data
  getLocalData(type: string) {
    const key = `focusPath_${type}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }
}
// Background service worker for Focus Path™ Chrome Extension
class FocusPathBackground {
  constructor() {
    this.currentSession = null;
    this.sessionStartTime = null;
    this.distractionCount = 0;
    this.tabSwitchCount = 0;
    this.lastActiveTab = null;
    this.focusScore = 100;
    this.webAppConnections = new Set();
    this.init();
  }

  init() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener(() => {
      this.setupDefaultSettings();
      this.createContextMenus();
    });

    // Listen for tab changes (distraction detection)
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabSwitch(activeInfo);
    });

    // Listen for window focus changes
    chrome.windows.onFocusChanged.addListener((windowId) => {
      this.handleWindowFocusChange(windowId);
    });

    // Listen for idle state changes
    chrome.idle.onStateChanged.addListener((state) => {
      this.handleIdleStateChange(state);
    });

    // Listen for messages from popup/content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Listen for connections from web app
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'webapp-sync') {
        this.webAppConnections.add(port);
        port.onDisconnect.addListener(() => {
          this.webAppConnections.delete(port);
        });
        
        // Send current state to newly connected web app
        port.postMessage({
          type: 'INITIAL_STATE',
          data: {
            currentSession: this.currentSession,
            sessionStartTime: this.sessionStartTime,
            distractionCount: this.distractionCount,
            focusScore: this.focusScore
          }
        });
      }
    });
    // Set up periodic session updates
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });
  }

  async setupDefaultSettings() {
    const defaultSettings = {
      userProfile: {
        displayName: 'Focus Warrior',
        totalXP: 0,
        currentStreak: 0,
        longestStreak: 0,
        level: 1,
        isAnonymous: false
      },
      settings: {
        notifications: {
          sessionReminders: true,
          streakAlerts: true,
          achievementNotifications: true
        },
        preferences: {
          defaultSessionType: 'medium',
          autoStartBreaks: false,
          soundEnabled: true,
          aiMode: 'standard'
        },
        privacy: {
          showInLeaderboard: true,
          shareStats: true,
          dataCollection: true
        }
      },
      sessions: [],
      streaks: {
        currentStreak: 0,
        longestStreak: 0,
        lastSessionDate: null
      },
      marketplace: {
        purchases: [],
        availableXP: 0
      }
    };

    // Only set defaults if not already set
    const existingData = await chrome.storage.local.get(Object.keys(defaultSettings));
    const updates = {};
    
    Object.keys(defaultSettings).forEach(key => {
      if (!existingData[key]) {
        updates[key] = defaultSettings[key];
      }
    });

    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
    }
  }

  createContextMenus() {
    chrome.contextMenus.create({
      id: 'start-focus-session',
      title: 'Start Focus Session',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'log-distraction',
      title: 'Log Distraction',
      contexts: ['page']
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'start-focus-session') {
        this.openDashboard();
      } else if (info.menuItemId === 'log-distraction') {
        this.logDistraction('manual', 'Context menu distraction');
      }
    });
  }

  async handleTabSwitch(activeInfo) {
    if (this.currentSession && this.lastActiveTab !== activeInfo.tabId) {
      this.tabSwitchCount++;
      this.distractionCount++;
      this.updateFocusScore();
      
      // Log the distraction
      await this.logDistraction('tab_switch', 'Switched to different tab');
      
      // Send notification to content script if needed
      try {
        await chrome.tabs.sendMessage(activeInfo.tabId, {
          type: 'DISTRACTION_DETECTED',
          data: {
            type: 'tab_switch',
            count: this.tabSwitchCount
          }
        });
      } catch (error) {
        // Tab might not have content script loaded
      }
    }
    
    this.lastActiveTab = activeInfo.tabId;
  }

  handleWindowFocusChange(windowId) {
    if (this.currentSession && windowId === chrome.windows.WINDOW_ID_NONE) {
      // Window lost focus
      this.distractionCount++;
      this.updateFocusScore();
      this.logDistraction('window_blur', 'Window lost focus');
    }
  }

  handleIdleStateChange(state) {
    if (this.currentSession) {
      if (state === 'idle') {
        this.logDistraction('inactivity', 'User went idle');
      } else if (state === 'active') {
        // User became active again after being idle
        // End session as incomplete due to idle break
        this.endSessionWithReason('idle_break');
      }
    }
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'START_SESSION':
        await this.startSession(message.data);
        this.broadcastToWebApp('SESSION_STARTED', this.currentSession);
        sendResponse({ success: true });
        break;

      case 'END_SESSION':
        await this.endSessionWithReason('manual');
        this.broadcastToWebApp('SESSION_ENDED', null);
        sendResponse({ success: true });
        break;

      case 'LOG_DISTRACTION':
        await this.logDistraction(message.data.type, message.data.context);
        this.broadcastToWebApp('DISTRACTION_LOGGED', {
          count: this.distractionCount,
          focusScore: this.focusScore
        });
        sendResponse({ success: true });
        break;

      case 'GET_SESSION_STATUS':
        sendResponse({
          isActive: !!this.currentSession,
          session: this.currentSession,
          distractionCount: this.distractionCount,
          focusScore: this.focusScore
        });
        break;

      case 'GET_USER_DATA':
        const userData = await this.getUserData();
        sendResponse(userData);
        break;

      case 'UPDATE_USER_DATA':
        await this.updateUserData(message.data);
        this.broadcastToWebApp('USER_DATA_UPDATED', message.data);
        sendResponse({ success: true });
        break;

      case 'OPEN_DASHBOARD':
        await this.openDashboard();
        sendResponse({ success: true });
        break;

      case 'SYNC_SESSION_DATA':
        // Handle session data sync from web app
        if (message.source === 'webapp') {
          await this.syncSessionFromWebApp(message.data);
          sendResponse({ success: true });
        }
        break;

      case 'SYNC_USER_PROFILE':
        // Handle user profile sync from web app
        if (message.source === 'webapp') {
          await this.syncUserProfileFromWebApp(message.data);
          sendResponse({ success: true });
        }
        break;

      case 'TIMER_COMPLETE':
        // Handle timer completion notification from web app
        await this.handleTimerComplete(message.data);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  // Broadcast updates to connected web apps
  broadcastToWebApp(type, data) {
    const message = { type, data, source: 'extension' };
    this.webAppConnections.forEach(port => {
      try {
        port.postMessage(message);
      } catch (error) {
        // Remove disconnected ports
        this.webAppConnections.delete(port);
      }
    });
  }

  // Sync session data from web app
  async syncSessionFromWebApp(sessionData) {
    this.currentSession = sessionData.currentSession;
    this.sessionStartTime = sessionData.sessionStartTime;
    this.distractionCount = sessionData.distractionCount || 0;
    this.focusScore = sessionData.focusScore || 100;
    
    // Update extension badge and notifications
    if (this.currentSession) {
      chrome.action.setBadgeText({ text: '🎯' });
      chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }

  // Sync user profile from web app
  async syncUserProfileFromWebApp(profileData) {
    // Update local storage with latest profile data
    await chrome.storage.local.set({
      userProfile: profileData
    });
  }

  handleAlarm(alarm) {
    if (alarm.name === 'session-timer' && this.currentSession) {
      this.endSessionWithReason('timer_end');
    } else if (alarm.name === 'session-reminder') {
      this.sendSessionReminder();
    }
  }

  async startSession(sessionData) {
    this.currentSession = {
      id: `session_${Date.now()}`,
      ...sessionData,
      startTime: Date.now(),
      distractions: [],
      tabSwitches: 0
    };
    
    this.sessionStartTime = Date.now();
    this.distractionCount = 0;
    this.tabSwitchCount = 0;
    this.focusScore = 100;

    // Set alarm for session end
    chrome.alarms.create('session-timer', {
      delayInMinutes: sessionData.duration
    });

    // Update badge
    chrome.action.setBadgeText({ text: '🎯' });
    chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });

    // Send notification
    this.sendNotification(
      'Focus Session Started!',
      `${sessionData.sessionType} session for ${sessionData.duration} minutes`
    );

    // Save session start
    await this.saveSessionData();
    
    // Broadcast to web app
    this.broadcastToWebApp('SESSION_STARTED', this.currentSession);
  }

  async endSessionWithReason(endReason = 'manual') {
    if (!this.currentSession) return;

    const sessionDuration = Date.now() - this.sessionStartTime;
    
    // Determine completion status based on end reason
    let completed = false;
    if (endReason === 'timer_end') {
      // Natural timer completion - always completed
      completed = true;
    } else if (endReason === 'idle_break') {
      // Session ended due to idle break - always incomplete
      completed = false;
    } else {
      // Manual end or other reasons - check duration threshold
      completed = sessionDuration >= (this.currentSession.duration * 60 * 1000 * 0.8); // 80% completion
    }

    // Calculate XP
    let xpEarned = 0;
    
    if (completed) {
      xpEarned = this.currentSession.xp || 100;
      
      // Bonus for low distractions
      if (this.distractionCount === 0) {
        xpEarned += Math.floor(xpEarned * 0.2); // 20% bonus
      } else if (this.distractionCount <= 2) {
        xpEarned += Math.floor(xpEarned * 0.1); // 10% bonus
      }
    } else {
      // No XP for incomplete sessions
      xpEarned = 0;
    }

    // Save completed session
    const sessionRecord = {
      ...this.currentSession,
      endTime: Date.now(),
      endReason,
      completed,
      actualDuration: Math.floor(sessionDuration / 1000 / 60),
      xpEarned,
      finalFocusScore: this.focusScore,
      distractionCount: this.distractionCount,
      tabSwitchCount: this.tabSwitchCount,
      distractions: this.currentSession.distractions
    };

    await this.saveCompletedSession(sessionRecord);

    // Update user profile
    if (completed) {
      await this.updateUserProfile(xpEarned);
    }

    // Clear session
    this.currentSession = null;
    this.sessionStartTime = null;
    
    // Clear alarms
    chrome.alarms.clear('session-timer');
    
    // Update badge
    chrome.action.setBadgeText({ text: '' });

    // Send completion notification
    if (completed) {
      this.sendNotification(
        'Session Complete! 🎉',
        `You earned ${xpEarned} XP! Focus score: ${this.focusScore}%`
      );
    } else {
      const endMessages = {
        'idle_break': 'Session ended due to inactivity. Stay focused next time!',
        'manual': 'Session ended early. Try again when you\'re ready!',
        'tab_switch': 'Session ended due to excessive distractions.',
        'default': 'Session ended early. Try again when you\'re ready!'
      };
      
      this.sendNotification(
        'Session Incomplete',
        endMessages[endReason] || endMessages['default']
      );
    }
    
    // Broadcast to web app
    this.broadcastToWebApp('SESSION_ENDED', {
      sessionRecord,
      xpEarned: completed ? xpEarned : 0,
      completed,
      endReason
    });
  }

  // Legacy method for backward compatibility
  async endSession() {
    return this.endSessionWithReason('manual');
  }

  async logDistraction(type, context) {
    if (!this.currentSession) return;

    const distraction = {
      id: Date.now().toString(),
      type,
      context,
      timestamp: Date.now(),
      sessionTime: Date.now() - this.sessionStartTime
    };

    this.currentSession.distractions.push(distraction);
    this.updateFocusScore();

    // Save updated session
    await this.saveSessionData();
  }

  updateFocusScore() {
    // Calculate focus score based on distractions
    const sessionDuration = Date.now() - this.sessionStartTime;
    const minutesElapsed = sessionDuration / (1000 * 60);
    const distractionsPerMinute = this.distractionCount / Math.max(minutesElapsed, 1);
    
    this.focusScore = Math.max(0, Math.min(100, 100 - (distractionsPerMinute * 20)));
  }

  async saveSessionData() {
    if (this.currentSession) {
      await chrome.storage.local.set({
        currentSession: this.currentSession
      });
    }
  }

  async saveCompletedSession(sessionRecord) {
    const { sessions = [] } = await chrome.storage.local.get(['sessions']);
    sessions.unshift(sessionRecord); // Add to beginning
    
    // Keep only last 100 sessions
    if (sessions.length > 100) {
      sessions.splice(100);
    }

    await chrome.storage.local.set({ sessions });
  }

  async updateUserProfile(xpEarned) {
    const { userProfile } = await chrome.storage.local.get(['userProfile']);
    
    const updatedProfile = {
      ...userProfile,
      totalXP: (userProfile.totalXP || 0) + xpEarned,
      level: Math.floor(((userProfile.totalXP || 0) + xpEarned) / 500) + 1,
      lastSessionDate: Date.now()
    };

    // Update streak
    const today = new Date().toDateString();
    const lastSessionDate = userProfile.lastSessionDate ? new Date(userProfile.lastSessionDate).toDateString() : null;
    
    if (lastSessionDate === today) {
      // Same day, keep current streak
    } else if (lastSessionDate === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()) {
      // Yesterday, increment streak
      updatedProfile.currentStreak = (userProfile.currentStreak || 0) + 1;
      updatedProfile.longestStreak = Math.max(updatedProfile.currentStreak, userProfile.longestStreak || 0);
    } else {
      // Streak broken
      updatedProfile.currentStreak = 1;
    }

    await chrome.storage.local.set({ userProfile: updatedProfile });
  }

  async getUserData() {
    return await chrome.storage.local.get([
      'userProfile',
      'settings',
      'sessions',
      'streaks',
      'marketplace'
    ]);
  }

  async updateUserData(data) {
    await chrome.storage.local.set(data);
  }

  async openDashboard() {
    const url = chrome.runtime.getURL('dashboard.html');
    
    // Check if dashboard is already open
    const tabs = await chrome.tabs.query({ url });
    
    if (tabs.length > 0) {
      // Focus existing tab
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // Create new tab
      await chrome.tabs.create({ url });
    }
  }

  sendNotification(title, message) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title,
      message
    });
  }

  sendSessionReminder() {
    this.sendNotification(
      'Focus Time! 🎯',
      'Ready for another productive focus session?'
    );
  }

  async handleTimerComplete(data) {
    // Send a prominent notification for timer completion
    const notificationOptions = {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '🎉 Focus Session Complete!',
      message: `${data.sessionName} completed! You earned ${data.xp} XP. Click to continue.`,
      priority: 2,
      requireInteraction: true,
      buttons: [
        { title: 'View Results' },
        { title: 'Start New Session' }
      ]
    };

    chrome.notifications.create('timer-complete', notificationOptions, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Error creating notification:', chrome.runtime.lastError);
      }
    });

    // Update badge to show completion
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#10B981' });

    // Clear badge after 10 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 10000);
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'timer-complete') {
    chrome.tabs.query({ url: '*://focuspathai.netlify.app/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: 'https://focuspathai.netlify.app' });
      }
    });
    chrome.notifications.clear(notificationId);
  }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'timer-complete') {
    chrome.tabs.query({ url: '*://focuspathai.netlify.app/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: 'https://focuspathai.netlify.app' });
      }
    });
    chrome.notifications.clear(notificationId);
  }
});

// Initialize the background service
new FocusPathBackground();
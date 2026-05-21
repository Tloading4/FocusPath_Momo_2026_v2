// Popup script for Focus Path™ Chrome Extension
class FocusPathPopup {
  constructor() {
    this.currentSession = null;
    this.selectedSessionType = 'medium';
    this.sessionTypes = {
      easy: { name: 'Easy Focus', duration: 15, xp: 50 },
      medium: { name: 'Medium Focus', duration: 30, xp: 100 },
      hard: { name: 'Hard Focus', duration: 45, xp: 150 },
      extreme: { name: 'Extreme Focus', duration: 60, xp: 200 }
    };
    this.webAppPort = null;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadUserData();
    await this.checkSessionStatus();
    this.updateUI();
    this.connectToWebApp();
  }

  // Connect to web app for real-time sync
  connectToWebApp() {
    try {
      this.webAppPort = chrome.runtime.connect({ name: 'popup-sync' });
      
      this.webAppPort.onMessage.addListener((message) => {
        this.handleWebAppMessage(message);
      });
      
      this.webAppPort.onDisconnect.addListener(() => {
        this.webAppPort = null;
      });
    } catch (error) {
      console.log('Web app connection not available');
    }
  }

  // Handle messages from web app
  handleWebAppMessage(message) {
    switch (message.type) {
      case 'SESSION_STARTED':
        this.currentSession = message.data;
        this.startSessionTimer();
        this.updateUI();
        break;
      case 'SESSION_ENDED':
        this.currentSession = null;
        this.stopSessionTimer();
        this.updateUI();
        break;
      case 'USER_DATA_UPDATED':
        this.loadUserData();
        break;
    }
  }
  setupEventListeners() {
    // Start session button
    document.getElementById('startSessionBtn').addEventListener('click', () => {
      this.showSessionTypes();
    });

    // End session button
    document.getElementById('endSessionBtn').addEventListener('click', () => {
      this.endSession();
    });

    // Open dashboard button
    document.getElementById('openDashboardBtn').addEventListener('click', () => {
      this.openDashboard();
    });

    // Log distraction button
    document.getElementById('logDistractionBtn').addEventListener('click', () => {
      this.logDistraction();
    });

    // Session type selection
    document.querySelectorAll('.session-type').forEach(element => {
      element.addEventListener('click', () => {
        this.selectSessionType(element.dataset.type);
      });
    });

    // Footer links
    document.getElementById('settingsLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openDashboar('settings');
    });

    document.getElementById('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openHelp();
    });

    document.getElementById('aboutLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openAbout();
    });
  }

  async loadUserData() {
    try {
      const userData = await chrome.runtime.sendMessage({
        type: 'GET_USER_DATA'
      });

      if (userData.userProfile) {
        document.getElementById('totalXP').textContent = userData.userProfile.totalXP || 0;
        document.getElementById('currentLevel').textContent = Math.floor((userData.userProfile.totalXP || 0) / 500) + 1;
        document.getElementById('currentStreak').textContent = userData.userProfile.currentStreak || 0;
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }

  async checkSessionStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SESSION_STATUS'
      });

      if (response.isActive && response.session) {
        this.currentSession = response.session;
        this.startSessionTimer();
      }
    } catch (error) {
      console.error('Failed to check session status:', error);
    }
  }

  updateUI() {
    const sessionStatus = document.getElementById('sessionStatus');
    const sessionTimer = document.getElementById('sessionTimer');
    const sessionInfo = document.getElementById('sessionInfo');
    const startSessionBtn = document.getElementById('startSessionBtn');
    const endSessionBtn = document.getElementById('endSessionBtn');
    const sessionTypes = document.getElementById('sessionTypes');
    const logDistractionBtn = document.getElementById('logDistractionBtn');

    if (this.currentSession) {
      // Active session UI
      sessionStatus.classList.add('session-active');
      startSessionBtn.classList.add('hidden');
      endSessionBtn.classList.remove('hidden');
      sessionTypes.classList.add('hidden');
      logDistractionBtn.classList.remove('hidden');

      // Update session info
      const sessionType = this.currentSession.sessionType;
      const taskName = this.currentSession.customTask || 'Focus Session';
      sessionInfo.textContent = `${sessionType} • ${taskName}`;
    } else {
      // No active session UI
      sessionStatus.classList.remove('session-active');
      startSessionBtn.classList.remove('hidden');
      endSessionBtn.classList.add('hidden');
      logDistractionBtn.classList.add('hidden');

      // Reset timer display
      sessionTimer.textContent = '--:--';
      sessionInfo.textContent = 'No active session';
    }
  }

  showSessionTypes() {
    document.getElementById('sessionTypes').classList.remove('hidden');
    document.getElementById('startSessionBtn').textContent = 'Start Selected Session';
    document.getElementById('startSessionBtn').removeEventListener('click', () => this.showSessionTypes());
    document.getElementById('startSessionBtn').addEventListener('click', () => this.startSession());

    // Mark default selection
    this.selectSessionType(this.selectedSessionType);
  }

  selectSessionType(type) {
    this.selectedSessionType = type;
    
    // Update UI
    document.querySelectorAll('.session-type').forEach(element => {
      if (element.dataset.type === type) {
        element.classList.add('selected');
      } else {
        element.classList.remove('selected');
      }
    });
  }

  async startSession() {
    try {
      const sessionType = this.sessionTypes[this.selectedSessionType];
      
      // For simplicity, we'll use a basic session without the full task selection
      // In a complete implementation, you'd show a modal for task selection
      const sessionData = {
        sessionType: sessionType.name,
        duration: sessionType.duration,
        xp: sessionType.xp,
        customTask: 'Focus Session',
        category: 'general',
        startTime: Date.now()
      };

      await chrome.runtime.sendMessage({
        type: 'START_SESSION',
        data: sessionData
      });

      this.currentSession = {
        ...sessionData,
        startTime: Date.now()
      };

      this.startSessionTimer();
      this.updateUI();
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }

  async endSession() {
    try {
      await chrome.runtime.sendMessage({
        type: 'END_SESSION'
      });

      this.currentSession = null;
      this.stopSessionTimer();
      this.updateUI();
      
      // Reset session type selection
      document.getElementById('sessionTypes').classList.add('hidden');
      document.getElementById('startSessionBtn').textContent = 'Start Session';
      document.getElementById('startSessionBtn').removeEventListener('click', () => this.startSession());
      document.getElementById('startSessionBtn').addEventListener('click', () => this.showSessionTypes());
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  startSessionTimer() {
    if (!this.currentSession) return;

    const sessionTimer = document.getElementById('sessionTimer');
    const endTime = this.currentSession.startTime + (this.currentSession.duration * 60 * 1000);
    
    // Update timer immediately
    this.updateTimer(endTime);

    // Set interval to update timer
    this.timerInterval = setInterval(() => {
      this.updateTimer(endTime);
    }, 1000);
  }

  updateTimer(endTime) {
    const now = Date.now();
    const timeLeft = Math.max(0, endTime - now);
    
    if (timeLeft <= 0) {
      this.stopSessionTimer();
      document.getElementById('sessionTimer').textContent = '00:00';
      return;
    }

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    document.getElementById('sessionTimer').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  stopSessionTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  async logDistraction() {
    if (!this.currentSession) return;

    try {
      await chrome.runtime.sendMessage({
        type: 'LOG_DISTRACTION',
        data: {
          type: 'manual',
          context: 'User-reported distraction'
        }
      });

      // Show confirmation
      const logDistractionBtn = document.getElementById('logDistractionBtn');
      const originalText = logDistractionBtn.innerHTML;
      
      logDistractionBtn.innerHTML = `
        <span class="icon">✓</span>
        Logged!
      `;
      
      setTimeout(() => {
        logDistractionBtn.innerHTML = originalText;
      }, 2000);
    } catch (error) {
      console.error('Failed to log distraction:', error);
    }
  }

  async openDashboard(tab = 'dashboard') {
    try {
      // First try to focus existing dashboard tab
      const tabs = await chrome.tabs.query({
        url: [
          'https://focuspathai.netlify.app/*',
          'http://localhost:*/*',
          'chrome-extension://*/dashboard.html'
        ]
      });
      
      if (tabs.length > 0) {
        // Focus existing tab and send navigation message
        await chrome.tabs.update(tabs[0].id, { active: true });
        await chrome.windows.update(tabs[0].windowId, { focused: true });
        
        // Send message to navigate to specific tab
        try {
          await chrome.tabs.sendMessage(tabs[0].id, {
            type: 'NAVIGATE_TO_TAB',
            tab: tab
          });
        } catch (error) {
          // Tab might not have content script, that's okay
        }
      } else {
        // Open new dashboard tab
        await chrome.tabs.create({
          url: 'https://focuspathai.netlify.app'
        });
      }
      
      // Close popup
      window.close();
    } catch (error) {
      console.error('Failed to open dashboard:', error);
    }
  }

  openHelp() {
    chrome.tabs.create({
      url: 'https://github.com/yourusername/focus-path-extension/wiki/Help'
    });
  }

  openAbout() {
    chrome.tabs.create({
      url: 'https://github.com/yourusername/focus-path-extension'
    });
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new FocusPathPopup();
});
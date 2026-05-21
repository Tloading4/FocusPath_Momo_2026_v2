// Dashboard script for Focus Path™ Chrome Extension
class FocusPathDashboard {
  constructor() {
    this.userData = null;
    this.currentSession = null;
    this.sessionInterval = null;
    this.selectedSessionType = 'medium';
    this.sessionTypes = {
      easy: { name: 'Easy Focus', duration: 15, xp: 50, color: 'text-green-400', bgColor: 'from-green-500 to-emerald-600' },
      medium: { name: 'Medium Focus', duration: 30, xp: 100, color: 'text-yellow-400', bgColor: 'from-yellow-500 to-orange-600' },
      hard: { name: 'Hard Focus', duration: 45, xp: 150, color: 'text-orange-400', bgColor: 'from-orange-500 to-red-600' },
      extreme: { name: 'Extreme Focus', duration: 60, xp: 200, color: 'text-red-400', bgColor: 'from-red-500 to-pink-600' }
    };
    this.settings = {
      profile: {
        displayName: 'Focus Warrior',
        isAnonymous: false
      },
      notifications: {
        sessionReminders: true,
        streakAlerts: true,
        achievementNotifications: true
      },
      preferences: {
        defaultSessionType: 'medium',
        autoStartBreaks: false,
        soundEnabled: true
      },
      privacy: {
        showInLeaderboard: true,
        shareStats: true,
        dataCollection: true
      }
    };
    this.init();
  }

  async init() {
    this.setupTabNavigation();
    this.setupSettingsTabs();
    this.setupTimerControls();
    this.setupSettingsControls();
    await this.loadUserData();
    await this.checkCurrentSession();
    this.updateDashboard();
    this.updateSettingsUI();
    this.updateHistoryTab();
    this.updateProgressTab();
  }

  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });
  }

  setupSettingsTabs() {
    const settingsTabButtons = document.querySelectorAll('.settings-tab-btn');
    
    settingsTabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-settings-tab');
        this.switchSettingsTab(tabId);
      });
    });
  }

  setupTimerControls() {
    // Session type selection
    document.querySelectorAll('.session-selector').forEach(button => {
      button.addEventListener('click', () => {
        const sessionType = button.getAttribute('data-session-type');
        this.selectSessionType(sessionType);
      });
    });

    // Timer controls
    document.getElementById('startTimerBtn').addEventListener('click', () => {
      this.startSession();
    });

    document.getElementById('pauseTimerBtn').addEventListener('click', () => {
      this.pauseSession();
    });

    document.getElementById('resetTimerBtn').addEventListener('click', () => {
      this.resetSession();
    });

    document.getElementById('logDistractionButton').addEventListener('click', () => {
      this.logDistraction();
    });
  }

  setupSettingsControls() {
    // Profile settings
    const displayNameInput = document.getElementById('displayNameInput');
    displayNameInput.addEventListener('input', () => {
      document.getElementById('nameLength').textContent = displayNameInput.value.length;
      this.settings.profile.displayName = displayNameInput.value;
    });

    // Anonymous mode toggle
    document.getElementById('anonymousModeToggle').addEventListener('click', () => {
      this.settings.profile.isAnonymous = !this.settings.profile.isAnonymous;
      this.updateAnonymousToggle();
    });

    // Notification toggles
    document.getElementById('sessionRemindersToggle').addEventListener('click', () => {
      this.settings.notifications.sessionReminders = !this.settings.notifications.sessionReminders;
      this.updateToggleButton('sessionRemindersToggle', this.settings.notifications.sessionReminders);
    });

    document.getElementById('streakAlertsToggle').addEventListener('click', () => {
      this.settings.notifications.streakAlerts = !this.settings.notifications.streakAlerts;
      this.updateToggleButton('streakAlertsToggle', this.settings.notifications.streakAlerts);
    });

    document.getElementById('achievementNotificationsToggle').addEventListener('click', () => {
      this.settings.notifications.achievementNotifications = !this.settings.notifications.achievementNotifications;
      this.updateToggleButton('achievementNotificationsToggle', this.settings.notifications.achievementNotifications);
    });

    // Preferences toggles
    document.getElementById('defaultSessionTypeSelect').addEventListener('change', (e) => {
      this.settings.preferences.defaultSessionType = e.target.value;
    });

    document.getElementById('autoStartBreaksToggle').addEventListener('click', () => {
      this.settings.preferences.autoStartBreaks = !this.settings.preferences.autoStartBreaks;
      this.updateToggleButton('autoStartBreaksToggle', this.settings.preferences.autoStartBreaks);
    });

    document.getElementById('soundEnabledToggle').addEventListener('click', () => {
      this.settings.preferences.soundEnabled = !this.settings.preferences.soundEnabled;
      this.updateToggleButton('soundEnabledToggle', this.settings.preferences.soundEnabled);
    });

    // Privacy toggles
    document.getElementById('showInLeaderboardToggle').addEventListener('click', () => {
      this.settings.privacy.showInLeaderboard = !this.settings.privacy.showInLeaderboard;
      this.updateToggleButton('showInLeaderboardToggle', this.settings.privacy.showInLeaderboard);
    });

    document.getElementById('shareStatsToggle').addEventListener('click', () => {
      this.settings.privacy.shareStats = !this.settings.privacy.shareStats;
      this.updateToggleButton('shareStatsToggle', this.settings.privacy.shareStats);
    });

    document.getElementById('dataCollectionToggle').addEventListener('click', () => {
      this.settings.privacy.dataCollection = !this.settings.privacy.dataCollection;
      this.updateToggleButton('dataCollectionToggle', this.settings.privacy.dataCollection);
    });

    // Data management
    document.getElementById('exportDataBtn').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('resetDataBtn').addEventListener('click', () => {
      this.resetData();
    });

    // Save settings
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      this.saveSettings();
    });

    // Daily tip refresh
    document.getElementById('newTipBtn').addEventListener('click', () => {
      this.updateDailyTip();
    });

    // History refresh
    document.getElementById('refreshHistoryBtn').addEventListener('click', () => {
      this.updateHistoryTab();
    });
  }

  switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
      if (button.getAttribute('data-tab') === tabId) {
        button.classList.add('border-blue-400', 'text-blue-300');
        button.classList.remove('border-transparent', 'text-gray-300', 'hover:text-white', 'hover:border-gray-300');
      } else {
        button.classList.remove('border-blue-400', 'text-blue-300');
        button.classList.add('border-transparent', 'text-gray-300', 'hover:text-white', 'hover:border-gray-300');
      }
    });

    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
      if (pane.id === `${tabId}-tab`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Special handling for specific tabs
    if (tabId === 'history') {
      this.updateHistoryTab();
    } else if (tabId === 'progress') {
      this.updateProgressTab();
    }
  }

  switchSettingsTab(tabId) {
    // Update settings tab buttons
    document.querySelectorAll('.settings-tab-btn').forEach(button => {
      if (button.getAttribute('data-settings-tab') === tabId) {
        button.classList.add('bg-blue-500/30', 'text-blue-300');
        button.classList.remove('text-gray-300', 'hover:text-white', 'hover:bg-white/10');
      } else {
        button.classList.remove('bg-blue-500/30', 'text-blue-300');
        button.classList.add('text-gray-300', 'hover:text-white', 'hover:bg-white/10');
      }
    });

    // Update settings content
    document.querySelectorAll('.settings-content').forEach(content => {
      if (content.id === `${tabId}-settings`) {
        content.classList.add('active');
        content.classList.remove('hidden');
      } else {
        content.classList.remove('active');
        content.classList.add('hidden');
      }
    });
  }

  async loadUserData() {
    try {
      this.userData = await chrome.runtime.sendMessage({
        type: 'GET_USER_DATA'
      });

      // Set settings from user data
      if (this.userData.settings) {
        this.settings = this.userData.settings;
      }

      // Set user profile
      if (this.userData.userProfile) {
        document.getElementById('displayName').textContent = this.userData.userProfile.displayName || 'User';
        document.getElementById('userInitial').textContent = (this.userData.userProfile.displayName || 'U')[0].toUpperCase();
        
        const level = Math.floor((this.userData.userProfile.totalXP || 0) / 500) + 1;
        document.getElementById('userLevel').textContent = `Level ${level}`;
        
        // Update welcome message
        document.getElementById('welcomeHeading').textContent = `Welcome, ${this.userData.userProfile.displayName || 'Focus Warrior'}!`;
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }

  async checkCurrentSession() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SESSION_STATUS'
      });

      if (response.isActive && response.session) {
        this.currentSession = response.session;
        this.startSessionTimer();
        this.updateTimerUI();
      }
    } catch (error) {
      console.error('Failed to check session status:', error);
    }
  }

  updateDashboard() {
    this.updateUserStats();
    this.updateDailyTip();
    this.updateStreakTracker();
  }

  updateUserStats() {
    if (!this.userData || !this.userData.userProfile) return;

    const totalXP = this.userData.userProfile.totalXP || 0;
    const level = Math.floor(totalXP / 500) + 1;
    const xpInLevel = totalXP % 500;
    const xpToNextLevel = 500 - xpInLevel;
    const progressPercentage = (xpInLevel / 500) * 100;

    // Update XP display
    document.getElementById('totalXpDisplay').textContent = `${totalXP} Total XP`;
    document.getElementById('xpProgress').textContent = `${xpInLevel} / 500`;
    document.getElementById('xpProgressBar').style.width = `${progressPercentage}%`;
    document.getElementById('xpToNextLevel').textContent = `${xpToNextLevel} XP to next level`;

    // Update level display
    document.getElementById('userLevelHeading').textContent = `Level ${level}`;
    
    // Update level title
    let levelTitle = 'Focus Novice';
    if (level >= 20) {
      levelTitle = 'Focus Master';
      document.getElementById('levelIconContainer').className = 'inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-600 mb-4 hover-bounce transition-all duration-300 animate-scale-in';
    } else if (level >= 10) {
      levelTitle = 'Focus Expert';
      document.getElementById('levelIconContainer').className = 'inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 mb-4 hover-bounce transition-all duration-300 animate-scale-in';
    } else if (level >= 5) {
      levelTitle = 'Focus Practitioner';
      document.getElementById('levelIconContainer').className = 'inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 mb-4 hover-bounce transition-all duration-300 animate-scale-in';
    }
    document.getElementById('userLevelTitle').textContent = levelTitle;
  }

  updateDailyTip() {
    const tips = [
      {
        category: 'Productivity',
        title: 'The 2-Minute Rule',
        content: 'If a task takes less than 2 minutes, do it immediately instead of adding it to your to-do list.'
      },
      {
        category: 'Focus',
        title: 'Pomodoro Power',
        content: 'Take a 5-minute break after each 25-minute focus session to maintain peak mental performance.'
      },
      {
        category: 'Environment',
        title: 'Environment Matters',
        content: 'Create a dedicated workspace that signals to your brain it\'s time to focus and be productive.'
      },
      {
        category: 'Focus',
        title: 'Single-Tasking',
        content: 'Focus on one task at a time. Multitasking reduces productivity by up to 40%.'
      },
      {
        category: 'Energy',
        title: 'Energy Management',
        content: 'Schedule your most important tasks during your natural energy peaks, usually in the morning.'
      },
      {
        category: 'Digital',
        title: 'Digital Detox',
        content: 'Turn off notifications during focus sessions to eliminate distractions and improve concentration.'
      },
      {
        category: 'Mindset',
        title: 'Progress Over Perfection',
        content: 'Focus on making consistent progress rather than achieving perfection. Small steps lead to big results.'
      },
      {
        category: 'Organization',
        title: 'Batch Similar Tasks',
        content: 'Group similar activities together to reduce context switching and increase efficiency.'
      }
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    document.querySelector('#tipContent .text-sm').textContent = randomTip.category;
    document.querySelector('#tipContent h3').textContent = randomTip.title;
    document.querySelector('#tipContent p').textContent = randomTip.content;
  }

  updateStreakTracker() {
    if (!this.userData || !this.userData.userProfile) return;

    const currentStreak = this.userData.userProfile.currentStreak || 0;
    const longestStreak = this.userData.userProfile.longestStreak || 0;
    
    document.getElementById('currentStreakValue').textContent = currentStreak;
    document.getElementById('bestStreakValue').textContent = longestStreak;
    document.getElementById('streakDaysText').textContent = `${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`;
    
    // Update progress bar
    const progressPercentage = Math.min((currentStreak / 30) * 100, 100);
    document.getElementById('streakProgressBar').style.width = `${progressPercentage}%`;
    
    // Update streak color based on length
    let streakColor = 'from-blue-500 to-green-600';
    if (currentStreak >= 30) {
      streakColor = 'from-red-500 to-pink-600';
    } else if (currentStreak >= 14) {
      streakColor = 'from-orange-500 to-red-600';
    } else if (currentStreak >= 7) {
      streakColor = 'from-yellow-500 to-orange-600';
    } else if (currentStreak >= 3) {
      streakColor = 'from-green-500 to-yellow-600';
    }
    
    document.getElementById('streakProgressBar').className = `h-2 rounded-full bg-gradient-to-r ${streakColor} progress-animated transition-all duration-1000`;
  }

  updateHistoryTab() {
    if (!this.userData || !this.userData.sessions) return;

    const sessions = this.userData.sessions || [];
    const sessionHistoryBody = document.getElementById('sessionHistoryBody');
    
    // Calculate stats
    const totalSessions = sessions.length;
    const totalTime = sessions.reduce((sum, session) => sum + (session.actualDuration || session.duration || 0), 0);
    const totalXP = sessions.reduce((sum, session) => sum + (session.xpEarned || 0), 0);
    const focusScores = sessions.map(session => session.finalFocusScore || 0);
    const avgFocusScore = focusScores.length > 0 
      ? Math.round(focusScores.reduce((sum, score) => sum + score, 0) / focusScores.length) 
      : 0;
    
    // Update stats
    document.getElementById('totalSessions').textContent = totalSessions;
    document.getElementById('totalTime').textContent = `${totalTime}m`;
    document.getElementById('historyTotalXP').textContent = totalXP;
    document.getElementById('avgFocusScore').textContent = `${avgFocusScore}%`;
    
    // Clear existing rows
    sessionHistoryBody.innerHTML = '';
    
    if (sessions.length === 0) {
      sessionHistoryBody.innerHTML = `
        <tr class="border-b border-white/10 hover:bg-white/5 transition-colors">
          <td colspan="5" class="py-4 px-4 text-center text-gray-400">No sessions yet</td>
        </tr>
      `;
      return;
    }
    
    // Add session rows
    sessions.forEach(session => {
      const date = new Date(session.startTime || session.date);
      const formattedDate = date.toLocaleDateString();
      const sessionType = session.sessionType;
      const duration = session.actualDuration || session.duration || 0;
      const xpEarned = session.xpEarned || 0;
      const distractions = session.distractionCount || 0;
      
      const row = document.createElement('tr');
      row.className = 'border-b border-white/10 hover:bg-white/5 transition-colors';
      
      row.innerHTML = `
        <td class="py-4 px-4 text-white">${formattedDate}</td>
        <td class="py-4 px-4">
          <span class="px-2 py-1 rounded-full text-xs font-semibold bg-white/10 text-yellow-400">
            ${sessionType}
          </span>
        </td>
        <td class="py-4 px-4 text-white">${duration} min</td>
        <td class="py-4 px-4">
          <span class="text-green-400 font-semibold">+${xpEarned} XP</span>
        </td>
        <td class="py-4 px-4">
          <span class="font-semibold ${distractions === 0 ? 'text-green-400' : distractions <= 2 ? 'text-yellow-400' : 'text-orange-400'}">
            ${distractions}
          </span>
        </td>
      `;
      
      sessionHistoryBody.appendChild(row);
    });
  }

  updateProgressTab() {
    if (!this.userData || !this.userData.userProfile) return;

    const totalXP = this.userData.userProfile.totalXP || 0;
    const level = Math.floor(totalXP / 500) + 1;
    const xpInLevel = totalXP % 500;
    const xpToNextLevel = 500 - xpInLevel;
    const progressPercentage = (xpInLevel / 500) * 100;

    // Update progress display
    document.getElementById('progressLevelHeading').textContent = `Level ${level}`;
    document.getElementById('progressXpCounter').textContent = `${xpInLevel} / 500`;
    document.getElementById('progressXpBar').style.width = `${progressPercentage}%`;
    document.getElementById('progressXpToNext').textContent = `${xpToNextLevel} XP to next level`;
    document.getElementById('progressTotalXp').textContent = totalXP;
    document.getElementById('progressCurrentLevel').textContent = level;

    // Update level title and color
    let levelTitle = 'Focus Novice';
    let levelColor = 'from-green-500 to-emerald-600';
    
    if (level >= 20) {
      levelTitle = 'Focus Master';
      levelColor = 'from-yellow-500 to-orange-600';
    } else if (level >= 10) {
      levelTitle = 'Focus Expert';
      levelColor = 'from-purple-500 to-pink-600';
    } else if (level >= 5) {
      levelTitle = 'Focus Practitioner';
      levelColor = 'from-blue-500 to-indigo-600';
    }
    
    document.getElementById('progressLevelTitle').textContent = levelTitle;
    document.getElementById('progressLevelIcon').className = `inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r ${levelColor} mb-4 hover-bounce transition-all duration-300 animate-scale-in`;

    // Update milestone progress
    const milestones = [
      { level: 5, title: 'Focus Practitioner' },
      { level: 10, title: 'Focus Expert' },
      { level: 20, title: 'Focus Master' }
    ];

    milestones.forEach((milestone, index) => {
      const element = document.querySelectorAll('.card-stagger-4, .card-stagger-5, .card-stagger-6')[index];
      
      if (level >= milestone.level) {
        element.classList.remove('bg-white/5', 'text-gray-400');
        element.classList.add('bg-green-500/20', 'text-green-300', 'animate-glow-pulse');
      } else {
        element.classList.add('bg-white/5', 'text-gray-400');
        element.classList.remove('bg-green-500/20', 'text-green-300', 'animate-glow-pulse');
      }
    });
  }

  updateSettingsUI() {
    // Profile settings
    document.getElementById('displayNameInput').value = this.settings.profile.displayName || '';
    document.getElementById('nameLength').textContent = (this.settings.profile.displayName || '').length;
    this.updateAnonymousToggle();

    // Notification settings
    this.updateToggleButton('sessionRemindersToggle', this.settings.notifications.sessionReminders);
    this.updateToggleButton('streakAlertsToggle', this.settings.notifications.streakAlerts);
    this.updateToggleButton('achievementNotificationsToggle', this.settings.notifications.achievementNotifications);

    // Preferences settings
    document.getElementById('defaultSessionTypeSelect').value = this.settings.preferences.defaultSessionType;
    this.updateToggleButton('autoStartBreaksToggle', this.settings.preferences.autoStartBreaks);
    this.updateToggleButton('soundEnabledToggle', this.settings.preferences.soundEnabled);

    // Privacy settings
    this.updateToggleButton('showInLeaderboardToggle', this.settings.privacy.showInLeaderboard);
    this.updateToggleButton('shareStatsToggle', this.settings.privacy.shareStats);
    this.updateToggleButton('dataCollectionToggle', this.settings.privacy.dataCollection);
  }

  updateAnonymousToggle() {
    const button = document.getElementById('anonymousModeToggle');
    const icon = document.getElementById('anonymousIcon');
    const text = document.getElementById('anonymousText');
    
    if (this.settings.profile.isAnonymous) {
      button.className = 'flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm bg-gray-500/20 text-gray-300';
      icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
      text.textContent = 'Anonymous';
    } else {
      button.className = 'flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm bg-blue-500/20 text-blue-300';
      icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
      text.textContent = 'Public';
    }
  }

  updateToggleButton(id, isEnabled) {
    const button = document.getElementById(id);
    
    if (isEnabled) {
      button.className = 'w-12 h-6 rounded-full transition-all relative bg-blue-500';
      button.querySelector('div').className = 'w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 translate-x-6';
    } else {
      button.className = 'w-12 h-6 rounded-full transition-all relative bg-gray-600';
      button.querySelector('div').className = 'w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 translate-x-0.5';
    }
  }

  selectSessionType(type) {
    this.selectedSessionType = type;
    
    // Update UI
    document.querySelectorAll('.session-selector').forEach(button => {
      const buttonType = button.getAttribute('data-session-type');
      
      if (buttonType === type) {
        button.className = `session-selector p-4 rounded-xl border-2 transition-all duration-300 hover-lift animate-scale-in border-white/50 bg-gradient-to-r ${this.sessionTypes[type].bgColor} text-white animate-glow-pulse`;
      } else {
        button.className = 'session-selector p-4 rounded-xl border-2 transition-all duration-300 hover-lift animate-scale-in border-white/20 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10 hover:scale-105 btn-press';
      }
    });

    // Update timer display
    const sessionType = this.sessionTypes[type];
    document.getElementById('timerDisplay').textContent = `${sessionType.duration}:00`;
    document.getElementById('sessionTypeDisplay').textContent = sessionType.name;
    document.getElementById('sessionTypeDisplay').className = `text-lg font-semibold ${sessionType.color} animate-fade-in`;
  }

  async startSession() {
    try {
      const sessionType = this.sessionTypes[this.selectedSessionType];
      const taskInput = document.getElementById('taskInput');
      
      const sessionData = {
        sessionType: sessionType.name,
        duration: sessionType.duration,
        xp: sessionType.xp,
        customTask: taskInput.value.trim() || 'Focus Session',
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
      this.updateTimerUI();
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }

  async pauseSession() {
    // In this implementation, we'll just end the session
    // A more complex implementation could support pausing
    await this.endSession();
  }

  async resetSession() {
    if (this.currentSession) {
      await this.endSession();
    }
    
    this.selectSessionType(this.selectedSessionType);
    document.getElementById('taskInput').value = '';
  }

  async endSession() {
    try {
      await chrome.runtime.sendMessage({
        type: 'END_SESSION'
      });

      this.currentSession = null;
      this.stopSessionTimer();
      this.updateTimerUI();
      
      // Reload user data to update stats
      await this.loadUserData();
      this.updateDashboard();
      this.updateHistoryTab();
      this.updateProgressTab();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  startSessionTimer() {
    if (!this.currentSession) return;

    // Update timer immediately
    this.updateTimer();

    // Set interval to update timer
    this.sessionInterval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  updateTimer() {
    if (!this.currentSession) return;

    const now = Date.now();
    const endTime = this.currentSession.startTime + (this.currentSession.duration * 60 * 1000);
    const timeLeft = Math.max(0, endTime - now);
    
    if (timeLeft <= 0) {
      this.stopSessionTimer();
      document.getElementById('timerDisplay').textContent = '00:00';
      
      // Session completed
      this.endSession();
      return;
    }

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    document.getElementById('timerDisplay').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update progress circle
    const progress = ((this.currentSession.duration * 60 * 1000) - timeLeft) / (this.currentSession.duration * 60 * 1000);
    const circumference = 2 * Math.PI * 45;
    const offset = circumference * (1 - progress);
    document.getElementById('timerProgress').style.strokeDashoffset = offset;
  }

  stopSessionTimer() {
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval);
      this.sessionInterval = null;
    }
  }

  updateTimerUI() {
    const startTimerBtn = document.getElementById('startTimerBtn');
    const pauseTimerBtn = document.getElementById('pauseTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimerBtn');
    const logDistractionButton = document.getElementById('logDistractionButton');
    const taskInputContainer = document.getElementById('taskInputContainer');

    if (this.currentSession) {
      // Active session UI
      startTimerBtn.classList.add('hidden');
      pauseTimerBtn.classList.remove('hidden');
      logDistractionButton.classList.remove('hidden');
      taskInputContainer.classList.add('hidden');
      
      // Update session type display
      document.getElementById('sessionTypeDisplay').textContent = this.currentSession.sessionType;
    } else {
      // No active session UI
      startTimerBtn.classList.remove('hidden');
      pauseTimerBtn.classList.add('hidden');
      logDistractionButton.classList.add('hidden');
      taskInputContainer.classList.remove('hidden');
      
      // Reset timer display
      document.getElementById('timerProgress').style.strokeDashoffset = 2 * Math.PI * 45; // Reset progress circle
      this.selectSessionType(this.selectedSessionType);
    }
  }

  async logDistraction() {
    if (!this.currentSession) return;

    try {
      await chrome.runtime.sendMessage({
        type: 'LOG_DISTRACTION',
        data: {
          type: 'manual',
          context: 'User-reported distraction from dashboard'
        }
      });

      // Show confirmation
      const button = document.getElementById('logDistractionButton');
      const originalText = button.innerHTML;
      
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Logged!
      `;
      
      setTimeout(() => {
        button.innerHTML = originalText;
      }, 2000);
    } catch (error) {
      console.error('Failed to log distraction:', error);
    }
  }

  async saveSettings() {
    try {
      // Update user profile
      if (this.userData.userProfile) {
        this.userData.userProfile.displayName = this.settings.profile.displayName;
        this.userData.userProfile.isAnonymous = this.settings.profile.isAnonymous;
      }

      // Save settings
      await chrome.runtime.sendMessage({
        type: 'UPDATE_USER_DATA',
        data: {
          userProfile: this.userData.userProfile,
          settings: this.settings
        }
      });

      // Show success message
      alert('Settings saved successfully!');
      
      // Update UI
      document.getElementById('displayName').textContent = this.settings.profile.displayName;
      document.getElementById('userInitial').textContent = this.settings.profile.displayName[0].toUpperCase();
      document.getElementById('welcomeHeading').textContent = `Welcome, ${this.settings.profile.displayName}!`;
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  }

  async exportData() {
    try {
      const data = await chrome.runtime.sendMessage({
        type: 'GET_USER_DATA'
      });

      const exportData = {
        ...data,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `focus-path-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Data exported successfully!');
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    }
  }

  async resetData() {
    const confirmed = confirm(
      '⚠️ WARNING: This will permanently delete all your data including:\n\n' +
      '• All focus sessions and progress\n' +
      '• XP and achievements\n' +
      '• Streaks and statistics\n' +
      '• Profile and settings\n\n' +
      'This action CANNOT be undone. Are you sure?'
    );

    if (!confirmed) return;

    try {
      await chrome.storage.local.clear();
      
      // Reload the extension
      chrome.runtime.reload();
      
      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset data:', error);
      alert('Failed to reset data. Please try again.');
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new FocusPathDashboard();
});
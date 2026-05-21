// Content script for Focus Path™ Chrome Extension
class FocusPathContent {
  constructor() {
    this.isSessionActive = false;
    this.distractionOverlay = null;
    this.focusIndicator = null;
    this.lastActivity = Date.now();
    this.webAppPort = null;
    this.init();
  }

  init() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });

    // Monitor user activity
    this.setupActivityMonitoring();
    
    // Check if session is active on page load
    this.checkSessionStatus();
    
    // Connect to web app if available
    this.connectToWebApp();
  }

  connectToWebApp() {
    // Check if we're on the Focus Path™ web app
    if (window.location.hostname.includes('focuspathai.netlify.app') || 
        window.location.hostname.includes('localhost')) {
      try {
        this.webAppPort = chrome.runtime.connect({ name: 'webapp-content' });
        
        this.webAppPort.onMessage.addListener((message) => {
          // Forward messages between extension and web app
          window.postMessage({
            type: 'FOCUS_PATH_EXTENSION_MESSAGE',
            ...message
          }, '*');
        });
        
        // Listen for messages from web app
        window.addEventListener('message', (event) => {
          if (event.data.type === 'FOCUS_PATH_WEBAPP_MESSAGE' && this.webAppPort) {
            this.webAppPort.postMessage(event.data);
          }
        });
      } catch (error) {
        console.log('Could not connect to extension from web app');
      }
    }
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'SESSION_STARTED':
        this.isSessionActive = true;
        this.showFocusIndicator();
        break;

      case 'SESSION_ENDED':
        this.isSessionActive = false;
        this.hideFocusIndicator();
        break;

      case 'DISTRACTION_DETECTED':
        this.showDistractionAlert(message.data);
        break;

      case 'SHOW_FOCUS_REMINDER':
        this.showFocusReminder();
        break;
    }
  }

  async checkSessionStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SESSION_STATUS'
      });
      
      if (response.isActive) {
        this.isSessionActive = true;
        this.showFocusIndicator();
      }
    } catch (error) {
      // Extension context might be invalidated
    }
  }

  setupActivityMonitoring() {
    // Monitor mouse movement
    document.addEventListener('mousemove', () => {
      this.lastActivity = Date.now();
    }, { passive: true });

    // Monitor keyboard activity
    document.addEventListener('keypress', () => {
      this.lastActivity = Date.now();
    }, { passive: true });

    // Monitor scrolling
    document.addEventListener('scroll', () => {
      if (this.isSessionActive) {
        this.detectExcessiveScrolling();
      }
    }, { passive: true });

    // Monitor for inactivity
    setInterval(() => {
      this.checkInactivity();
    }, 30000); // Check every 30 seconds
  }

  detectExcessiveScrolling() {
    // Simple excessive scrolling detection
    if (!this.scrollEvents) this.scrollEvents = [];
    
    this.scrollEvents.push(Date.now());
    
    // Keep only last 10 seconds of events
    this.scrollEvents = this.scrollEvents.filter(time => 
      Date.now() - time < 10000
    );

    // If more than 10 scroll events in 10 seconds, it might be excessive
    if (this.scrollEvents.length > 10) {
      this.logDistraction('excessive_scrolling', 'Rapid scrolling detected');
    }
  }

  checkInactivity() {
    if (this.isSessionActive) {
      const inactiveTime = Date.now() - this.lastActivity;
      
      if (inactiveTime > 60000) { // 1 minute of inactivity
        this.logDistraction('inactivity', `${Math.floor(inactiveTime / 1000)} seconds of inactivity`);
      }
    }
  }

  async logDistraction(type, context) {
    try {
      await chrome.runtime.sendMessage({
        type: 'LOG_DISTRACTION',
        data: { type, context }
      });
    } catch (error) {
      console.error('Failed to log distraction:', error);
    }
  }

  showFocusIndicator() {
    if (this.focusIndicator) return;

    this.focusIndicator = document.createElement('div');
    this.focusIndicator.id = 'focus-path-indicator';
    this.focusIndicator.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 16px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
        cursor: pointer;
        transition: all 0.3s ease;
        animation: slideIn 0.5s ease-out;
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        🎯 Focus Session Active - <span id="session-timer">--:--</span>
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;

    // Click to open dashboard
    this.focusIndicator.addEventListener('click', () => {
      // Open web app dashboard
      window.open('https://focuspathai.netlify.app', '_blank');
    });

    document.body.appendChild(this.focusIndicator);
    
    // Start timer display
    this.updateSessionTimer();
  }

  updateSessionTimer() {
    if (!this.focusIndicator) return;
    
    chrome.runtime.sendMessage({ type: 'GET_SESSION_STATUS' }, (response) => {
      if (response && response.isActive && response.session) {
        const elapsed = Date.now() - response.session.startTime;
        const remaining = (response.session.duration * 60 * 1000) - elapsed;
        
        if (remaining > 0) {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          const timerElement = this.focusIndicator.querySelector('#session-timer');
          if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }
          
          // Update every second
          setTimeout(() => this.updateSessionTimer(), 1000);
        }
      }
    });
  }

  hideFocusIndicator() {
    if (this.focusIndicator) {
      this.focusIndicator.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (this.focusIndicator && this.focusIndicator.parentNode) {
          this.focusIndicator.parentNode.removeChild(this.focusIndicator);
        }
        this.focusIndicator = null;
      }, 300);
    }
  }

  showDistractionAlert(data) {
    // Create temporary distraction alert
    const alert = document.createElement('div');
    alert.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10001;
        background: rgba(239, 68, 68, 0.95);
        color: white;
        padding: 20px 30px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 16px;
        font-weight: 600;
        text-align: center;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
        animation: alertPulse 0.5s ease-out;
      ">
        ⚠️ Distraction Detected<br>
        <span style="font-size: 14px; font-weight: 400; opacity: 0.9;">
          ${data.type.replace('_', ' ')} - Stay focused!
        </span>
      </div>
      <style>
        @keyframes alertPulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      </style>
    `;

    document.body.appendChild(alert);

    // Remove after 3 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.style.animation = 'fadeOut 0.3s ease-in forwards';
        setTimeout(() => {
          if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
          }
        }, 300);
      }
    }, 3000);
  }

  showFocusReminder() {
    const reminder = document.createElement('div');
    reminder.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
        animation: slideUp 0.5s ease-out;
        cursor: pointer;
      ">
        💪 Stay focused! You're doing great!
      </div>
      <style>
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>
    `;

    reminder.addEventListener('click', () => {
      if (reminder.parentNode) {
        reminder.parentNode.removeChild(reminder);
      }
    });

    document.body.appendChild(reminder);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (reminder.parentNode) {
        reminder.parentNode.removeChild(reminder);
      }
    }, 5000);
  }
}

// Initialize content script
new FocusPathContent();
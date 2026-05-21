// Bridge script for web app integration with Chrome extension
(function() {
  'use strict';
  
  let extensionPort = null;
  let isConnected = false;

  // Connect to extension
  function connectToExtension() {
    try {
      if (chrome && chrome.runtime && chrome.runtime.connect) {
        extensionPort = chrome.runtime.connect({ name: 'webapp-sync' });
        
        extensionPort.onMessage.addListener((message) => {
          // Forward extension messages to web app
          window.postMessage({
            type: 'FOCUS_PATH_EXTENSION_MESSAGE',
            ...message
          }, '*');
        });
        
        extensionPort.onDisconnect.addListener(() => {
          extensionPort = null;
          isConnected = false;
          console.log('Extension disconnected from web app');
        });
        
        isConnected = true;
        console.log('Web app connected to Focus Path™ extension');
        
        // Notify web app that extension is available
        window.postMessage({
          type: 'FOCUS_PATH_EXTENSION_CONNECTED'
        }, '*');
      }
    } catch (error) {
      console.log('Focus Path™ extension not available');
    }
  }

  // Listen for messages from web app
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    if (event.data.type === 'FOCUS_PATH_WEBAPP_MESSAGE' && extensionPort) {
      try {
        extensionPort.postMessage({
          ...event.data,
          source: 'webapp'
        });
      } catch (error) {
        console.error('Failed to send message to extension:', error);
      }
    }
  });

  // Initialize connection when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connectToExtension);
  } else {
    connectToExtension();
  }

  // Expose connection status to web app
  window.focusPathExtension = {
    isConnected: () => isConnected,
    sendMessage: (message) => {
      if (extensionPort) {
        extensionPort.postMessage({
          ...message,
          source: 'webapp'
        });
      }
    }
  };
})();
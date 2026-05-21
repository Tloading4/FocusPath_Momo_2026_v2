import { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { generateStudyBuddyResponse } from '../../services/claudeAIService';

interface StudyBuddyMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  context?: {
    focusScore?: number;
    sessionProgress?: number;
    distractionCount?: number;
    category?: string;
  };
}

interface AIStudyBuddyProps {
  isSessionActive: boolean;
  sessionData: {
    category: string;
    customTask: string;
    goal?: any;
    timeRemaining: number;
    sessionDuration: number;
  };
  biometricData: {
    focusScore: number;
    mouseMovements: number;
    keystrokes: number;
    scrollEvents: number;
    tabSwitches: number;
    inactivityPeriods: number;
  };
  distractionEvents: any[];
}

export function AIStudyBuddy({ 
  isSessionActive, 
  sessionData, 
  biometricData, 
  distractionEvents
}: AIStudyBuddyProps) {
  const [messages, setMessages] = useState<StudyBuddyMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const generateAIResponse = async (userMessage: string, context: any): Promise<string> => {
    setIsTyping(true);
    try {
      const response = await generateStudyBuddyResponse(userMessage, {
        category: context.category,
        customTask: sessionData.customTask,
        focusScore: context.focusScore,
        sessionProgress: context.sessionProgress,
        timeRemaining: context.timeRemaining,
        distractionCount: distractionEvents.length,
        keystrokes: biometricData.keystrokes,
      });
      return response;
    } catch {
      const { focusScore, sessionProgress, timeRemaining } = context;
      return `You're ${Math.round(sessionProgress)}% through your session with a ${focusScore}% focus score. ${Math.floor(timeRemaining / 60)} minutes remaining — keep pushing!`;
    } finally {
      setIsTyping(false);
    }
  };

  // Proactive AI interventions
  useEffect(() => {
    if (!isSessionActive) return;

    const checkForInterventions = () => {
      const now = Date.now();
      const timeSinceLastInteraction = now - lastInteraction;
      const sessionProgress = ((sessionData.sessionDuration * 60 - sessionData.timeRemaining) / (sessionData.sessionDuration * 60)) * 100;

      // Proactive check-ins
      if (timeSinceLastInteraction > 300000 && sessionProgress > 25) { // 5 minutes of no interaction, 25% into session
        const checkInMessages = [
          `👋 Quick check-in! How's your ${sessionData.category} session going? Need any tips?`,
          `🤖 I've been monitoring your focus patterns. Want a quick progress update?`,
          `💪 You're doing great! ${Math.round(sessionProgress)}% complete. Need any motivation?`
        ];
        
        addSystemMessage(checkInMessages[Math.floor(Math.random() * checkInMessages.length)]);
        setLastInteraction(now);
      }

      // Focus score interventions
      if (biometricData.focusScore < 60 && distractionEvents.length > 3) {
        addSystemMessage(`🚨 Focus Alert: I notice your concentration dipping (${biometricData.focusScore}% focus score). Try the "20-20-20" rule: look at something 20 feet away for 20 seconds every 20 minutes!`);
        setLastInteraction(now);
      }

      // Positive reinforcement
      if (biometricData.focusScore > 85 && sessionProgress > 50) {
        addSystemMessage(`🌟 Wow! ${biometricData.focusScore}% focus score - you're in the zone! This is what peak performance looks like.`);
        setLastInteraction(now);
      }
    };

    const interval = setInterval(checkForInterventions, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isSessionActive, biometricData.focusScore, distractionEvents.length, sessionData, lastInteraction]);

  // Session start welcome message
  useEffect(() => {
    if (isSessionActive && messages.length === 0) {
      const welcomeMessage = `🤖 Hi! I'm your AI Study Buddy. I'll be monitoring your focus on "${sessionData.customTask}" and providing real-time support. ${sessionData.goal ? `I see your goal is: ${sessionData.goal.description}. ` : ''}Let's make this a productive session!`;
      addSystemMessage(welcomeMessage);
    }
  }, [isSessionActive, sessionData]);

  const addSystemMessage = (content: string) => {
    const message: StudyBuddyMessage = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date(),
      context: {
        focusScore: biometricData.focusScore,
        sessionProgress: ((sessionData.sessionDuration * 60 - sessionData.timeRemaining) / (sessionData.sessionDuration * 60)) * 100,
        distractionCount: distractionEvents.length,
        category: sessionData.category
      }
    };
    setMessages(prev => [...prev, message]);
    
    if (!isOpen) {
      setIsOpen(true); // Auto-open for important system messages
      setTimeout(() => setIsMinimized(false), 100);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: StudyBuddyMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLastInteraction(Date.now());

    // Generate AI response
    const context = {
      focusScore: biometricData.focusScore,
      sessionProgress: ((sessionData.sessionDuration * 60 - sessionData.timeRemaining) / (sessionData.sessionDuration * 60)) * 100,
      category: sessionData.category,
      timeRemaining: sessionData.timeRemaining
    };

    const aiResponse = await generateAIResponse(userMessage.content, context);
    
    const aiMessage: StudyBuddyMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: aiResponse,
      timestamp: new Date(),
      context
    };

    setMessages(prev => [...prev, aiMessage]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isSessionActive) return null;

  return (
    <>
      {/* Floating AI Buddy Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-40"
          title="Chat with AI Study Buddy"
        >
          <Bot className="h-6 w-6" />
          {messages.length > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              {messages.filter(m => m.type === 'system' || m.type === 'ai').length}
            </div>
          )}
        </button>
      )}

      {/* AI Study Buddy Chat Interface */}
      {isOpen && (
        <div className={`fixed bottom-4 right-4 glass-card rounded-2xl border border-white/20 shadow-2xl z-50 transition-all duration-300 ${
          isMinimized ? 'w-80 h-16' : 'w-96 h-[500px]'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/20 p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-2 rounded-lg">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">AI Study Buddy</h3>
                  {!isMinimized && (
                    <p className="text-xs text-gray-300">
                      Focus: {biometricData.focusScore}% • {Math.floor(sessionData.timeRemaining / 60)}m left
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 h-80">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
                          : message.type === 'system'
                          ? 'bg-orange-500/20 text-orange-100 border border-orange-500/30'
                          : 'bg-purple-500/20 text-purple-100 border border-purple-500/30'
                      }`}
                    >
                      <div className="text-sm leading-relaxed">{message.content}</div>
                      <div className="text-xs opacity-60 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-purple-500/20 text-purple-100 border border-purple-500/30 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-xs">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              <div className="px-4 py-2 border-t border-white/20">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setInputMessage("How am I doing?")}
                    className="text-xs bg-white/10 hover:bg-white/20 text-gray-300 px-2 py-1 rounded transition-all"
                  >
                    Progress
                  </button>
                  <button
                    onClick={() => setInputMessage("I need motivation")}
                    className="text-xs bg-white/10 hover:bg-white/20 text-gray-300 px-2 py-1 rounded transition-all"
                  >
                    Motivate
                  </button>
                  <button
                    onClick={() => setInputMessage("I'm feeling distracted")}
                    className="text-xs bg-white/10 hover:bg-white/20 text-gray-300 px-2 py-1 rounded transition-all"
                  >
                    Focus Help
                  </button>
                </div>
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/20">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask your AI study buddy..."
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    maxLength={200}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
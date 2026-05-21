import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseMomoAIService } from '../../services/SupabaseMomoAIService';
import { Bot, Send, Loader, Plus, Trash2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  lastMessageAt: Date;
  isActive: boolean;
}

interface FocusAIChatProps {
  refreshTrigger?: number;
  onNavigate?: (tabId: string) => void;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\s*\n/gm, '\n')
    .trim();
}

function renderMessageContent(content: string, onNavigate?: (id: string) => void) {
  const cleaned = stripMarkdown(content);
  const parts: React.ReactNode[] = [];
  const regex = /\[CTA:([a-z_]+)\|([^\]]+)\]/g;
  let last = 0;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > last) {
      parts.push(<span key={last}>{cleaned.slice(last, match.index)}</span>);
    }
    const [, tabId, label] = match;
    parts.push(
      <button
        key={match.index}
        onClick={() => onNavigate?.(tabId)}
        className="inline-flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-full mx-1 my-0.5 transition font-medium"
      >
        {label} →
      </button>
    );
    last = match.index + match[0].length;
  }
  if (last < cleaned.length) {
    parts.push(<span key={last}>{cleaned.slice(last)}</span>);
  }
  return <p className="whitespace-pre-wrap text-sm">{parts}</p>;
}

export function FocusAIChat({ refreshTrigger = 0, onNavigate }: FocusAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser, refreshTrigger]);

  useEffect(() => {
    if (currentConversationId) {
      loadConversationMessages(currentConversationId);
    }
  }, [currentConversationId]);


  const loadConversations = async () => {
    if (!currentUser) return;

    try {
      const convos = await supabaseMomoAIService.getUserConversations(currentUser.uid);
      setConversations(convos.map(c => ({
        id: c.id,
        title: c.title,
        lastMessageAt: new Date(c.last_message_at),
        isActive: c.is_active
      })));
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const msgs = await supabaseMomoAIService.getConversationMessages(conversationId, currentUser!.uid);
      setMessages(msgs.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at)
      })));
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load conversation');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentUser) return;

    const userMessageContent = inputMessage.trim();
    setInputMessage('');
    setError(null);

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const response = await supabaseMomoAIService.sendMessage(
        userMessageContent,
        currentUser.uid,
        currentConversationId || undefined
      );

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      };

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMessage.id);
        return [...filtered, tempUserMessage, aiMessage];
      });

      setCurrentConversationId(response.conversationId);

      await loadConversations();
    } catch (error: any) {
      console.error('Error sending message:', error);
      const code = error?.code || '';
      let msg = 'Something went wrong. Please try again.';
      if (code.includes('unauthenticated')) msg = 'Please log in to chat with Momo.';
      else if (code.includes('resource-exhausted')) msg = error.message || 'Daily message limit reached.';
      else if (code.includes('internal')) msg = 'Momo is having trouble connecting. The AI service may be starting up — try again in a moment.';
      else if (error.message && error.message !== 'internal') msg = error.message;
      setError(msg);
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setError(null);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabaseMomoAIService.deleteConversation(conversationId, currentUser!.uid);
      await loadConversations();

      if (currentConversationId === conversationId) {
        handleNewConversation();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setError('Failed to delete conversation');
    }
  };

  const quickPrompts = [
    "Analyze my recent progress",
    "How can I improve my focus?",
    "Help me avoid distractions",
    "What are my strengths?",
    "Give me motivation to start"
  ];

  return (
    <div className="p-4">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card rounded-2xl border border-violet-500/20 overflow-hidden shadow-xl">

          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600/80 to-indigo-600/80 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Momo AI Coach</h1>
                <p className="text-white/80 text-sm">Your personal productivity companion</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNewConversation}
                className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition"
                title="New conversation"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Conversations List */}
          {conversations.length > 0 && (
            <div className="bg-white/5 border-b border-white/10 p-3">
              <div className="flex gap-2 overflow-x-auto">
                {conversations.slice(0, 5).map(convo => (
                  <button
                    key={convo.id}
                    onClick={() => setCurrentConversationId(convo.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition group ${
                      currentConversationId === convo.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/15'
                    }`}
                  >
                    <span className="truncate max-w-[150px]">{convo.title}</span>
                    <button
                      onClick={(e) => handleDeleteConversation(convo.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !error && (
              <div className="text-center py-12">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">Hi, I'm Momo!</h3>
                <p className="text-gray-400 mb-6">Ask me anything about your focus journey</p>

                <div className="space-y-2 max-w-md mx-auto">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputMessage(prompt)}
                      className="block w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/40 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition text-sm text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                      : 'bg-white/10 border border-white/10 text-white'
                  }`}
                >
                  {renderMessageContent(message.content, onNavigate)}
                  <p className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 border border-white/10 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-400">Momo is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white/5 p-4 border-t border-white/10">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Ask Momo anything..."
                disabled={isLoading}
                className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition-all"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg text-white font-medium transition flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

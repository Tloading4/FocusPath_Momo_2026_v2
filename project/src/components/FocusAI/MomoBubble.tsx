import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseMomoAIService } from '../../services/SupabaseMomoAIService';

interface MomoBubbleProps {
  onNavigate: (tabId: string) => void;
}

interface BubbleMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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

function renderContent(content: string, onNavigate: (id: string) => void) {
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
        onClick={() => onNavigate(tabId)}
        className="inline-flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full mx-1 transition font-medium"
      >
        {label} →
      </button>
    );
    last = match.index + match[0].length;
  }
  if (last < cleaned.length) {
    parts.push(<span key={last}>{cleaned.slice(last)}</span>);
  }
  return <p className="text-sm whitespace-pre-wrap leading-relaxed">{parts}</p>;
}

export function MomoBubble({ onNavigate }: MomoBubbleProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<BubbleMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [greeted, setGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (open && !greeted && currentUser) {
      const firstName = (currentUser.displayName || 'there').split(' ')[0];
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: `Hi ${firstName}! Ready to focus? I can help you plan your next session.`,
      }]);
      setGreeted(true);
    }
  }, [open, greeted, currentUser]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !currentUser) return;
    const text = input.trim();
    setInput('');

    const userMsg: BubbleMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await supabaseMomoAIService.sendMessage(
        text,
        currentUser.uid,
        conversationId || undefined
      );
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: response.message,
      }]);
      setConversationId(response.conversationId);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I couldn't respond right now. Try opening the full chat.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">Momo</span>
              <span className="text-white/60 text-xs">your focus coach</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="h-60 overflow-y-auto p-3 space-y-2.5">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-white'
                }`}>
                  {renderContent(msg.content, (tabId) => {
                    onNavigate(tabId);
                    setOpen(false);
                  })}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 rounded-xl px-3 py-2">
                  <Loader className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions (shown only after greeting, before any user messages) */}
          {messages.length === 1 && messages[0].id === 'greeting' && (
            <div className="px-3 pb-2 flex flex-col gap-1.5">
              {[
                { label: 'Start a session', tab: 'timer' },
                { label: 'Check my progress', tab: 'progress' },
                { label: 'Open full chat', tab: 'momo' },
              ].map(({ label, tab }) => (
                <button
                  key={tab}
                  onClick={() => { onNavigate(tab); setOpen(false); }}
                  className="w-full text-left text-xs text-slate-300 bg-slate-700/60 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition"
                >
                  {label} →
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-1 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask Momo anything..."
              disabled={loading}
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 p-1.5 rounded-lg text-white transition"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Bubble button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
      >
        <Sparkles className="w-6 h-6 text-white" />
        {/* Pulse ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
        )}
      </button>
    </div>
  );
}

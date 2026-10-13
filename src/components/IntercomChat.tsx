import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Visitor } from '../types';
import { MessageSquare, Send } from 'lucide-react';

interface IntercomChatProps {
  messages: ChatMessage[];
  currentUser: Visitor | null;
  onSendMessage: (text: string) => void;
}

export const IntercomChat: React.FC<IntercomChatProps> = ({
  messages,
  currentUser,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0d131f] text-slate-300">
      <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
            Visitor Intercom
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Live Real-Time
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No chat messages yet. Say hello to other visitors browsing simultaneously!
          </div>
        ) : (
          messages.map((msg) => {
            const isYou = msg.userId === currentUser?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isYou ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                  <span
                    className="font-medium"
                    style={{ color: msg.userColor }}
                  >
                    {msg.userName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-lg text-xs max-w-[85%] break-words ${
                    isYou
                      ? 'bg-cyan-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-2 border-t border-slate-800 bg-[#0a0e17] flex items-center gap-1.5 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message other co-browsers..."
          className="flex-1 bg-[#131b2e] border border-slate-700 text-xs text-white placeholder-slate-500 px-3 py-1.5 rounded-md focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-md transition-colors"
          title="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

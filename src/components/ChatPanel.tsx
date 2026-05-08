import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Loader2, User, Bot, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      parts: [{ text: input }]
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(msg => ({
        role: msg.role,
        parts: msg.parts
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history })
      });

      const data = await res.json();

      if (data.text) {
        const aiMessage: Message = { role: 'model', parts: [{ text: data.text }] };
        setMessages(prev => [...prev, aiMessage]);
      } else if (data.error) {
        const errMessage: Message = { role: 'model', parts: [{ text: `Error: ${data.error}` }] };
        setMessages(prev => [...prev, errMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errMessage: Message = { role: 'model', parts: [{ text: 'Network error — could not reach the server.' }] };
      setMessages(prev => [...prev, errMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-indigo-600 text-white shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 group"
        aria-label="Toggle chat"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />}
        {!isOpen && messages.length === 0 && (
           <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 border-2 border-white"></span>
          </span>
        )}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 z-50 w-[350px] sm:w-[400px] h-[500px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-linear-to-r from-indigo-600 to-indigo-500 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Travel Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                    <span className="text-[10px] font-medium opacity-80 uppercase tracking-wider">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 dark:bg-slate-950/50">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
                    <Bot className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Hello! I'm your AI Travel Assistant.</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ask me anything about your trip or destinations!</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Top things to do in Paris', 'Best time to visit Tokyo', 'Budget travel tips'].map(tip => (
                      <button
                        key={tip}
                        onClick={() => setInput(tip)}
                        className="text-[10px] font-medium px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400 transition-colors"
                      >
                        {tip}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {messages.map((msg, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-800'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none'}`}>
                      {msg.parts[0].text}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-800">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-400/50 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-3 font-medium">
                Powered by Google Gemini AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

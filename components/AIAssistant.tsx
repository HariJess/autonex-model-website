'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import { useState } from 'react';

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ id: string; text: string; sender: 'user' | 'ai' }>
  >([
    {
      id: '1',
      text: 'Bonjour! Je suis AutoNex AI. Comment puis-je vous aider à trouver votre voiture parfaite?',
      sender: 'ai',
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        text: input,
        sender: 'user' as const,
      };
      setMessages([...messages, newMessage]);
      setInput('');

      // Simulate AI response
      setTimeout(() => {
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          text: 'Je comprends. Basé sur vos préférences, je vous recommande de vérifier nos véhicules premium. Cliquez sur "Voir Tous les Véhicules" pour parcourir nos options.',
          sender: 'ai' as const,
        };
        setMessages((prev) => [...prev, aiResponse]);
      }, 500);
    }
  };

  return (
    <>
      {/* Chat Bubble Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-2xl hover:shadow-blue-500/50 transition-shadow"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulsing indicator when closed */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute w-14 h-14 rounded-full border-2 border-blue-400 pulse-glow"
            />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-24px)] rounded-2xl glass-dark border border-blue-500/30 overflow-hidden flex flex-col h-96 shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-b border-blue-500/20 px-6 py-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                AutoNex AI Assistant
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Disponible 24/7 pour vous aider
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    message.sender === 'user'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs px-4 py-2.5 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-none'
                        : 'bg-slate-800 text-muted-foreground border border-slate-700 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-slate-700 p-4 bg-slate-900/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  placeholder="Posez votre question..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center justify-center hover:shadow-lg hover:shadow-blue-500/50 transition-shadow"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

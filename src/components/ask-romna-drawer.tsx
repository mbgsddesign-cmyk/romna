'use client';

import { useRomnaAI } from '@/contexts/romna-ai-context';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function AskRomnaDrawer() {
  const { isDrawerOpen, closeDrawer, askRomna, isLoading, lastResponse } = useRomnaAI();
  const { locale } = useTranslation();
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isDrawerOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDrawerOpen]);

  useEffect(() => {
    if (lastResponse) {
      setResponse(lastResponse.message);
    }
  }, [lastResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    setInput('');
    setResponse('');
    
    await askRomna(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={closeDrawer}
          />
          
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'bg-card border-t border-border',
              'rounded-t-[24px] shadow-2xl',
              'max-h-[80vh] flex flex-col',
              'safe-area-bottom'
            )}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center neon-glow">
                  <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-foreground">Ask ROMNA</h2>
                  <p className="text-[12px] text-muted-foreground">
                    {locale === 'ar' ? 'اسألني أي شيء' : 'Ask me anything'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="w-9 h-9 rounded-full bg-muted/20 hover:bg-muted/30 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {response && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-accent" />
                    </div>
                    <p className="text-[14px] text-foreground leading-relaxed flex-1">
                      {response}
                    </p>
                  </div>
                </motion.div>
              )}
              
              {isLoading && (
                <div className="flex items-center gap-2 text-accent">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-[13px] font-medium">
                    {locale === 'ar' ? 'جارٍ التفكير...' : 'Thinking...'}
                  </span>
                </div>
              )}

              {!response && !isLoading && (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 text-accent/50 mx-auto mb-3" />
                  <p className="text-[14px] text-muted-foreground">
                    {locale === 'ar' 
                      ? 'اسألني عن مهامك، أحداثك، أو أي شيء آخر'
                      : 'Ask me about your tasks, events, or anything else'}
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-5 border-t border-border">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={locale === 'ar' ? 'اكتب سؤالك...' : 'Type your question...'}
                    rows={1}
                    className={cn(
                      'w-full px-4 py-3 pr-12',
                      'bg-muted/20 border border-border rounded-[16px]',
                      'text-[14px] text-foreground placeholder:text-muted-foreground',
                      'resize-none focus:outline-none focus:ring-2 focus:ring-accent/50',
                      'transition-all'
                    )}
                    style={{ maxHeight: '120px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    'w-12 h-12 rounded-full',
                    'bg-accent hover:bg-accent/90 text-background',
                    'flex items-center justify-center',
                    'transition-all neon-glow',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

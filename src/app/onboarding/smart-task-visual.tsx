import React from 'react';
import { motion } from 'framer-motion';
import { AudioWaveform, ArrowDown, Calendar, Sparkles, Phone } from 'lucide-react';

export function SmartTaskVisual() {
  return (
    <div className="w-full max-w-[320px] flex flex-col gap-6 relative mx-auto my-8">
      {/* Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Input: User Voice/Text */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative self-end w-4/5"
      >
        <div className="bg-card dark:bg-card/60 p-4 rounded-2xl rounded-tr-sm shadow-lg border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <AudioWaveform className="text-accent w-5 h-5" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Processing...</span>
          </div>
          <p className="text-foreground font-medium leading-snug">&quot;Remind me to call Mom at 6 PM&quot;</p>
        </div>
      </motion.div>
      
      {/* Connector: Transformation Arrow */}
      <motion.div 
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center my-[-10px] z-10"
      >
        <div className="bg-background p-2 rounded-full border border-border/50 shadow-sm">
          <ArrowDown className="text-accent w-5 h-5 animate-bounce" />
        </div>
      </motion.div>
      
      {/* Output: Smart Task Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="relative self-start w-full"
      >
        <div className="bg-card dark:bg-card/60 p-0 rounded-2xl shadow-xl border border-border/50 overflow-hidden">
          {/* Card Header Highlight */}
          <div className="h-1 w-full bg-accent shadow-[0_0_15px_rgba(48,232,122,0.4)]"></div>
          <div className="p-5 flex items-center gap-4">
            {/* Icon Box */}
            <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Phone className="text-accent text-2xl w-6 h-6" />
            </div>
            {/* Task Details */}
            <div className="flex-1">
              <h3 className="text-foreground font-bold text-lg leading-tight">Call Mom</h3>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="text-muted-foreground w-4 h-4" />
                <p className="text-muted-foreground text-sm font-medium">Today, 6:00 PM</p>
              </div>
            </div>
            {/* Checkbox Visual */}
            <div className="h-6 w-6 rounded-full border-2 border-border"></div>
          </div>
        </div>
        {/* AI Badge */}
        <div className="absolute -top-3 -right-2 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          AUTO-DETECT
        </div>
      </motion.div>
    </div>
  );
}
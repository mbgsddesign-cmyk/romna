'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Check, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProPaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
  description?: string;
}

const proFeatures = [
  'Unlimited AI Insights',
  'Full History & Trends',
  'Advanced Analytics',
  'Delegate Tasks',
  'Smart Batching',
  'Priority Support'
];

export function ProPaywallModal({ 
  open, 
  onClose, 
  feature = 'Unlock Full History',
  description = 'See past insights & trends.'
}: ProPaywallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] mobile-card border-accent/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <DialogHeader className="pt-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-16 h-16 mx-auto mb-4 rounded-[20px] bg-gradient-to-br from-primary to-accent flex items-center justify-center"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          
          <DialogTitle className="text-center text-2xl font-bold">
            {feature}
            <Badge variant="outline" className="ml-2 border-accent/30 text-accent">
              PRO
            </Badge>
          </DialogTitle>
          <p className="text-center text-muted-foreground text-sm mt-2">
            {description}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card className="p-4 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">ROMANA Pro</h3>
                <p className="text-2xl font-extrabold mt-1">
                  $9.99<span className="text-sm text-muted-foreground font-normal">/month</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {proFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-accent" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </motion.div>
              ))}
            </div>
          </Card>

          <div className="space-y-2">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70"
              onClick={() => {
                window.location.href = '/settings/billing';
              }}
            >
              Upgrade to Pro
            </Button>
            <Button 
              size="lg" 
              variant="ghost" 
              className="w-full"
              onClick={onClose}
            >
              Not now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { Home, CheckSquare, Calendar, Mic, Settings, Shield, Bell, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/hooks/use-translation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const baseNavItems = [
  { href: '/', icon: Home, labelKey: 'home' as const },
  { href: '/notifications', icon: Bell, labelKey: 'notifications' as const },
  { href: '/voice', icon: Mic, labelKey: 'voice' as const },
  { href: '/settings', icon: Settings, labelKey: 'settings' as const },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  if (pathname.startsWith('/auth') || pathname.startsWith('/admin')) {
    return null;
  }

  const navItems = isAdmin 
    ? [...baseNavItems.slice(0, 4), { href: '/admin', icon: Shield, labelKey: 'admin' as const }, baseNavItems[4]]
    : baseNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center flex-1 h-full"
            >
              <motion.div
                className={cn(
                  'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors relative',
                  isActive 
                    ? 'text-primary dark:text-accent' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
                whileTap={{ scale: 0.9 }}
              >
                <div className={cn(
                  "relative p-1.5 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/10 dark:bg-accent/10"
                )}>
                  <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <motion.div
                      layoutId="navGlow"
                      className="absolute inset-0 bg-primary/20 dark:bg-accent/20 rounded-xl blur-md -z-10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] transition-all duration-200",
                  isActive ? "font-semibold" : "font-medium"
                )}>
                  {t(item.labelKey)}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary dark:bg-accent"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
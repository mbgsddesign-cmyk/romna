'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const publicRoutes = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/callback',
  '/auth/reset-password',
  '/onboarding',
];

function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col items-center justify-center bg-background"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="flex flex-col items-center"
      >
        <div className="w-20 h-20 mb-6 rounded-[24px] bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg logo-glow">
          <span className="text-3xl font-bold text-white">R</span>
        </div>
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-8 h-8 text-primary" />
          </motion.div>
        </div>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-sm text-muted-foreground font-medium"
        >
          Loading...
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, profile, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    if (loading) return;

    const checkAuth = async () => {
      if (!user && !isPublicRoute) {
        router.replace('/auth/login');
        return;
      }

      if (user && !profile && !isPublicRoute) {
        if (!profileTimeoutRef.current) {
          profileTimeoutRef.current = setTimeout(() => {
            console.warn('Profile loading timeout - allowing UI render');
            setIsChecking(false);
          }, 3000);
        }
        return;
      }

      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
        profileTimeoutRef.current = null;
      }

      if (user && profile && !profile.onboarding_completed && pathname !== '/onboarding') {
        router.replace('/onboarding');
        return;
      }

      if (user && profile && isPublicRoute && pathname !== '/auth/callback' && pathname !== '/onboarding') {
        router.replace('/');
        return;
      }

      if (isAdminRoute && user && profile && !isAdmin) {
        router.replace('/');
        return;
      }

      setIsChecking(false);
    };

    checkAuth();

    return () => {
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
      }
    };
  }, [loading, user, profile, isPublicRoute, isAdminRoute, isAdmin, pathname, router]);

  if (loading || (isChecking && !isPublicRoute)) {
    return (
      <AnimatePresence mode="wait">
        <LoadingScreen key="loading" />
      </AnimatePresence>
    );
  }

  if (!user && !isPublicRoute) {
    return null;
  }

  if (isAdminRoute && !isAdmin) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, CreditCard, Activity, FileText, BarChart3, 
  LayoutDashboard, ArrowLeft, Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { href: '/admin', icon: LayoutDashboard, labelKey: 'overview' as const },
  { href: '/admin/users', icon: Users, labelKey: 'users' as const },
  { href: '/admin/subscriptions', icon: CreditCard, labelKey: 'subscriptions' as const },
  { href: '/admin/usage', icon: Activity, labelKey: 'aiUsage' as const },
  { href: '/admin/logs', icon: FileText, labelKey: 'auditLogs' as const },
  { href: '/admin/analytics', icon: BarChart3, labelKey: 'analytics' as const },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/');
    }
  }, [loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-semibold">{t('adminDashboard')}</h1>
          </div>
          <span className="text-xs text-muted-foreground">{profile?.name}</span>
        </div>
        <nav className="px-4 pb-2 overflow-x-auto">
          <div className="flex gap-1">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="whitespace-nowrap">{t(item.labelKey)}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="p-4 pb-24">{children}</main>
    </div>
  );
}

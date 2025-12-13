'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Drawer } from 'vaul';
import { useRouter } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  // Hide on auth pages
  if (pathname.startsWith('/auth')) return null;

  const navItems = [
    { href: '/', icon: 'home', label: 'Home' },
    { href: '/voice', icon: 'mic', label: 'Voice', isMain: true },
    { href: '/notifications', icon: 'inbox', label: 'Inbox' },
  ];

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <nav className="pointer-events-auto bg-obsidian backdrop-blur-xl border border-white/10 rounded-[2rem] pl-8 pr-4 py-3 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex items-center gap-8">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          if (item.isMain) {
            return (
              <Link key={item.href} href={item.href} className="relative group">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive 
                    ? 'bg-volt text-black scale-110 shadow-[0_0_20px_rgba(217,253,0,0.4)]' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}>
                  <span className={`material-symbols-outlined text-[28px] ${isActive ? 'material-symbols-outlined-fill' : ''}`}>
                    {item.icon}
                  </span>
                </div>
              </Link>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="relative group flex flex-col items-center justify-center w-10 h-10">
              <span className={`material-symbols-outlined transition-colors duration-300 ${
                isActive ? 'text-white material-symbols-outlined-fill' : 'text-white/40 group-hover:text-white/80'
              }`}>
                {item.icon}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="nav-dot"
                  className="absolute -bottom-2 w-1 h-1 rounded-full bg-volt"
                />
              )}
            </Link>
          );
        })}

        {/* ACCOUNT DRAWER */}
        <Drawer.Root>
          <Drawer.Trigger asChild>
            <button className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden hover:border-volt/50 transition-colors ml-2">
              <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-white/10 to-transparent text-xs font-bold text-white/60">
                {user?.email?.[0].toUpperCase() || 'U'}
              </div>
            </button>
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
            <Drawer.Content className="bg-obsidian border-t border-white/10 flex flex-col rounded-t-[32px] mt-24 fixed bottom-0 left-0 right-0 z-50 max-h-[85vh]">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-white/20 mt-4 mb-8" />
              
              <div className="p-8 pt-0 flex flex-col gap-6">
                {/* PROFILE HEADER */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold text-white">
                    {user?.email?.[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-space font-bold tracking-tight">Account</h3>
                    <p className="text-white/40 text-sm font-mono">{user?.email}</p>
                  </div>
                </div>

                {/* MENU ITEMS */}
                <div className="flex flex-col gap-2">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="text-white/80 font-medium">Subscription</span>
                    <span className="text-volt text-xs font-bold uppercase tracking-widest px-2 py-1 bg-volt/10 rounded-md">Pro Plan</span>
                  </div>
                  
                  <button className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors">
                    <span className="text-white/80 font-medium">Settings</span>
                    <span className="material-symbols-outlined text-white/40">chevron_right</span>
                  </button>
                </div>

                {/* LOGOUT */}
                <button 
                  onClick={handleLogout}
                  className="mt-4 w-full h-14 rounded-2xl border border-red-500/20 text-red-400 font-bold hover:bg-red-500/10 transition-colors"
                >
                  Log Out
                </button>
                
                <div className="text-center mt-4 text-[10px] text-white/20 font-space tracking-[0.3em] uppercase">
                  Romna System v3.0
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

      </nav>
    </div>
  );
}
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function BottomNav() {
  const pathname = usePathname();
  
  // Hide on auth pages
  if (pathname.startsWith('/auth')) return null;

  const navItems = [
    { href: '/', icon: 'home', label: 'Home' },
    { href: '/voice', icon: 'mic', label: 'Voice', isMain: true },
    { href: '/notifications', icon: 'inbox', label: 'Inbox' },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <nav className="pointer-events-auto bg-obsidian backdrop-blur-xl border border-white/10 rounded-[2rem] px-6 py-3 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex items-center gap-8">
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
      </nav>
    </div>
  );
}
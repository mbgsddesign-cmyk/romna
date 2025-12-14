'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Drawer } from 'vaul';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function BottomNav() {
  const pathname = usePathname();
  const { user, userId, isLocal, profile, signOut } = useAuth();
  const router = useRouter();

  // Hide on auth pages
  if (pathname.startsWith('/auth')) return null;

  // Use either profile name, or "Commander" for local, or email first char
  const displayName = profile?.name || (isLocal ? 'Commander' : user?.email?.split('@')[0]) || 'User';
  const displayInitial = displayName.charAt(0).toUpperCase();

  const navItems = [
    { href: '/', icon: 'home', label: 'Home' },
    { href: '/voice', icon: 'mic', label: 'Voice', isMain: true },
    { href: '/notifications', icon: 'inbox', label: 'Inbox' },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      // Silent fail safe
      console.error('Logout error:', error);
      router.push('/auth/login');
    }
  };

  const planName = (profile?.subscription?.plan || 'free').toUpperCase();
  const isPro = planName === 'PRO' || planName === 'ENTERPRISE';

  // Fetch AI preference
  const [autoExecute, setAutoExecute] = useState(false);
  useEffect(() => {
    if (user?.id) {
      supabase.from('user_preferences').select('ai_opt_in').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (data) setAutoExecute(data.ai_opt_in || false);
        });
    }
  }, [user?.id]);

  const toggleAutoExecute = async () => {
    const newValue = !autoExecute;
    setAutoExecute(newValue);
    if (user?.id) {
      await supabase.from('user_preferences').upsert({ user_id: user.id, ai_opt_in: newValue });
      toast.success(newValue ? "Auto-execution enabled" : "Auto-execution disabled");
    }
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <nav className="pointer-events-auto bg-obsidian backdrop-blur-xl border border-white/10 rounded-[2rem] pl-8 pr-4 py-3 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex items-center gap-8">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          if (item.isMain) {
            return (
              <Link key={item.href} href={item.href} className="relative group">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isActive
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
              <span className={`material-symbols-outlined transition-colors duration-300 ${isActive ? 'text-white material-symbols-outlined-fill' : 'text-white/40 group-hover:text-white/80'
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
            <button
              title="Account & Integrations"
              className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden hover:border-volt/50 transition-colors ml-2"
            >
              <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-white/10 to-transparent text-xs font-bold text-white/60">
                {displayInitial}
              </div>
            </button>
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
            <Drawer.Content className="bg-obsidian border-t border-white/10 flex flex-col rounded-t-[32px] mt-24 fixed bottom-0 left-0 right-0 z-50 max-h-[85vh]">
              <Drawer.Title className="sr-only">Account Menu</Drawer.Title>
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-white/20 mt-4 mb-8" />

              <div className="px-6 pb-8 flex flex-col gap-8 h-full overflow-y-auto">

                {/* A. IDENTITY & PLAN */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-white font-space text-2xl font-bold tracking-tight">
                    {displayName}
                  </h3>

                  {/* Sync Button if Local, Plan if Auth */}
                  {isLocal ? (
                    <Link href="/auth/login" className="flex items-center gap-3 w-fit hover:opacity-80 transition-opacity group">
                      <span className="px-3 py-1 rounded-full bg-volt/10 border border-volt/20 text-volt text-[10px] font-bold uppercase tracking-widest group-hover:bg-volt group-hover:text-black transition-colors">
                        Local Mode
                      </span>
                      <span className="text-white/40 text-xs font-medium group-hover:text-white transition-colors">
                        Tap to Sync & Backup
                      </span>
                      <span className="material-symbols-outlined text-[14px] text-white/40 group-hover:text-white">cloud_upload</span>
                    </Link>
                  ) : (
                    <Link href="/pricing" className="flex items-center gap-3 w-fit hover:opacity-80 transition-opacity">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${isPro
                        ? 'bg-volt/10 border-volt/20 text-volt'
                        : 'bg-white/10 border-white/20 text-white/60'
                        }`}>
                        {planName}
                      </span>
                      <span className="text-white/40 text-xs font-medium">
                        {isPro ? 'Advanced execution' : 'Basic reminders'}
                      </span>
                      <span className="material-symbols-outlined text-[14px] text-white/40 rtl:rotate-180">chevron_right</span>
                    </Link>
                  )}
                </div>

                {/* B. INTEGRATIONS */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white/30 text-[10px] font-space font-bold uppercase tracking-[0.2em] mb-1">
                      Integrations
                    </h4>
                    <Link href="/settings/integrations" className="text-[10px] text-volt hover:underline">
                      Manage
                    </Link>
                  </div>

                  {/* Real integrations check */}
                  {profile?.integrations?.filter(i => i.is_connected).length ? (
                    profile.integrations.filter(i => i.is_connected).map((int) => (
                      <IntegrationRow key={int.id} icon={int.type === 'gmail' ? 'mail' : 'extension'} label={int.type} status="Connected" />
                    ))
                  ) : (
                    // Fallback to static if no real integrations found, to show capabilities
                    <>
                      <IntegrationRow icon="mail" label="Email" status="Not Connected" />
                      <IntegrationRow icon="chat" label="WhatsApp" status="Not Connected" />
                      <IntegrationRow icon="calendar_today" label="Calendar" status="Not Connected" />
                    </>
                  )}
                </div>

                {/* C. EXECUTION PREFERENCES */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-white/30 text-[10px] font-space font-bold uppercase tracking-[0.2em] mb-1">
                    Execution Control
                  </h4>

                  <IntegrationPreferenceToggle
                    label="Require approval for emails"
                    type="gmail"
                    defaultVal={true}
                  />
                  <IntegrationPreferenceToggle
                    label="Require approval for messages"
                    type="whatsapp"
                    defaultVal={true}
                  />

                  <ToggleRow label="Auto-execute reminders" checked={autoExecute} onToggle={toggleAutoExecute} />
                </div>

                {/* D. ACCOUNT ACTIONS */}
                <div className="flex flex-col gap-2 pt-6 border-t border-white/5 mt-auto">
                  <Link href="/settings" className="w-full text-left py-3 text-white/60 hover:text-white text-sm font-medium transition-colors block">
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left py-3 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                  >
                    Log Out
                  </button>
                </div>

              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

      </nav>
    </div>
  );
}

function IntegrationPreferenceToggle({ label, type, defaultVal }: { label: string; type: string; defaultVal: boolean }) {
  const { profile, refreshProfile } = useAuth();
  // Find integration or use null
  const integration = profile?.integrations?.find(i => i.type === type);
  // Default to true if not found or not set
  const [isChecked, setIsChecked] = useState(defaultVal);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (integration?.metadata && typeof integration.metadata.require_approval === 'boolean') {
      setIsChecked(integration.metadata.require_approval);
    }
  }, [integration]);

  const handleToggle = async () => {
    if (!integration) {
      toast.error(`Please connect ${type} first`);
      return;
    }

    const newVal = !isChecked;
    setIsChecked(newVal); // Optimistic
    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_integrations')
        .update({
          metadata: { ...integration.metadata, require_approval: newVal }
        })
        .eq('id', integration.id);

      if (error) throw error;
      await refreshProfile();
      toast.success("Preference updated");
    } catch (err) {
      console.error(err);
      setIsChecked(!newVal); // Revert
      toast.error("Failed to update preference");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={handleToggle}
      className={`flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer active:scale-[0.98] transition-transform ${!integration ? 'opacity-50' : ''}`}
    >
      <span className="text-sm text-white/80">{label}</span>
      <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${isChecked ? 'bg-volt' : 'bg-white/10'}`}>
        <div className={`w-4 h-4 rounded-full bg-black shadow-sm transition-transform duration-300 ${isChecked ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}

function IntegrationRow({ icon, label, status }: { icon: string; label: string; status: string }) {
  const isConnected = status === 'Connected';
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isConnected ? 'bg-white/5 border-white/5' : 'bg-transparent border-white/5 opacity-60'}`}>
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-[18px] ${isConnected ? 'text-white' : 'text-white/40'}`}>
          {icon}
        </span>
        <span className="text-sm text-white/90 font-medium capitalize">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-volt shadow-[0_0_8px_rgba(217,253,0,0.5)]' : 'bg-white/20'}`} />
        <span className="text-[10px] text-white/40 font-medium uppercase tracking-wide">{status}</span>
      </div>
    </div>
  );
}

function ToggleRow({ label, defaultChecked, checked, onToggle }: { label: string; defaultChecked?: boolean; checked?: boolean; onToggle?: () => void }) {
  const [localChecked, setLocalChecked] = useState(defaultChecked || false);
  const isChecked = checked !== undefined ? checked : localChecked;

  const handleClick = () => {
    if (onToggle) onToggle();
    if (checked === undefined) setLocalChecked(!localChecked);
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <span className="text-sm text-white/80">{label}</span>
      <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${isChecked ? 'bg-volt' : 'bg-white/10'}`}>
        <div className={`w-4 h-4 rounded-full bg-black shadow-sm transition-transform duration-300 ${isChecked ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}
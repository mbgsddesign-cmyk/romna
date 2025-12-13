'use client';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export default function AccountPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Google OAuth profile image
    const googlePhotoUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    
    // Custom uploaded avatar
    const customAvatar = profile?.avatar_url;

    // Priority: custom upload > Google photo > default
    if (customAvatar) {
      setAvatarUrl(customAvatar);
    } else if (googlePhotoUrl) {
      setAvatarUrl(googlePhotoUrl);
    } else {
      setAvatarUrl('https://lh3.googleusercontent.com/aida-public/AB6AXuCxnHjWKSB2ZR54xHqnkisSOd5xIUqg6_Av-ZXzITiKQLYPxk7WI58gS7pGgx4kjuqdy83l6Hv4sD4jmy7RZa4Sh_jl7PVKPTDY3X8R-oi_dzvDFqtuS0nbi6FmTlWoAbQehnIolTq90AgyYlRvHDwdWM6Qol496pi-MNoF_9TUtJlefBg7-12dQifov8UsfeO0c7fSoUNxRD8n35AmacgihhPfA6cy3dAnd6es3V1E9sAG1irTcpNRY5GU_xeOgx-_qSOUpmkLpx8');
    }
  }, [user, profile]);

  const handleAvatarClick = () => {
    const isGoogleUser = user?.app_metadata?.provider === 'google';
    if (!isGoogleUser) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload JPG, PNG, or WEBP');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      // Preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setAvatarUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(data.publicUrl);
      toast.success('Profile picture updated');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const displayName = profile?.name || user?.user_metadata?.full_name || 'Alex Ross';
  const displayEmail = user?.email || 'alex.ross@romna.ai';

  return (
    <html className="dark" lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>Settings Screen</title>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                darkMode: "class",
                theme: {
                  extend: {
                    colors: {
                      primary: "#F5EF08",
                      "primary-dim": "#D6D100",
                      "background-light": "#F2F4F6",
                      "background-dark": "#050806",
                      "surface-light": "#FFFFFF",
                      "surface-dark": "#101512",
                      "surface-highlight-dark": "#1A201C",
                      "text-main-light": "#111827",
                      "text-main-dark": "#EAEFEA",
                      "text-sub-light": "#6B7280",
                      "text-sub-dark": "#88908B",
                      "accent-green": "#4ADE80",
                    },
                    fontFamily: {
                      sans: ["Inter", "sans-serif"],
                      mono: ["JetBrains Mono", "monospace"],
                    },
                    borderRadius: {
                      DEFAULT: "0.5rem",
                      'xl': '0.75rem',
                      '2xl': '1rem',
                      '3xl': '1.5rem',
                    },
                    boxShadow: {
                      'glow': '0 0 20px rgba(245, 239, 8, 0.15)',
                      'nav': '0 -1px 0 rgba(255,255,255,0.05)',
                    }
                  },
                },
              };
            `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .glass-panel {
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
              }
              .text-gradient {
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
              }
              body {
                min-height: max(884px, 100dvh);
              }
            `,
          }}
        />
      </head>
      <body className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark antialiased font-sans min-h-screen flex flex-col selection:bg-primary selection:text-black">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="w-full h-12 flex justify-between items-center px-6 pt-2 text-sm font-medium z-10">
          <span className="dark:text-white">9:41</span>
          <div className="flex gap-1.5 items-center">
            <span className="material-icons-round text-xs">signal_cellular_alt</span>
            <span className="material-icons-round text-xs">wifi</span>
            <span className="material-icons-round text-[18px]">battery_full</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto pb-32 px-5">
          <header className="mt-4 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">Account</h1>
              <p className="text-text-sub-light dark:text-text-sub-dark text-sm">Manage your personal preferences</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-text-sub-light dark:text-text-sub-dark hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <span className="material-icons-round">logout</span>
            </button>
          </header>

          <section className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-white/5 rounded-3xl p-5 mb-8 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none opacity-50 dark:opacity-100"></div>
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="relative">
                <img
                  alt="Profile Avatar"
                  className={`w-16 h-16 rounded-full border-2 border-white dark:border-white/10 shadow-lg object-cover ${!uploading && 'cursor-pointer'}`}
                  src={avatarUrl}
                  onClick={handleAvatarClick}
                  style={uploading ? { opacity: 0.5 } : {}}
                />
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary border-2 border-surface-light dark:border-surface-dark rounded-full flex items-center justify-center">
                  <span className="material-icons-round text-[10px] text-black">check</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-xl font-bold">{displayName}</h2>
                  <span className="px-2 py-0.5 bg-primary/20 text-yellow-700 dark:text-primary text-[10px] font-bold rounded-full border border-primary/20 tracking-wide uppercase">PRO</span>
                </div>
                <p className="text-text-sub-light dark:text-text-sub-dark text-sm font-mono">{displayEmail}</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 border border-gray-100 dark:border-white/5 relative z-10">
              <div className="flex justify-between items-end mb-2">
                <div className="flex flex-col">
                  <span className="text-xs text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider font-semibold mb-1">Monthly AI Credits</span>
                  <span className="text-lg font-bold font-mono">2,450 <span className="text-text-sub-light dark:text-text-sub-dark text-sm font-sans font-normal">/ 3,000</span></span>
                </div>
                <span className="text-xs font-bold text-yellow-600 dark:text-primary">82%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full rounded-full w-[82%] shadow-[0_0_10px_rgba(245,239,8,0.4)]"></div>
              </div>
              <p className="mt-2 text-xs text-text-sub-light dark:text-text-sub-dark flex items-center gap-1">
                <span className="material-icons-round text-sm">update</span>
                Resets in 4 days
              </p>
            </div>
          </section>

          <h3 className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-widest mb-3 ml-2">Intelligence</h3>
          <div className="space-y-3 mb-8">
            <button className="w-full bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-white/5 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <span className="material-icons-round">smart_toy</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-base">Model Configuration</p>
                  <p className="text-xs text-text-sub-light dark:text-text-sub-dark">GPT-4, Claude 3, Local LLM</p>
                </div>
              </div>
              <span className="material-icons-round text-text-sub-light dark:text-text-sub-dark opacity-50">chevron_right</span>
            </button>
            <button className="w-full bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-white/5 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <span className="material-icons-round">auto_fix_high</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-base">Auto-Executions</p>
                  <p className="text-xs text-text-sub-light dark:text-text-sub-dark">5 Active Workflows</p>
                </div>
              </div>
              <span className="material-icons-round text-text-sub-light dark:text-text-sub-dark opacity-50">chevron_right</span>
            </button>
          </div>

          <h3 className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-widest mb-3 ml-2">Connections</h3>
          <div className="space-y-3 mb-8">
            <button className="w-full bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-white/5 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                  <span className="material-icons-round">grid_view</span>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base">Integrations</p>
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  </div>
                  <p className="text-xs text-text-sub-light dark:text-text-sub-dark">Slack, Notion, Calendar</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-text-sub-light dark:text-text-sub-dark">3 Active</span>
                <span className="material-icons-round text-text-sub-light dark:text-text-sub-dark opacity-50">chevron_right</span>
              </div>
            </button>
          </div>

          <h3 className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-widest mb-3 ml-2">General</h3>
          <div className="space-y-3 mb-8">
            <button className="w-full bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-white/5 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <span className="material-icons-round">notifications</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-base">Notifications</p>
                  <p className="text-xs text-text-sub-light dark:text-text-sub-dark">Email, Push</p>
                </div>
              </div>
              <span className="material-icons-round text-text-sub-light dark:text-text-sub-dark opacity-50">chevron_right</span>
            </button>
            <button className="w-full bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-white/5 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center">
                  <span className="material-icons-round">credit_card</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-base">Subscription</p>
                  <p className="text-xs text-text-sub-light dark:text-text-sub-dark">Manage Payment Methods</p>
                </div>
              </div>
              <span className="material-icons-round text-text-sub-light dark:text-text-sub-dark opacity-50">chevron_right</span>
            </button>
          </div>

          <div className="text-center mb-6">
            <p className="text-[10px] text-text-sub-light dark:text-text-sub-dark opacity-50">ROMNA v2.4.1 (Build 8902)</p>
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 w-full glass-panel border-t border-gray-200 dark:border-white/5 pb-6 pt-2 px-6 flex justify-between items-end z-50 bg-white/80 dark:bg-black/80">
          <button className="flex flex-col items-center gap-1 w-12 group">
            <span className="material-icons-round text-text-sub-light dark:text-text-sub-dark group-hover:text-text-main-light dark:group-hover:text-white transition-colors text-2xl">home_filled</span>
            <div className="w-1 h-1 rounded-full bg-transparent group-hover:bg-primary transition-colors"></div>
          </button>
          <button className="flex flex-col items-center gap-1 w-12 group">
            <span className="material-icons-round text-text-sub-light dark:text-text-sub-dark group-hover:text-text-main-light dark:group-hover:text-white transition-colors text-2xl">search</span>
            <div className="w-1 h-1 rounded-full bg-transparent group-hover:bg-primary transition-colors"></div>
          </button>
          <div className="relative -top-5">
            <button className="w-16 h-16 rounded-full bg-surface-dark dark:bg-black border border-white/10 flex items-center justify-center shadow-glow group active:scale-95 transition-transform relative z-10">
              <div className="absolute inset-0 rounded-full border border-primary opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <span className="material-icons-round text-primary text-3xl">mic</span>
            </button>
          </div>
          <button className="flex flex-col items-center gap-1 w-12 group">
            <span className="material-icons-round text-text-sub-light dark:text-text-sub-dark group-hover:text-text-main-light dark:group-hover:text-white transition-colors text-2xl">calendar_today</span>
            <div className="w-1 h-1 rounded-full bg-transparent group-hover:bg-primary transition-colors"></div>
          </button>
          <button className="flex flex-col items-center gap-1 w-12 group">
            <span className="material-icons-round text-yellow-600 dark:text-primary transition-colors text-2xl">settings</span>
            <div className="w-1 h-1 rounded-full bg-yellow-600 dark:bg-primary transition-colors"></div>
          </button>
        </nav>
      </body>
    </html>
  );
}

'use client';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { BottomNav } from '@/components/bottom-nav';

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

  const displayName = profile?.name || user?.user_metadata?.full_name || 'User';
  const displayEmail = user?.email || '';

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden pb-24" style={{ background: '#09140f' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <header className="pt-12 pb-2 px-6 flex flex-col items-start justify-end z-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-0.5">
          Account
        </h1>
        <p className="text-gray-400 text-sm font-light tracking-wide opacity-80 uppercase">Manage your profile</p>
      </header>

      <main className="flex-1 px-4 space-y-6 overflow-y-auto no-scrollbar pb-10">
        <div className="border rounded-3xl p-6 space-y-4" style={{
          backgroundColor: '#121e18',
          borderColor: 'rgba(255, 255, 255, 0.05)'
        }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <img
                alt="Profile Avatar"
                className={`w-20 h-20 rounded-full border-2 object-cover ${!uploading && 'cursor-pointer'}`}
                src={avatarUrl}
                onClick={handleAvatarClick}
                style={{ 
                  borderColor: 'rgba(249, 245, 6, 0.3)',
                  opacity: uploading ? 0.5 : 1 
                }}
              />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-2 rounded-full flex items-center justify-center" style={{
                backgroundColor: '#f9f506',
                borderColor: '#121e18'
              }}>
                <span className="material-symbols-outlined text-[12px] text-black">check</span>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{displayName}</h2>
              <p className="text-sm text-gray-400 font-mono">{displayEmail}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 rounded-2xl border text-white font-semibold transition-colors hover:bg-white/5"
            style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            Sign Out
          </button>
        </div>

        <div className="space-y-3">
          <button className="w-full border p-4 rounded-2xl flex items-center justify-between group transition-all hover:bg-white/5" style={{
            backgroundColor: '#121e18',
            borderColor: 'rgba(255, 255, 255, 0.05)'
          }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                backgroundColor: 'rgba(249, 245, 6, 0.1)',
                color: '#f9f506'
              }}>
                <span className="material-symbols-outlined">notifications</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-white">Notifications</p>
                <p className="text-xs text-gray-500">Email, Push</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-gray-500">chevron_right</span>
          </button>

          <button className="w-full border p-4 rounded-2xl flex items-center justify-between group transition-all hover:bg-white/5" style={{
            backgroundColor: '#121e18',
            borderColor: 'rgba(255, 255, 255, 0.05)'
          }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                backgroundColor: 'rgba(249, 245, 6, 0.1)',
                color: '#f9f506'
              }}>
                <span className="material-symbols-outlined">grid_view</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-white">Integrations</p>
                <p className="text-xs text-gray-500">Manage connections</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-gray-500">chevron_right</span>
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

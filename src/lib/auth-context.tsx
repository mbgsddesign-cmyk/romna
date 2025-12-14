'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { ProfileWithSubscription, UsageTracking, PlanLimits, UserIntegration } from './database.types';
import { LocalStorage, LocalUser } from './local-storage';

export interface Profile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  avatar_url: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean;
}

interface AuthContextType {
  user: User | null; // Supabase user
  localUser: LocalUser | null; // Local-only user
  userId: string | null; // Unified ID (Supabase OR Local)
  isLocal: boolean;
  profile: ProfileWithSubscription | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_LOADING_TIME = 8000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<ProfileWithSubscription | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingRef = useRef(false);

  // Initialize Local User immediately
  useEffect(() => {
    const lUser = LocalStorage.initUser();
    setLocalUser(lUser);
  }, []);

  const getCurrentMonthYear = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const repairUserData = useCallback(async (accessToken: string): Promise<ProfileWithSubscription | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('/api/auth/repair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Repair API failed:', response.status);
        return null;
      }

      const data = await response.json();

      if (data.success && data.profile) {
        let planLimits: PlanLimits | null = null;
        if (data.subscription) {
          const { data: limits } = await supabase
            .from('plan_limits')
            .select('*')
            .eq('plan', data.subscription.plan)
            .single();
          planLimits = limits;
        }

        return {
          ...data.profile,
          subscription: data.subscription || undefined,
          usageTracking: data.usage || undefined,
          planLimits: planLimits || undefined,
          integrations: data.integrations || [],
        };
      }
      return null;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Repair request timed out');
      } else {
        console.error('Repair error:', error);
      }
      return null;
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string, userEmail?: string, accessToken?: string): Promise<ProfileWithSubscription | null> => {
    if (fetchingRef.current) return null;
    fetchingRef.current = true;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        console.log('Profile not found, calling repair API...');
        if (accessToken) {
          const repairedProfile = await repairUserData(accessToken);
          if (repairedProfile) {
            setProfile(repairedProfile);
            return repairedProfile;
          }
        }
        return null;
      }

      const [subResult, usageResult, integrationsResult] = await Promise.allSettled([
        supabase.from('subscriptions').select('*').eq('user_id', userId).single(),
        supabase.from('usage_tracking').select('*').eq('user_id', userId).eq('month_year', getCurrentMonthYear()).single(),
        supabase.from('user_integrations').select('*').eq('user_id', userId),
      ]);

      const subData = subResult.status === 'fulfilled' ? subResult.value.data : null;
      let usageData = usageResult.status === 'fulfilled' ? usageResult.value.data : null;
      const integrationsData = integrationsResult.status === 'fulfilled' ? integrationsResult.value.data : [];

      if (!usageData) {
        // Optimistic usage creation
        usageData = {
          user_id: userId,
          month_year: getCurrentMonthYear(),
          ai_tokens_used: 0,
          voice_minutes_used: 0,
          whatsapp_messages_sent: 0,
          emails_sent: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      let planLimitsData: PlanLimits | null = null;
      if (subData) {
        const { data: limits } = await supabase
          .from('plan_limits')
          .select('*')
          .eq('plan', subData.plan)
          .single()
          .then(result => result)
          .catch(() => ({ data: null }));
        planLimitsData = limits;
      }

      const fullProfile: ProfileWithSubscription = {
        ...profileData,
        subscription: subData || undefined,
        usageTracking: usageData as UsageTracking || undefined,
        planLimits: planLimitsData || undefined,
        integrations: (integrationsData as UserIntegration[]) || [],
      };

      setProfile(fullProfile);

      supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', userId)
        .then(() => { })
        .catch(() => { });

      return fullProfile;
    } catch (error) {
      console.error('Fetch profile error:', error);
      return null;
    } finally {
      fetchingRef.current = false;
    }
  }, [repairUserData]);

  const refreshProfile = useCallback(async () => {
    if (user && session) {
      await fetchProfile(user.id, user.email, session.access_token);
    } else if (localUser) {
      // Refresh local profile logic if needed
      const lUser = LocalStorage.getUser();
      setLocalUser(lUser);

      // Robust Mock Profile with Strict Types
      const mockUsage: UsageTracking = {
        id: 'local-usage-id', // Added ID
        user_id: lUser?.id || '',
        month_year: getCurrentMonthYear(),
        ai_tokens_used: 0,
        voice_minutes_used: 0,
        whatsapp_messages_sent: 0,
        emails_sent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockLimits: PlanLimits = {
        id: 'free_limits',
        plan: 'free',
        monthly_ai_tokens: 1000,
        monthly_voice_minutes: 60,
        monthly_whatsapp_messages: 5,
        monthly_emails: 5,
        max_integrations: 0,       // Added
        max_email_accounts: 0,     // Added
        features: [],              // Added
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString() // Added
      };

      setProfile({
        id: lUser?.id || '',
        name: lUser?.name || 'Commander',
        email: 'local@device',
        role: 'USER', // Fixed Case
        status: 'active',
        avatar_url: null,
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_completed: lUser?.onboarding_completed || false,
        subscription: {
          id: 'local-sub-id', // Added
          plan: 'free',
          status: 'active',
          user_id: lUser?.id || '',
          current_period_start: new Date().toISOString(), // Added
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Added
          trial_ends_at: null, // Added
          cancel_at: null,
          canceled_at: null,
          ended_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {}
        },
        integrations: [],
        usageTracking: mockUsage,
        planLimits: mockLimits
      });
    }
  }, [user, session, fetchProfile, localUser]);

  useEffect(() => {
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - forcing complete');
        setLoading(false);
      }
    }, MAX_LOADING_TIME);

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email, session.access_token);
        } else {
          // Fallback to local profile
          refreshProfile();
        }
      } catch (error) {
        console.error('Session error:', error);
      } finally {
        setLoading(false);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email, session.access_token);
      } else {
        // Fallback to Local Profile on logout
        refreshProfile();
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [fetchProfile, refreshProfile]); // Added refreshProfile dependency

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (!error && data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        name: name,
        role: 'USER',
        status: 'active',
        onboarding_completed: false,
      });

      await supabase.from('subscriptions').insert({
        user_id: data.user.id,
        plan: 'free',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await supabase.from('usage_tracking').insert({
        user_id: data.user.id,
        month_year: getCurrentMonthYear(),
        ai_tokens_used: 0,
        voice_minutes_used: 0,
        whatsapp_messages_sent: 0,
        emails_sent: 0,
      });

      await supabase.from('audit_logs').insert({
        user_id: data.user.id,
        action: 'user_signup',
        entity_type: 'user',
        entity_id: data.user.id,
      });
    }

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      await supabase.from('audit_logs').insert({
        user_id: data.user.id,
        action: 'user_login',
        entity_type: 'user',
        entity_id: data.user.id,
      });
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'user_logout',
        entity_type: 'user',
        entity_id: user.id,
      });
    }
    await supabase.auth.signOut();
    setProfile(null); // Will trigger refreshProfile via auth state change to load local
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error: error as Error | null };
  };

  const isAdmin = profile?.role?.toLowerCase() === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        localUser,
        userId: user?.id || localUser?.id || null, // Unified ID
        isLocal: !user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        refreshProfile,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
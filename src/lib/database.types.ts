export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'active' | 'banned' | 'suspended';
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';
export type IntegrationType = 'whatsapp' | 'telegram' | 'gmail' | 'notion' | 'google_calendar';

export interface Profile {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIUsage {
  id: string;
  user_id: string;
  action_type: string;
  tokens_used: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  month_year: string;
  ai_tokens_used: number;
  voice_minutes_used: number;
  whatsapp_messages_sent: number;
  emails_sent: number;
  created_at: string;
  updated_at: string;
}

export interface PlanLimits {
  id: string;
  plan: SubscriptionPlan;
  monthly_ai_tokens: number;
  monthly_voice_minutes: number;
  monthly_whatsapp_messages: number;
  monthly_emails: number;
  max_integrations: number;
  max_email_accounts: number;
  features: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface UserIntegration {
  id: string;
  user_id: string;
  type: IntegrationType;
  is_connected: boolean;
  credentials: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface VoiceIntent {
  id: string;
  user_id: string;
  raw_text: string;
  intent_type: string;
  extracted_data: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface ProfileWithSubscription extends Profile {
  subscription?: Subscription;
  usageTracking?: UsageTracking;
  planLimits?: PlanLimits;
  integrations?: UserIntegration[];
}
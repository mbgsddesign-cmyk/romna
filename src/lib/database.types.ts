export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'active' | 'banned' | 'suspended';
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';
export type IntegrationType = 'whatsapp' | 'telegram' | 'gmail' | 'notion' | 'google_calendar';
export type NotificationCategory = 'insights' | 'ai' | 'reminders' | 'general';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type FocusMode = 'deep_work' | 'light_focus' | 'break' | 'meeting';
export type FocusStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type InsightType = 'productivity' | 'energy' | 'patterns' | 'suggestions';

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

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  ai_reason?: string | null;
  is_read: boolean;
  is_batched: boolean;
  action_url: string | null;
  action_label: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
  scheduled_for?: string | null;
}

export interface Insight {
  id: string;
  user_id: string;
  type: InsightType;
  title: string;
  description: string;
  insight_data: Record<string, unknown>;
  source?: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  title: string;
  mode: FocusMode;
  start_time: string;
  end_time: string | null;
  target_duration: number | null;
  actual_duration: number | null;
  status: FocusStatus;
  interruptions: number;
  music_playlist: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithSubscription extends Profile {
  subscription?: Subscription;
  usageTracking?: UsageTracking;
  planLimits?: PlanLimits;
  integrations?: UserIntegration[];
}

export interface UserPreferences {
  id: string;
  user_id: string;
  timezone: string;
  locale: string;
  theme: string;
  notifications_enabled: boolean;
  week_start: string;
  ai_opt_in: boolean;
  plan_tier: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoiceNote {
  id: string;
  user_id: string;
  audio_url: string | null;
  transcription: string | null;
  processed: boolean;
  confidence: number | null;
  intent: string | null;
  created_at: string;
  meta: Record<string, unknown>;
}

export interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface AISession {
  id: string;
  user_id: string;
  context_hash: string | null;
  model: string | null;
  created_at: string;
  meta: Record<string, unknown>;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  is_all_day: boolean;
  created_at: string;
  updated_at: string;
}
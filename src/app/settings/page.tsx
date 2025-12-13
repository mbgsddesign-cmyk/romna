'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore, Theme } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { Locale } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Globe, Palette, Mail, Plus, Star, Trash2, ChevronRight, Info, Plug, LogOut, Shield, CreditCard, Zap, Crown, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RomnaInput } from '@/components/romna';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { SectionHeader, EmptyState } from '@/components/romna';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function SettingsPage() {
  const { t, locale } = useTranslation();
  const { setTheme } = useTheme();
  const { user, profile, signOut, isAdmin, refreshProfile } = useAuth();
  const router = useRouter();
  const {
    locale: currentLocale,
    theme,
    emailAccounts,
    integrations,
    setLocale,
    setTheme: setStoreTheme,
    addEmailAccount,
    removeEmailAccount,
    setPrimaryEmail,
  } = useAppStore();
  const [isAddEmailOpen, setIsAddEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState({ email: '', displayName: '' });
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [aiOptIn, setAiOptIn] = useState(false);
  const [updatingOptIn, setUpdatingOptIn] = useState(false);

  useEffect(() => {
    refreshProfile();
    fetchAIOptInStatus();
  }, [refreshProfile]);

  const fetchAIOptInStatus = async () => {
    if (!user?.id) return;
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('user_preferences')
        .select('ai_opt_in')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setAiOptIn(data.ai_opt_in ?? false);
      }
    } catch (error) {
      console.error('Failed to fetch AI opt-in status:', error);
    }
  };

  const handleAIOptInToggle = async (checked: boolean) => {
    if (!user?.id) return;
    setUpdatingOptIn(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ai_opt_in: checked,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setAiOptIn(checked);
      toast.success(checked ? 'AutoGLM enabled' : 'AutoGLM disabled');
    } catch (error) {
      console.error('Failed to update AI opt-in:', error);
      toast.error('Failed to update settings');
    } finally {
      setUpdatingOptIn(false);
    }
  };

  const connectedCount = profile?.integrations?.filter(i => i.is_connected).length || integrations.filter(i => i.isConnected).length;

  const gmailAccounts = profile?.integrations?.filter(i => i.type === 'gmail' && i.is_connected) || [];

  const handleLanguageChange = (value: Locale) => {
    setLocale(value);
    toast.success(value === 'ar' ? 'تم تغيير اللغة' : 'Language changed');
  };

  const handleThemeChange = (value: Theme) => {
    setStoreTheme(value);
    setTheme(value);
  };

  const handleAddEmail = () => {
    if (newEmail.email.trim()) {
      addEmailAccount({
        provider: 'google_workspace',
        emailAddress: newEmail.email,
        displayName: newEmail.displayName || newEmail.email.split('@')[0],
        isPrimary: emailAccounts.length === 0,
      });
      setNewEmail({ email: '', displayName: '' });
      setIsAddEmailOpen(false);
      toast.success(t('addAccount') + ' - ' + t('success'));
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const getPlanBadgeColor = (plan?: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-500/10 text-purple-500';
      case 'pro': return 'bg-accent/10 text-accent';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPlanIcon = (plan?: string) => {
    switch (plan) {
      case 'enterprise': return Crown;
      case 'pro': return Sparkles;
      default: return Zap;
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const PlanIcon = getPlanIcon(profile?.subscription?.plan);

  return (
    <PageWrapper className="px-5">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.header variants={itemVariants} className="pt-6 pb-6">
          <h1 className="text-[32px] font-extrabold text-foreground">{t('settings')}</h1>
        </motion.header>

        <motion.section variants={itemVariants} className="mb-6">
          <h2 className="text-[14px] font-bold text-accent uppercase tracking-wider mb-3">{t('account')}</h2>
          <div className="glass-card p-0 overflow-hidden divide-y divide-border/30">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[18px] bg-gradient-to-br from-primary to-accent flex items-center justify-center neon-glow">
                  <span className="text-xl font-bold text-white">
                    {profile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-[16px] text-foreground">{profile?.name || 'User'}</h3>
                    {isAdmin && (
                      <Badge className="bg-primary/20 text-primary text-[11px] border-0">
                        <Shield className="w-3 h-3 mr-1" />
                        {t('admin')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[14px] text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={cn("text-[11px] border-0 neon-glow", getPlanBadgeColor(profile?.subscription?.plan))}>
                      <PlanIcon className="w-3 h-3 mr-1" />
                      {(profile?.subscription?.plan || 'free').toUpperCase()} {t('plan')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {profile?.usageTracking && profile?.planLimits && (
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">{t('aiTokens')}</span>
                  <span className="font-semibold text-foreground">
                    {profile.usageTracking.ai_tokens_used.toLocaleString()} / {profile.planLimits.monthly_ai_tokens === -1 ? '∞' : profile.planLimits.monthly_ai_tokens.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(profile.usageTracking.ai_tokens_used, profile.planLimits.monthly_ai_tokens)} 
                  className="h-2"
                />
                {profile.subscription?.current_period_end && (
                  <p className="text-[12px] text-accent">
                    {t('resets')}: {new Date(profile.subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {isAdmin && (
              <Link href="/admin">
                <SettingRow
                  icon={Shield}
                  iconBg="bg-primary/20"
                  iconColor="text-primary"
                  title={t('adminDashboard')}
                  description="Manage users and system"
                  action={<ChevronRight className="w-5 h-5 text-muted-foreground rtl:rotate-180" />}
                />
              </Link>
            )}
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="mb-6">
          <h2 className="text-[14px] font-bold text-accent uppercase tracking-wider mb-3">{t('integrations')}</h2>
          <Link href="/settings/integrations">
            <div className="glass-card-hover glass-card p-0 overflow-hidden cursor-pointer">
              <SettingRow
                icon={Plug}
                iconBg="bg-accent/20"
                iconColor="text-accent"
                title={t('integrations')}
                description={connectedCount > 0 ? `${connectedCount} ${t('servicesConnected')}` : t('connectServices')}
                action={<ChevronRight className="w-5 h-5 text-muted-foreground rtl:rotate-180" />}
              />
            </div>
          </Link>
        </motion.section>

        <motion.section variants={itemVariants} className="mb-6">
          <h2 className="text-[14px] font-bold text-accent uppercase tracking-wider mb-3">{t('subscriptions')}</h2>
          <Link href="/settings/billing">
            <div className="glass-card-hover glass-card p-0 overflow-hidden cursor-pointer">
              <SettingRow
                icon={CreditCard}
                iconBg="bg-accent/20"
                iconColor="text-accent"
                title={t('billingPlans')}
                description={`${t('current')}: ${(profile?.subscription?.plan || 'free').charAt(0).toUpperCase() + (profile?.subscription?.plan || 'free').slice(1)} ${t('plan')}`}
                action={<ChevronRight className="w-5 h-5 text-muted-foreground rtl:rotate-180" />}
              />
            </div>
          </Link>
        </motion.section>

        <motion.section variants={itemVariants} className="mb-6">
          <h2 className="text-[14px] font-bold text-accent uppercase tracking-wider mb-3">{t('preferences')}</h2>
          <div className="glass-card p-0 overflow-hidden divide-y divide-border/30">
            <SettingRow
              icon={Globe}
              iconBg="bg-accent/20"
              iconColor="text-accent"
              title={t('language')}
              description={currentLocale === 'ar' ? t('arabic') : t('english')}
              action={
                <Select value={currentLocale} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-28 h-9 rounded-[12px] border-0 bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t('english')}</SelectItem>
                    <SelectItem value="ar">{t('arabic')}</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
            <SettingRow
              icon={Palette}
              iconBg="bg-[#F3C96B]/20"
              iconColor="text-[#F3C96B]"
              title={t('theme')}
              description={theme === 'light' ? t('light') : theme === 'dark' ? t('dark') : t('system')}
              action={
                <Select value={theme} onValueChange={handleThemeChange}>
                  <SelectTrigger className="w-28 h-9 rounded-[12px] border-0 bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t('light')}</SelectItem>
                    <SelectItem value="dark">{t('dark')}</SelectItem>
                    <SelectItem value="system">{t('system')}</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="mb-6">
          <h2 className="text-[14px] font-bold text-accent uppercase tracking-wider mb-3">AutoGLM</h2>
          <div className="glass-card p-0 overflow-hidden">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 mr-4">
                <div className="w-12 h-12 rounded-[16px] bg-accent/20 flex items-center justify-center neon-glow">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-foreground mb-1">Enable AutoGLM</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Let AI generate daily plans, suggest actions, and provide intelligent recommendations.
                  </p>
                </div>
              </div>
              <Switch
                checked={aiOptIn}
                onCheckedChange={handleAIOptInToggle}
                disabled={updatingOptIn}
              />
            </div>
            <div className="px-5 pb-5 pt-0">
              <div className="rounded-[14px] bg-muted/30 p-4">
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Privacy First:</strong> AutoGLM runs in the background to help organize your day. 
                  All suggestions require your approval before any action is taken. 
                  You can disable this anytime. No data is shared with third parties.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="romna-section-title">{t('emailAccounts')}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddEmailOpen(true)}
              className="text-accent font-medium h-8 px-3"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('addAccount')}
            </Button>
          </div>

          {gmailAccounts.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs text-muted-foreground mb-2">{t('connectedGmailAccounts')}</p>
              {gmailAccounts.map((account) => (
                <Card key={account.id} className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{(account.metadata as { email?: string })?.email || 'Gmail Account'}</p>
                    <p className="text-xs text-muted-foreground">{t('connectedViaOAuth')}</p>
                  </div>
                  <Badge variant="outline" className="text-xs text-green-600">{t('connected')}</Badge>
                </Card>
              ))}
            </div>
          )}

          {emailAccounts.length > 0 ? (
            <div className="space-y-2">
              {emailAccounts.map((account) => (
                <motion.div
                  key={account.id}
                  layout
                >
                  <Card className={cn(
                    'p-3 flex items-center justify-between',
                    account.isPrimary && 'ring-2 ring-accent/30'
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        account.isPrimary ? "bg-accent/10" : "bg-muted"
                      )}>
                        {account.isPrimary ? (
                          <Star className="w-5 h-5 text-accent fill-accent" />
                        ) : (
                          <Mail className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{account.displayName}</p>
                        <p className="text-xs text-muted-foreground">{account.emailAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!account.isPrimary && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPrimaryEmail(account.id)}
                          className="text-xs h-8 text-accent"
                        >
                          {t('setPrimary')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeEmailAccount(account.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : gmailAccounts.length === 0 ? (
            <EmptyState message={t('noEmailAccounts')} icon={Mail} />
          ) : null}
        </motion.section>

        <motion.section variants={itemVariants} className="mb-6">
          <h2 className="text-[14px] font-bold text-accent uppercase tracking-wider mb-3">{t('aboutRomna')}</h2>
          <a href="https://romnaai.netlify.app/" target="_blank" rel="noopener noreferrer">
            <div className="glass-card-hover glass-card p-0 overflow-hidden cursor-pointer">
              <SettingRow
                icon={Info}
                iconBg="bg-muted"
                iconColor="text-muted-foreground"
                title={t('aboutRomna')}
                description={t('versionInfo')}
                action={<ChevronRight className="w-5 h-5 text-muted-foreground rtl:rotate-180" />}
              />
            </div>
          </a>
        </motion.section>

        {user && (
          <motion.section variants={itemVariants} className="mb-8">
            <Button
              variant="outline"
              className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-[16px] font-semibold"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout')}
            </Button>
          </motion.section>
        )}
      </motion.div>

      <Sheet open={isAddEmailOpen} onOpenChange={setIsAddEmailOpen}>
        <SheetContent side="bottom" className="rounded-t-[22px] pb-8">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-xl font-semibold">{t('addAccount')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <RomnaInput
              type="email"
              placeholder="email@example.com"
              value={newEmail.email}
              onChange={(e) => setNewEmail({ ...newEmail, email: e.target.value })}
            />
            <RomnaInput
              placeholder={locale === 'ar' ? 'الاسم (مثال: العمل)' : 'Display name (e.g., Work)'}
              value={newEmail.displayName}
              onChange={(e) => setNewEmail({ ...newEmail, displayName: e.target.value })}
            />
            <Button onClick={handleAddEmail} className="w-full" size="lg">
              {t('save')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isSubscriptionOpen} onOpenChange={setIsSubscriptionOpen}>
        <SheetContent side="bottom" className="rounded-t-[22px] pb-8 max-h-[80vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-xl font-semibold">{t('manageSubscription')}</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4">
            <Card className={cn(
              "p-4 border-2",
              profile?.subscription?.plan === 'free' ? "border-primary" : "border-border"
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold">{t('free')}</h3>
                </div>
                {profile?.subscription?.plan === 'free' && (
                  <Badge className="bg-primary/10 text-primary">{t('current')}</Badge>
                )}
              </div>
              <p className="text-2xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">{t('perMonth')}</span></p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>• 10,000 {t('tokens')}</li>
                <li>• 30 voice minutes/month</li>
                <li>• 2 {t('integrations')}</li>
              </ul>
            </Card>

            <Card className={cn(
              "p-4 border-2",
              profile?.subscription?.plan === 'pro' ? "border-accent" : "border-border"
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold">{t('pro')}</h3>
                </div>
                {profile?.subscription?.plan === 'pro' && (
                  <Badge className="bg-accent/10 text-accent">{t('current')}</Badge>
                )}
              </div>
              <p className="text-2xl font-bold">$19<span className="text-sm font-normal text-muted-foreground">{t('perMonth')}</span></p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>• 100,000 {t('tokens')}</li>
                <li>• 300 voice minutes/month</li>
                <li>• 5 {t('integrations')}</li>
                <li>• AI Memory & Auto Actions</li>
              </ul>
              {profile?.subscription?.plan !== 'pro' && (
                <Button className="w-full mt-4" variant="default">
                  {t('upgradeToPro')}
                </Button>
              )}
            </Card>

            <Card className={cn(
              "p-4 border-2",
              profile?.subscription?.plan === 'enterprise' ? "border-purple-500" : "border-border"
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold">{t('enterprise')}</h3>
                </div>
                {profile?.subscription?.plan === 'enterprise' && (
                  <Badge className="bg-purple-500/10 text-purple-500">{t('current')}</Badge>
                )}
              </div>
              <p className="text-2xl font-bold">$99<span className="text-sm font-normal text-muted-foreground">{t('perMonth')}</span></p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>• Unlimited {t('tokens')}</li>
                <li>• Unlimited voice minutes</li>
                <li>• Unlimited {t('integrations')}</li>
                <li>• Priority support</li>
              </ul>
              {profile?.subscription?.plan !== 'enterprise' && (
                <Button className="w-full mt-4" variant="outline">
                  {t('contactSales')}
                </Button>
              )}
            </Card>

            {profile?.subscription && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">{t('currentBillingCycle')}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {profile.subscription.current_period_start && (
                    <p>{t('started')}: {new Date(profile.subscription.current_period_start).toLocaleDateString()}</p>
                  )}
                  {profile.subscription.current_period_end && (
                    <p>{t('renews')}: {new Date(profile.subscription.current_period_end).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}

function SettingRow({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="p-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-[16px] flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
          <p className="text-[13px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
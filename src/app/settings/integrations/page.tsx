'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore, IntegrationType } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  Mail, 
  Database, 
  Calendar,
  ChevronLeft,
  Check,
  X,
  Loader2,
  Plus,
  Trash2,
  Star,
  RefreshCw
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface IntegrationCardProps {
  type: IntegrationType;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  isConnected: boolean;
  metadata?: Record<string, unknown>;
  onConnect: () => void;
  onDisconnect: () => void;
  onConfigure: () => void;
}

function IntegrationCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  isConnected,
  onConnect,
  onConfigure,
}: IntegrationCardProps) {
  const { t } = useTranslation();
  
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", iconBg)}>
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{title}</h3>
              {isConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                  <Check className="w-3 h-3" />
                  {t('connected')}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {isConnected ? (
          <Button variant="outline" className="flex-1" onClick={onConfigure}>
            Configure
          </Button>
        ) : (
          <Button variant="teal" className="flex-1" onClick={onConnect}>
            {t('connect')}
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function IntegrationsPage() {
  const { t, locale } = useTranslation();
  const { integrations, addIntegration, updateIntegration, removeIntegration, emailAccounts, addEmailAccount, removeEmailAccount, setPrimaryEmail } = useAppStore();
  
  const [activeSheet, setActiveSheet] = useState<IntegrationType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [whatsappForm, setWhatsappForm] = useState({ phoneId: '', accessToken: '' });
  const [telegramForm, setTelegramForm] = useState({ botToken: '' });
  const [telegramBotInfo, setTelegramBotInfo] = useState<{ name: string; username: string } | null>(null);
  const [newGmailEmail, setNewGmailEmail] = useState('');
  const [notionDatabases, setNotionDatabases] = useState<{ id: string; name: string }[]>([]);
  const [selectedNotionDBs, setSelectedNotionDBs] = useState({ tasks: '', events: '' });
  const [calendarAutoSync, setCalendarAutoSync] = useState(false);

  const getIntegration = (type: IntegrationType) => integrations.find(i => i.type === type);

  const handleConnectWhatsApp = async () => {
    if (!whatsappForm.phoneId || !whatsappForm.accessToken) {
      toast.error('Please fill all fields');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/integrations/whatsapp/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappForm),
      });
      const data = await res.json();
      if (data.success) {
        addIntegration({
          type: 'whatsapp',
          isConnected: true,
          metadata: { ...whatsappForm, phoneNumber: data.phoneNumber },
        });
        toast.success('WhatsApp connected successfully');
        setActiveSheet(null);
      } else {
        toast.error(data.error || 'Failed to validate credentials');
      }
    } catch {
      toast.error('Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateTelegram = async () => {
    if (!telegramForm.botToken) {
      toast.error('Please enter bot token');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/integrations/telegram/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: telegramForm.botToken }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramBotInfo({ name: data.botName, username: data.username });
        addIntegration({
          type: 'telegram',
          isConnected: true,
          metadata: { botToken: telegramForm.botToken, botName: data.botName, username: data.username },
        });
        toast.success('Telegram bot connected');
      } else {
        toast.error(data.error || 'Invalid bot token');
      }
    } catch {
      toast.error('Validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGmail = () => {
    if (!newGmailEmail.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    addEmailAccount({
      provider: 'gmail',
      emailAddress: newGmailEmail,
      displayName: newGmailEmail.split('@')[0],
      isPrimary: emailAccounts.length === 0,
    });
    
    const existing = getIntegration('gmail');
    if (!existing) {
      addIntegration({
        type: 'gmail',
        isConnected: true,
        metadata: { accountCount: 1 },
      });
    } else {
      updateIntegration(existing.id, {
        metadata: { ...existing.metadata, accountCount: emailAccounts.length + 1 },
      });
    }
    setNewGmailEmail('');
    toast.success('Gmail account added');
  };

  const handleConnectNotion = async () => {
    setIsLoading(true);
    try {
      setNotionDatabases([
        { id: 'db1', name: 'My Tasks' },
        { id: 'db2', name: 'Work Events' },
        { id: 'db3', name: 'Personal Calendar' },
      ]);
      addIntegration({
        type: 'notion',
        isConnected: true,
        metadata: {},
      });
      toast.success('Notion connected');
    } catch {
      toast.error('Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotionConfig = () => {
    const existing = getIntegration('notion');
    if (existing) {
      updateIntegration(existing.id, {
        metadata: { ...existing.metadata, ...selectedNotionDBs },
      });
      toast.success('Notion configuration saved');
      setActiveSheet(null);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    setIsLoading(true);
    try {
      addIntegration({
        type: 'google_calendar',
        isConnected: true,
        metadata: { autoSync: calendarAutoSync, lastSynced: new Date().toISOString() },
      });
      toast.success('Google Calendar connected');
    } catch {
      toast.error('Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestMessage = async (type: 'whatsapp' | 'telegram') => {
    setIsLoading(true);
    try {
      const endpoint = type === 'whatsapp' ? '/api/integrations/whatsapp/test' : '/api/integrations/telegram/test';
      const integration = getIntegration(type);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: integration?.metadata }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Test message sent!');
      } else {
        toast.error(data.error || 'Failed to send test message');
      }
    } catch {
      toast.error('Failed to send test message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = (type: IntegrationType) => {
    const integration = getIntegration(type);
    if (integration) {
      removeIntegration(integration.id);
      toast.success('Disconnected successfully');
      setActiveSheet(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <PageWrapper className="px-5">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.header variants={itemVariants} className="pt-6 pb-6 flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon-sm" className="rtl:rotate-180">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold">{t('integrations')}</h1>
            <p className="text-sm text-muted-foreground">{t('connectServices')}</p>
          </div>
        </motion.header>

        <motion.div variants={itemVariants} className="space-y-3">
          <IntegrationCard
            type="whatsapp"
            icon={MessageCircle}
            iconBg="bg-[#25D366]/10"
            iconColor="text-[#25D366]"
            title={t('whatsappBusiness')}
            description={t('whatsappDescription')}
            isConnected={!!getIntegration('whatsapp')?.isConnected}
            metadata={getIntegration('whatsapp')?.metadata}
            onConnect={() => setActiveSheet('whatsapp')}
            onDisconnect={() => handleDisconnect('whatsapp')}
            onConfigure={() => setActiveSheet('whatsapp')}
          />

          <IntegrationCard
            type="telegram"
            icon={Send}
            iconBg="bg-[#0088cc]/10"
            iconColor="text-[#0088cc]"
            title={t('telegramBot')}
            description={t('telegramDescription')}
            isConnected={!!getIntegration('telegram')?.isConnected}
            metadata={getIntegration('telegram')?.metadata}
            onConnect={() => setActiveSheet('telegram')}
            onDisconnect={() => handleDisconnect('telegram')}
            onConfigure={() => setActiveSheet('telegram')}
          />

          <IntegrationCard
            type="gmail"
            icon={Mail}
            iconBg="bg-[#EA4335]/10"
            iconColor="text-[#EA4335]"
            title={t('gmailIntegration')}
            description={t('gmailDescription')}
            isConnected={emailAccounts.length > 0}
            metadata={{ accountCount: emailAccounts.length }}
            onConnect={() => setActiveSheet('gmail')}
            onDisconnect={() => {}}
            onConfigure={() => setActiveSheet('gmail')}
          />

          <IntegrationCard
            type="notion"
            icon={Database}
            iconBg="bg-[#000000]/10 dark:bg-white/10"
            iconColor="text-foreground"
            title={t('notionIntegration')}
            description={t('notionDescription')}
            isConnected={!!getIntegration('notion')?.isConnected}
            metadata={getIntegration('notion')?.metadata}
            onConnect={() => setActiveSheet('notion')}
            onDisconnect={() => handleDisconnect('notion')}
            onConfigure={() => setActiveSheet('notion')}
          />

          <IntegrationCard
            type="google_calendar"
            icon={Calendar}
            iconBg="bg-[#4285F4]/10"
            iconColor="text-[#4285F4]"
            title={t('googleCalendar')}
            description={t('googleCalendarDescription')}
            isConnected={!!getIntegration('google_calendar')?.isConnected}
            metadata={getIntegration('google_calendar')?.metadata}
            onConnect={() => setActiveSheet('google_calendar')}
            onDisconnect={() => handleDisconnect('google_calendar')}
            onConfigure={() => setActiveSheet('google_calendar')}
          />
        </motion.div>
      </motion.div>

      <Sheet open={activeSheet === 'whatsapp'} onOpenChange={() => setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-[22px] pb-8 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
              </div>
              {t('whatsappBusiness')}
            </SheetTitle>
          </SheetHeader>
          
          {getIntegration('whatsapp')?.isConnected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">{t('connected')}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('phoneNumber')}: {String(getIntegration('whatsapp')?.metadata?.phoneNumber || 'N/A')}
                </p>
              </div>
              <Button onClick={() => handleSendTestMessage('whatsapp')} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('sendTestMessage')}
              </Button>
              <Button variant="destructive" onClick={() => handleDisconnect('whatsapp')} className="w-full">
                {t('disconnect')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('whatsappPhoneId')}</label>
                <Input
                  placeholder="Enter Phone Number ID"
                  value={whatsappForm.phoneId}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneId: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t('whatsappAccessToken')}</label>
                <Input
                  type="password"
                  placeholder="Enter Access Token"
                  value={whatsappForm.accessToken}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, accessToken: e.target.value })}
                />
              </div>
              <Button onClick={handleConnectWhatsApp} className="w-full" variant="teal" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('connect')}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={activeSheet === 'telegram'} onOpenChange={() => setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-[22px] pb-8 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#0088cc]/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-[#0088cc]" />
              </div>
              {t('telegramBot')}
            </SheetTitle>
          </SheetHeader>
          
          {getIntegration('telegram')?.isConnected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">{t('connected')}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('botName')}: {String(getIntegration('telegram')?.metadata?.botName || telegramBotInfo?.name || 'N/A')}
                </p>
              </div>
              <Button onClick={() => handleSendTestMessage('telegram')} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('sendTestMessage')}
              </Button>
              <Button variant="destructive" onClick={() => handleDisconnect('telegram')} className="w-full">
                {t('disconnect')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('botToken')}</label>
                <Input
                  type="password"
                  placeholder={t('enterBotToken')}
                  value={telegramForm.botToken}
                  onChange={(e) => setTelegramForm({ botToken: e.target.value })}
                />
              </div>
              <Button onClick={handleValidateTelegram} className="w-full" variant="teal" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('validateToken')}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={activeSheet === 'gmail'} onOpenChange={() => setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-[22px] pb-8 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#EA4335]/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#EA4335]" />
              </div>
              {t('gmailIntegration')}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4">
            <AnimatePresence>
              {emailAccounts.map((account) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={cn(
                    "p-3 rounded-xl border flex items-center justify-between",
                    account.isPrimary && "border-accent bg-accent/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {account.isPrimary && <Star className="w-4 h-4 text-accent fill-accent" />}
                    <div>
                      <p className="text-sm font-medium">{account.displayName}</p>
                      <p className="text-xs text-muted-foreground">{account.emailAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!account.isPrimary && (
                      <Button variant="ghost" size="sm" onClick={() => setPrimaryEmail(account.id)} className="text-xs">
                        {t('setAsDefault')}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" onClick={() => removeEmailAccount(account.id)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@gmail.com"
                value={newGmailEmail}
                onChange={(e) => setNewGmailEmail(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddGmail} variant="teal" size="icon">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={activeSheet === 'notion'} onOpenChange={() => setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-[22px] pb-8 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-foreground/10 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              {t('notionIntegration')}
            </SheetTitle>
          </SheetHeader>
          
          {getIntegration('notion')?.isConnected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">{t('connected')}</span>
                </div>
              </div>
              
              {notionDatabases.length > 0 && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('tasksDatabase')}</label>
                    <select 
                      className="w-full p-3 rounded-xl border bg-background"
                      value={selectedNotionDBs.tasks}
                      onChange={(e) => setSelectedNotionDBs({ ...selectedNotionDBs, tasks: e.target.value })}
                    >
                      <option value="">{t('selectDatabase')}</option>
                      {notionDatabases.map(db => (
                        <option key={db.id} value={db.id}>{db.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('eventsDatabase')}</label>
                    <select 
                      className="w-full p-3 rounded-xl border bg-background"
                      value={selectedNotionDBs.events}
                      onChange={(e) => setSelectedNotionDBs({ ...selectedNotionDBs, events: e.target.value })}
                    >
                      <option value="">{t('selectDatabase')}</option>
                      {notionDatabases.map(db => (
                        <option key={db.id} value={db.id}>{db.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <Button onClick={handleSaveNotionConfig} className="w-full" variant="teal">
                    {t('save')}
                  </Button>
                </>
              )}
              
              <Button variant="destructive" onClick={() => handleDisconnect('notion')} className="w-full">
                {t('disconnect')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {locale === 'ar' 
                  ? 'اربط حسابك في نوشن لمزامنة المهام والأحداث'
                  : 'Connect your Notion account to sync tasks and events'}
              </p>
              <Button onClick={handleConnectNotion} className="w-full" variant="teal" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('connect')}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={activeSheet === 'google_calendar'} onOpenChange={() => setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-[22px] pb-8 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#4285F4]/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#4285F4]" />
              </div>
              {t('googleCalendar')}
            </SheetTitle>
          </SheetHeader>
          
          {getIntegration('google_calendar')?.isConnected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">{t('connected')}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('lastSynced')}: {new Date(String(getIntegration('google_calendar')?.metadata?.lastSynced)).toLocaleString(locale)}
                </p>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl border">
                <div>
                  <p className="font-medium">{t('autoSync')}</p>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'ar' ? 'مزامنة تلقائية للأحداث' : 'Automatically sync events'}
                  </p>
                </div>
                <Switch 
                  checked={calendarAutoSync} 
                  onCheckedChange={setCalendarAutoSync}
                />
              </div>
              
              <Button className="w-full" variant="outline" disabled={isLoading}>
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                {t('syncNow')}
              </Button>
              
              <Button variant="destructive" onClick={() => handleDisconnect('google_calendar')} className="w-full">
                {t('disconnect')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {locale === 'ar' 
                  ? 'اربط تقويم جوجل لمزامنة الأحداث'
                  : 'Connect Google Calendar to sync your events'}
              </p>
              <div className="flex items-center justify-between p-4 rounded-xl border">
                <div>
                  <p className="font-medium">{t('autoSync')}</p>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'ar' ? 'تفعيل المزامنة التلقائية' : 'Enable automatic sync'}
                  </p>
                </div>
                <Switch 
                  checked={calendarAutoSync} 
                  onCheckedChange={setCalendarAutoSync}
                />
              </div>
              <Button onClick={handleConnectGoogleCalendar} className="w-full" variant="teal" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('connect')}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}

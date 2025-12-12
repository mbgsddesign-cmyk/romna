'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { CheckSquare, Calendar, Mail, Inbox, MessageCircle, Send, Database, Plug, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { format, isToday } from 'date-fns';
import { MicButton, SectionHeader, EmptyState, PriorityBadge } from '@/components/romna';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { t, locale } = useTranslation();
  const { tasks, events, voiceNotes, integrations } = useAppStore();

  const todaysTasks = tasks
    .filter((task) => task.status === 'pending' && task.dueDate && isToday(new Date(task.dueDate)))
    .slice(0, 3);

  const todaysEvents = events
    .filter((event) => isToday(new Date(event.date)))
    .slice(0, 3);

  const lastVoiceNote = voiceNotes[0];
  const connectedCount = integrations.filter(i => i.isConnected).length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
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
        className="mobile-container"
      >
        <motion.header variants={itemVariants} className="pt-8 pb-6 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-16 h-16 mx-auto mb-4 rounded-[20px] bg-gradient-to-br from-primary to-accent flex items-center justify-center logo-glow"
          >
            <span className="text-2xl font-bold text-white">R</span>
          </motion.div>
          <h1 className="text-[28px] font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('appName')}
          </h1>
          <p className="text-muted-foreground mt-1 text-[14px]">
            {locale === 'ar' ? 'تحدث معي لإنشاء مهام وأحداث' : 'Talk to me to create tasks & events'}
          </p>
        </motion.header>

        <motion.div variants={itemVariants} className="flex justify-center mb-10">
          <Link href="/voice">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl scale-150" />
              <MicButton size="hero" />
            </div>
          </Link>
        </motion.div>

        {connectedCount > 0 && (
          <motion.section variants={itemVariants} className="mb-6">
            <Link href="/settings/integrations">
              <Card className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-accent/20 hover:border-accent/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[14px] bg-accent/10 flex items-center justify-center">
                      <Plug className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold">{t('integrationStatus')}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {connectedCount} {t('servicesConnected')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {integrations.filter(i => i.isConnected).slice(0, 4).map((int, index) => (
                      <div 
                        key={`${int.id}-${index}`}
                        className="w-7 h-7 rounded-full bg-card border-2 border-background flex items-center justify-center shadow-sm"
                      >
                        {int.type === 'whatsapp' && <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />}
                        {int.type === 'telegram' && <Send className="w-3.5 h-3.5 text-[#0088cc]" />}
                        {int.type === 'gmail' && <Mail className="w-3.5 h-3.5 text-[#EA4335]" />}
                        {int.type === 'notion' && <Database className="w-3.5 h-3.5" />}
                        {int.type === 'google_calendar' && <Calendar className="w-3.5 h-3.5 text-[#4285F4]" />}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </Link>
          </motion.section>
        )}

        <motion.section variants={itemVariants} className="mb-8">
          <SectionHeader title={t('quickActions')} />
          <div className="grid grid-cols-3 gap-3">
            <QuickActionCard href="/tasks?action=new" icon={CheckSquare} label={t('addTask')} color="primary" />
            <QuickActionCard href="/calendar?action=new" icon={Calendar} label={t('addEvent')} color="teal" />
            <QuickActionCard href="/voice?action=email" icon={Mail} label={t('sendEmail')} color="gold" />
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="mb-6">
          <SectionHeader title={t('todaysTasks')} viewAllHref="/tasks" />
          {todaysTasks.length > 0 ? (
            <div className="space-y-2.5">
              {todaysTasks.map((task, index) => (
                <TaskCard key={`${task.id}-${index}`} title={task.title} priority={task.priority as 'high' | 'medium' | 'low'} />
              ))}
            </div>
          ) : (
            <EmptyState 
              message={locale === 'ar' ? 'لا مهام لليوم' : 'No tasks for today'} 
              icon={Inbox} 
            />
          )}
        </motion.section>

        <motion.section variants={itemVariants} className="mb-6">
          <SectionHeader title={t('todaysEvents')} viewAllHref="/calendar" />
          {todaysEvents.length > 0 ? (
            <div className="space-y-2.5">
              {todaysEvents.map((event, index) => (
                <EventCard key={`${event.id}-${index}`} title={event.title} time={format(new Date(event.date), 'h:mm a')} />
              ))}
            </div>
          ) : (
            <EmptyState 
              message={locale === 'ar' ? 'لا أحداث لليوم' : 'No events for today'} 
              icon={Calendar} 
            />
          )}
        </motion.section>

        {lastVoiceNote && (
          <motion.section variants={itemVariants} className="mb-6">
            <SectionHeader title={t('lastVoiceNote')} viewAllHref="/voice" />
            <Card className="p-4 border-border/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] line-clamp-2">{lastVoiceNote.transcript}</p>
                  <p className="text-[12px] text-muted-foreground mt-1.5">
                    {format(new Date(lastVoiceNote.createdAt), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            </Card>
          </motion.section>
        )}
      </motion.div>
    </PageWrapper>
  );
}

function QuickActionCard({ 
  href, 
  icon: Icon, 
  label, 
  color 
}: { 
  href: string; 
  icon: React.ElementType; 
  label: string;
  color: 'primary' | 'teal' | 'gold';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary dark:bg-primary/20',
    teal: 'bg-accent/10 text-accent dark:bg-accent/20',
    gold: 'bg-[#F3C96B]/15 text-[#C9A550] dark:text-[#F3C96B]',
  };

  return (
    <Link href={href}>
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="mobile-card flex flex-col items-center gap-3 p-4 hover:shadow-md transition-all duration-200"
      >
        <div className={cn("p-3 rounded-[14px]", colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[12px] font-medium text-center leading-tight">{label}</span>
      </motion.div>
    </Link>
  );
}

function TaskCard({ title, priority }: { title: string; priority: 'high' | 'medium' | 'low' }) {
  return (
    <Card className="p-3.5 flex items-center gap-3 border-border/50 hover:border-border transition-colors">
      <PriorityBadge priority={priority} variant="dot" />
      <span className="text-[14px] font-medium flex-1 truncate">{title}</span>
    </Card>
  );
}

function EventCard({ title, time }: { title: string; time: string }) {
  return (
    <Card className="p-3.5 flex items-center justify-between border-border/50 hover:border-border transition-colors">
      <span className="text-[14px] font-medium truncate flex-1">{title}</span>
      <span className="text-[12px] text-accent font-semibold ml-3 bg-accent/10 px-2.5 py-1 rounded-full">{time}</span>
    </Card>
  );
}
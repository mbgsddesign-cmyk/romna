'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore, Event as AppEvent } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MapPin, Trash2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  parseISO,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SectionHeader, EmptyState } from '@/components/romna';
import { Card } from '@/components/ui/card';

function CalendarContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { events, addEvent, deleteEvent } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '' });
  const [view, setView] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsSheetOpen(true);
    }
  }, [searchParams]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const todaysEvents = events.filter((event) =>
    isSameDay(parseISO(event.date), selectedDate)
  );

  const handleAddEvent = () => {
    if (newEvent.title.trim() && newEvent.date) {
      addEvent({
        title: newEvent.title,
        date: newEvent.date,
        location: newEvent.location,
      });
      setNewEvent({ title: '', date: '', location: '' });
      setIsSheetOpen(false);
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
        <motion.header variants={itemVariants} className="pt-6 pb-4">
          <h1 className="text-2xl font-extrabold">{t('calendar')}</h1>
        </motion.header>

        <motion.div variants={itemVariants}>
          <Tabs value={view} onValueChange={(v) => setView(v as 'daily' | 'weekly')} className="mb-4">
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-[14px] p-1 bg-muted">
              <TabsTrigger value="daily" className="rounded-[12px] data-[state=active]:bg-card data-[state=active]:shadow-sm">{t('daily')}</TabsTrigger>
              <TabsTrigger value="weekly" className="rounded-[12px] data-[state=active]:bg-card data-[state=active]:shadow-sm">{t('weekly')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        <motion.section variants={itemVariants} className="mb-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setWeekStart(subWeeks(weekStart, 1))}
                className="rounded-xl"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </Button>
              <span className="text-sm font-semibold">
                {format(weekStart, 'MMMM yyyy')}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                className="rounded-xl"
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const hasEvents = events.some((e) => isSameDay(parseISO(e.date), day));

                return (
                  <motion.button
                    key={day.toISOString()}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-200',
                      isSelected 
                        ? 'bg-gradient-to-br from-primary to-accent text-white shadow-md' 
                        : 'hover:bg-muted'
                    )}
                  >
                    <span className={cn(
                      "text-[10px] uppercase font-medium",
                      isSelected ? "text-white/80" : "text-muted-foreground"
                    )}>
                      {format(day, 'EEE')}
                    </span>
                    <span className={cn(
                      'text-lg font-semibold',
                      isToday && !isSelected && 'text-accent',
                      isSelected && 'text-white'
                    )}>
                      {format(day, 'd')}
                    </span>
                    {hasEvents && !isSelected && (
                      <div className="w-1.5 h-1.5 bg-accent rounded-full mt-0.5" />
                    )}
                    {hasEvents && isSelected && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full mt-0.5" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </Card>
        </motion.section>

        <motion.section variants={itemVariants} className="mb-6">
          <SectionHeader title={format(selectedDate, 'EEEE, MMMM d')} />
          {todaysEvents.length > 0 ? (
            <EventList events={todaysEvents} onDelete={deleteEvent} />
          ) : (
            <EmptyState message={t('noEvents')} icon={CalendarIcon} />
          )}
        </motion.section>
      </motion.div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsSheetOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-br from-accent to-accent/80 rounded-2xl flex items-center justify-center shadow-lg romna-glow-teal"
      >
        <Plus className="w-6 h-6 text-accent-foreground" />
      </motion.button>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[22px] pb-8">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-xl font-semibold">{t('newEvent')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <Input
              placeholder={t('title')}
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            />
            <Input
              type="datetime-local"
              value={newEvent.date}
              onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
            />
            <Input
              placeholder={t('location')}
              value={newEvent.location}
              onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
            />
            <Button onClick={handleAddEvent} className="w-full" size="lg" variant="teal">
              {t('save')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<PageWrapper className="px-5"><div className="pt-6"><div className="h-8 w-24 bg-muted rounded animate-pulse" /></div></PageWrapper>}>
      <CalendarContent />
    </Suspense>
  );
}

function EventList({
  events,
  onDelete,
}: {
  events: AppEvent[];
  onDelete: (id: string) => void;
}) {
  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-2">
        {events.map((event) => (
          <motion.div
            key={event.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, x: -100 }}
          >
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{event.title}</p>
                  <p className="text-xs text-accent font-medium mt-1">
                    {format(parseISO(event.date), 'h:mm a')}
                  </p>
                  {event.location && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onDelete(event.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}

'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { useAppStore, Event as AppEvent } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'framer-motion';
import { 
  Plus, 
  MapPin, 
  ChevronDown,
  Calendar as CalendarIcon, 
  Sparkles, 
  Search,
  Sun,
  Moon,
  CloudSun,
  Check
} from 'lucide-react';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  parseISO,
  getHours,
  isToday
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

function CalendarContent() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const { events, addEvent, deleteEvent } = useAppStore();
  const { user, profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]); // Mon start
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '' });

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsSheetOpen(true);
    }
  }, [searchParams]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const todaysEvents = useMemo(() => {
    return events.filter((event) =>
      isSameDay(parseISO(event.date), selectedDate)
    ).sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [events, selectedDate]);

  const { morningEvents, afternoonEvents, eveningEvents } = useMemo(() => {
    const morning: AppEvent[] = [];
    const afternoon: AppEvent[] = [];
    const evening: AppEvent[] = [];

    todaysEvents.forEach(event => {
      const hour = getHours(parseISO(event.date));
      if (hour < 12) morning.push(event);
      else if (hour < 18) afternoon.push(event);
      else evening.push(event);
    });

    return { morningEvents: morning, afternoonEvents: afternoon, eveningEvents: evening };
  }, [todaysEvents]);

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

  return (
    <PageWrapper className="pb-24">
      {/* Top App Bar */}
      <header className="flex items-center justify-between p-5 pt-6 bg-transparent sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold leading-tight tracking-tight">
            {format(selectedDate, 'MMMM')}
          </h2>
          <ChevronDown className="text-primary w-6 h-6 cursor-pointer" />
        </div>
        <div className="flex items-center justify-end gap-3">
          <button className="flex items-center justify-center size-10 rounded-full bg-card border border-border/50 text-foreground hover:bg-accent/10 transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <button className="relative overflow-hidden size-10 rounded-full bg-card border border-border/50">
             {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                  alt="Profile" 
                  className="h-full w-full object-cover" 
                  src={profile?.avatar_url || user?.user_metadata?.avatar_url} 
                />
              ) : (
                <div className="h-full w-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                  {profile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
              )}
          </button>
        </div>
      </header>

      <motion.div
        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
      >
        {/* Week Strip */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="w-full px-5 mb-6">
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 -mx-5 px-5">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "group flex flex-col items-center justify-between min-w-[64px] h-[96px] p-2 rounded-full transition-all active:scale-95",
                    isSelected 
                      ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(48,232,122,0.3)]" 
                      : "bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "text-sm font-medium mt-1",
                    isSelected ? "font-bold opacity-80" : ""
                  )}>
                    {format(day, 'EEE')}
                  </span>
                  <div className={cn(
                    "flex items-center justify-center size-10 rounded-full font-bold text-lg mb-1",
                    isSelected ? "bg-background text-foreground" : "group-hover:bg-accent/10"
                  )}>
                    {format(day, 'd')}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* AI Insight Banner */}
        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="px-5 mb-8">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-background p-5 shadow-lg">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-foreground text-base font-bold leading-tight">Morning Insight</p>
                  <p className="text-muted-foreground text-sm font-normal leading-normal max-w-[260px]">
                    You have a light morning schedule. Want to block out focus time?
                  </p>
                </div>
              </div>
              <button className="mt-2 sm:mt-0 flex cursor-pointer items-center justify-center rounded-full h-10 px-6 bg-primary text-primary-foreground text-sm font-bold leading-normal hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                Add Focus Time
              </button>
            </div>
          </div>
        </motion.div>

        {/* Timeline Content */}
        <div className="flex flex-col w-full space-y-6">
          {/* Morning Section */}
          <TimelineSection 
            title="Morning" 
            icon={Sun} 
            iconColor="text-yellow-500" 
            events={morningEvents} 
            onDelete={deleteEvent}
          />

          {/* Afternoon Section */}
          <TimelineSection 
            title="Afternoon" 
            icon={CloudSun} 
            iconColor="text-orange-500" 
            events={afternoonEvents} 
            onDelete={deleteEvent}
          />

          {/* Evening Section */}
          <TimelineSection 
            title="Evening" 
            icon={Moon} 
            iconColor="text-indigo-400" 
            events={eveningEvents} 
            onDelete={deleteEvent}
          />
          
          {morningEvents.length === 0 && afternoonEvents.length === 0 && eveningEvents.length === 0 && (
             <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No plans for {isToday(selectedDate) ? 'today' : format(selectedDate, 'EEEE')}</h3>
                <p className="text-sm text-muted-foreground/60 mt-1">Tap the + button to add an event</p>
             </div>
          )}
        </div>
      </motion.div>

      {/* Floating Action Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsSheetOpen(true)}
        className="fixed bottom-24 right-6 z-50 group flex items-center justify-center size-16 rounded-full bg-primary text-primary-foreground shadow-[0_0_30px_rgba(48,232,122,0.4)] transition-all"
      >
        <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-20"></div>
        <Plus className="w-8 h-8" />
      </motion.button>
      
      {/* Bottom Gradient Fade */}
      <div className="pointer-events-none fixed bottom-0 left-0 h-24 w-full bg-gradient-to-t from-background to-transparent z-10"></div>

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
            <Button onClick={handleAddEvent} className="w-full" size="lg">
              {t('save')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}

function TimelineSection({ 
  title, 
  icon: Icon, 
  iconColor, 
  events, 
  onDelete 
}: { 
  title: string; 
  icon: any; 
  iconColor: string; 
  events: AppEvent[]; 
  onDelete: (id: string) => void; 
}) {
  if (events.length === 0) return null;

  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
      <h2 className="px-5 pb-4 text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
        <Icon className={cn("w-6 h-6 fill-current", iconColor)} />
        {title}
      </h2>
      <div className="flex flex-col px-5 gap-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} onDelete={onDelete} />
        ))}
      </div>
    </motion.div>
  );
}

function EventCard({ event, onDelete }: { event: AppEvent; onDelete: (id: string) => void }) {
  const isPast = new Date(event.date) < new Date();
  
  return (
    <div className={cn(
      "group relative flex items-center gap-4 rounded-3xl border p-4 pr-5 transition-all",
      isPast 
        ? "border-border bg-card/50" 
        : "border-border bg-card shadow-sm hover:border-primary/50"
    )}>
      {/* Left: Time */}
      <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-border/50 pr-4">
        <span className={cn(
          "text-sm font-bold",
          isPast ? "text-muted-foreground line-through decoration-primary" : "text-primary"
        )}>
          {format(parseISO(event.date), 'h:mm')}
        </span>
        <span className="text-xs text-muted-foreground">{format(parseISO(event.date), 'a')}</span>
      </div>
      
      {/* Center: Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <span className={cn(
          "text-base font-medium truncate",
          isPast ? "text-muted-foreground line-through decoration-muted-foreground" : "text-foreground font-bold"
        )}>
          {event.title}
        </span>
        {event.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
             <MapPin className="w-3 h-3" />
             <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>
      
      {/* Right: Checkbox / Action */}
      <div className="flex shrink-0">
        {isPast ? (
          <div className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground">
            <Check className="w-3.5 h-3.5" />
          </div>
        ) : (
           <button 
             onClick={() => onDelete(event.id)}
             className="h-6 w-6 rounded-full border-2 border-border bg-transparent hover:border-destructive hover:text-destructive flex items-center justify-center transition-all"
           >
             {/* Simple visual indicator, clicking deletes/completes */}
           </button>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<PageWrapper className="px-5"><div className="pt-6"><div className="h-8 w-24 bg-muted rounded animate-pulse" /></div></PageWrapper>}>
      <CalendarContent />
    </Suspense>
  );
}
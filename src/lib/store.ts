import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Locale } from './i18n';

export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'done';
export type Theme = 'light' | 'dark' | 'system';
export type IntentType = 'task' | 'event' | 'email' | 'note' | 'whatsapp_message' | 'telegram_message' | 'reminder' | 'search';
export type IntegrationType = 'whatsapp' | 'telegram' | 'gmail' | 'notion' | 'google_calendar';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  source?: 'voice' | 'ai' | 'manual';
  intent_type?: 'task' | 'reminder' | 'event';
  confidence?: number;
  transcript?: string;
  ai_state?: 'actionable_now' | 'scheduled' | 'blocked' | 'low_priority' | 'overdue' | 'completed';
  smart_action?: 'mark_done' | 'reschedule' | 'ask_romna' | 'snooze';
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  createdAt: string;
}

export interface VoiceNote {
  id: string;
  transcript: string;
  audioUrl?: string;
  intent?: IntentType;
  createdAt: string;
}

export interface EmailAccount {
  id: string;
  provider: string;
  emailAddress: string;
  displayName: string;
  isPrimary: boolean;
  workspaceDomain?: string;
}

export interface Integration {
  id: string;
  type: IntegrationType;
  isConnected: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceIntent {
  id: string;
  type: IntentType;
  rawText: string;
  structuredData: Record<string, unknown>;
  status: 'pending' | 'scheduled' | 'executed' | 'failed';
  scheduledFor?: string;
  createdAt: string;
}

interface AppState {
  locale: Locale;
  theme: Theme;
  tasks: Task[];
  events: Event[];
  voiceNotes: VoiceNote[];
  emailAccounts: EmailAccount[];
  integrations: Integration[];
  voiceIntents: VoiceIntent[];
  refreshTick: number; // Global signal for data refetch

  feedback: {
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    backgroundNotifications: boolean;
    backgroundSound: boolean;
    backgroundVibration: boolean;
    autoExecutionEnabled: boolean;
  };

  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  triggerRefresh: () => void; // Call this to signal all pages to refetch
  setFeedback: (feedback: Partial<{
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    backgroundNotifications: boolean;
    backgroundSound: boolean;
    backgroundVibration: boolean;
    autoExecutionEnabled: boolean;
  }>) => void;

  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;

  addEvent: (event: Omit<Event, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;

  addVoiceNote: (voiceNote: Omit<VoiceNote, 'id' | 'createdAt'>) => void;

  addEmailAccount: (account: Omit<EmailAccount, 'id'>) => void;
  removeEmailAccount: (id: string) => void;
  setPrimaryEmail: (id: string) => void;

  addIntegration: (integration: Omit<Integration, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateIntegration: (id: string, updates: Partial<Integration>) => void;
  removeIntegration: (id: string) => void;
  getIntegration: (type: IntegrationType) => Integration | undefined;

  addVoiceIntent: (intent: Omit<VoiceIntent, 'id' | 'createdAt'>) => void;
  updateVoiceIntent: (id: string, updates: Partial<VoiceIntent>) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);
let refreshTimeout: NodeJS.Timeout | null = null;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      locale: 'en',
      theme: 'light',
      tasks: [],
      events: [],
      voiceNotes: [],
      emailAccounts: [],
      integrations: [],
      voiceIntents: [],
      refreshTick: 0,
      feedback: {
        soundEnabled: true,
        hapticsEnabled: true,
        backgroundNotifications: true,
        backgroundSound: true,
        backgroundVibration: true,
        autoExecutionEnabled: false,
      },

      setLocale: (locale) => {
        // [V6] Only set cookie - RTL is now handled server-side in layout.tsx
        if (typeof document !== 'undefined') {
          document.cookie = `romna_locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
        }
        set({ locale });
      },
      setTheme: (theme) => set({ theme }),
      triggerRefresh: () => {
        if (refreshTimeout) clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          console.log('[PULSE]', Date.now());
          set((state) => ({ refreshTick: state.refreshTick + 1 }));
        }, 100); // 100ms Debounce (Pulse)
      },
      setFeedback: (feedback) => set((state) => ({ feedback: { ...state.feedback, ...feedback } })),

      addTask: (task) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            { ...task, id: generateId(), createdAt: new Date().toISOString() },
          ],
        })),

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        })),

      toggleTaskStatus: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, status: task.status === 'pending' ? 'done' : 'pending' }
              : task
          ),
        })),

      addEvent: (event) =>
        set((state) => ({
          events: [
            ...state.events,
            { ...event, id: generateId(), createdAt: new Date().toISOString() },
          ],
        })),

      updateEvent: (id, updates) =>
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id ? { ...event, ...updates } : event
          ),
        })),

      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        })),

      addVoiceNote: (voiceNote) =>
        set((state) => ({
          voiceNotes: [
            { ...voiceNote, id: generateId(), createdAt: new Date().toISOString() },
            ...state.voiceNotes,
          ],
        })),

      addEmailAccount: (account) =>
        set((state) => ({
          emailAccounts: [
            ...state.emailAccounts,
            { ...account, id: generateId() },
          ],
        })),

      removeEmailAccount: (id) =>
        set((state) => ({
          emailAccounts: state.emailAccounts.filter((acc) => acc.id !== id),
        })),

      setPrimaryEmail: (id) =>
        set((state) => ({
          emailAccounts: state.emailAccounts.map((acc) => ({
            ...acc,
            isPrimary: acc.id === id,
          })),
        })),

      addIntegration: (integration) =>
        set((state) => ({
          integrations: [
            ...state.integrations,
            {
              ...integration,
              id: generateId(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
          ],
        })),

      updateIntegration: (id, updates) =>
        set((state) => ({
          integrations: state.integrations.map((int) =>
            int.id === id ? { ...int, ...updates, updatedAt: new Date().toISOString() } : int
          ),
        })),

      removeIntegration: (id) =>
        set((state) => ({
          integrations: state.integrations.filter((int) => int.id !== id),
        })),

      getIntegration: (type) => {
        return get().integrations.find((int) => int.type === type);
      },

      addVoiceIntent: (intent) =>
        set((state) => ({
          voiceIntents: [
            { ...intent, id: generateId(), createdAt: new Date().toISOString() },
            ...state.voiceIntents,
          ],
        })),

      updateVoiceIntent: (id, updates) =>
        set((state) => ({
          voiceIntents: state.voiceIntents.map((intent) =>
            intent.id === id ? { ...intent, ...updates } : intent
          ),
        })),
    }),
    {
      name: 'romna-storage',

      version: 5, // V5 Stabilization: Force clean slate for critical properties
      migrate: (persistedState: any, version: number) => {
        if (version < 5) {
          // Reset critical state to defaults
          return {
            ...persistedState,
            tasks: [], // Clear local tasks
            voiceIntents: [], // Clear history
            refreshTick: 0
          };
        }
        return persistedState;
      },
    }
  )
);
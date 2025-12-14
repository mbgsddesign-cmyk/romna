import { v4 as uuidv4 } from 'uuid';

// Types mirror the database types but for local storage
export interface LocalTask {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    status: 'pending' | 'active' | 'done' | 'archived';
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    created_at: string;
    updated_at: string;
}

export interface LocalUser {
    id: string;
    is_local: boolean;
    name: string;
    email?: string;
    onboarding_completed: boolean;
}

const STORAGE_KEYS = {
    USER: 'romna_local_user',
    TASKS: 'romna_local_tasks',
    PREFERENCES: 'romna_local_prefs'
};

export const LocalStorage = {
    // User Management
    getUser: (): LocalUser | null => {
        if (typeof window === 'undefined') return null;
        const item = localStorage.getItem(STORAGE_KEYS.USER);
        return item ? JSON.parse(item) : null;
    },

    initUser: (): LocalUser => {
        const existing = LocalStorage.getUser();
        if (existing) return existing;

        const newUser: LocalUser = {
            id: uuidv4(),
            is_local: true,
            name: 'Commander',
            onboarding_completed: false
        };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
        return newUser;
    },

    updateUser: (updates: Partial<LocalUser>) => {
        const user = LocalStorage.getUser();
        if (!user) return;
        const updated = { ...user, ...updates };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
        return updated;
    },

    // Task Management
    getTasks: (): LocalTask[] => {
        if (typeof window === 'undefined') return [];
        const item = localStorage.getItem(STORAGE_KEYS.TASKS);
        return item ? JSON.parse(item) : [];
    },

    addTask: (task: Omit<LocalTask, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
        const user = LocalStorage.getUser();
        if (!user) return null;

        const tasks = LocalStorage.getTasks();
        const newTask: LocalTask = {
            ...task,
            id: uuidv4(),
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        tasks.push(newTask);
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
        return newTask;
    },

    updateTask: (id: string, updates: Partial<LocalTask>) => {
        const tasks = LocalStorage.getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if (index === -1) return null;

        tasks[index] = { ...tasks[index], ...updates };
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
        return tasks[index];
    },

    deleteTask: (id: string) => {
        const tasks = LocalStorage.getTasks();
        const filtered = tasks.filter(t => t.id !== id);
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filtered));
        return true;
    },

    clear: () => {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TASKS);
        localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
    }
};

import { supabase } from './supabase';
import { LocalStorage, LocalTask } from './local-storage';
import { useAppStore } from './store'; // Import Store

export const StorageAdapter = {
    getTasks: async (userId: string, isLocal: boolean, start?: string, end?: string): Promise<any[]> => {
        if (isLocal) {
            const allTasks = LocalStorage.getTasks();
            // Filter by due date if provided
            let filtered = allTasks.filter(t => t.status !== 'done' && t.status !== 'archived');

            if (start) {
                filtered = filtered.filter(t => t.due_date && t.due_date >= start);
            }
            if (end) {
                filtered = filtered.filter(t => t.due_date && t.due_date <= end);
            }
            return filtered.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
        } else {
            let query = supabase
                .from('tasks')
                .select('*')
                .eq('user_id', userId)
                .in('status', ['pending', 'active']);

            if (start) query = query.gte('due_date', start);
            if (end) query = query.lte('due_date', end);

            const { data, error } = await query.order('due_date', { ascending: true }).limit(20); // V5: Increased limit
            if (error) throw error;

            // [V5] Offline Hardening: Merge Local Tasks (created while offline)
            const localTasks = LocalStorage.getTasks().filter(t => t.status !== 'done' && t.status !== 'archived');

            // Avoid duplicates by title + approximate creation? 
            // Or just trust they are distinct IDs (local starts with 'temp' usually if using uuid/random from store).
            // Actually store.ts uses random string for generated ID.

            // Simple merge & sorting
            const remoteTasks = data || [];
            const merged = [...remoteTasks, ...localTasks].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

            return merged.slice(0, 50); // Cap results
        }
    },

    createTask: async (userId: string, isLocal: boolean, task: any) => {
        // DUPLICATE CHECK: Prevent creation if similar task exists (same title, roughly same due date)
        const title = task.title;
        const now = new Date();

        let result;
        if (!isLocal) {
            const { data: existing } = await supabase
                .from('tasks')
                .select('id, created_at')
                .eq('user_id', userId)
                .eq('title', title)
                .gte('created_at', new Date(now.getTime() - 60000).toISOString()) // Created in last minute
                .limit(1);

            if (existing && existing.length > 0) {
                console.warn("[Storage] Duplicate task prevented:", title);
                return existing[0];
            }

            const { data, error } = await supabase
                .from('tasks')
                .insert({ ...task, user_id: userId })
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            result = LocalStorage.addTask({
                ...task,
                user_id: userId,
                status: task.status || 'pending',
                priority: task.priority || 'medium',
            });
        }

        // PULSE: Global Refresh
        console.log("[Pulse] Fired from: StorageAdapter.createTask");
        useAppStore.getState().triggerRefresh();
        return result;
    },

    updateTask: async (taskId: string, isLocal: boolean, updates: any) => {
        let result;
        if (isLocal) {
            result = LocalStorage.updateTask(taskId, updates);
        } else {
            const { data, error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', taskId)
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        // PULSE: Global Refresh
        console.log("[Pulse] Fired from: StorageAdapter.updateTask");
        useAppStore.getState().triggerRefresh();
        return result;

    },

    deleteTask: async (taskId: string, isLocal: boolean) => {
        if (isLocal) {
            LocalStorage.deleteTask(taskId);
        } else {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);
            if (error) throw error;
        }

        // PULSE: Global Refresh
        console.log("[Pulse] Fired from: StorageAdapter.deleteTask");
        useAppStore.getState().triggerRefresh();
        return true;
    },

    getStats: async (userId: string, isLocal: boolean) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const nowStr = new Date().toISOString();

        if (isLocal) {
            const allTasks = LocalStorage.getTasks();
            const completedToday = allTasks.filter(t =>
                t.status === 'done' &&
                t.updated_at &&
                t.updated_at.startsWith(todayStr)
            ).length;

            const upNext = allTasks
                .filter(t =>
                    (t.status === 'pending' || t.status === 'active') &&
                    t.due_date &&
                    t.due_date > nowStr
                )
                .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))[0] || null;

            return { completedToday, upNext };
        } else {
            // Remote: Completed Today
            const { count, error: countError } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'done')
                .gte('updated_at', `${todayStr}T00:00:00`)
                .lte('updated_at', `${todayStr}T23:59:59`);

            if (countError) console.error("Error fetching stats count", countError);

            // Remote: Up Next
            const { data: upNextData, error: nextError } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', userId)
                .in('status', ['pending', 'active'])
                // V4 Strict Filter: Ensure no archived
                .neq('status', 'archived')
                .gt('due_date', nowStr)
                .order('due_date', { ascending: true })
                .limit(1)
                .single();

            if (nextError && nextError.code !== 'PGRST116') { // Ignore no rows found
                console.error("Error fetching up next", nextError);
            }

            return {
                completedToday: count || 0,
                upNext: upNextData || null
            };
        }
    },

    getPendingPlans: async (userId: string, isLocal: boolean) => {
        if (isLocal) return [];

        // Filter: Waiting Approval
        const { data, error } = await supabase
            .from('execution_plans')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'waiting_approval')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching plans", error);
            return [];
        }
        console.log('[DATA] plans:', (data || []).length);
        return data || [];
    },

    createPlan: async (userId: string, isLocal: boolean, plan: any) => {
        if (isLocal) {
            console.warn("Local execution plans not fully supported yet");
            return null;
        } else {
            // Prevent exact duplicate plan creation in short window
            const { data: existing } = await supabase
                .from('execution_plans')
                .select('id')
                .eq('user_id', userId)
                .contains('payload', { title: plan.payload.title })
                .gte('created_at', new Date(Date.now() - 60000).toISOString())
                .limit(1);

            if (existing && existing.length > 0) {
                console.warn("[Storage] Duplicate plan prevented");
                return existing[0];
            }

            const { data, error } = await supabase
                .from('execution_plans')
                .insert({ ...plan, user_id: userId })
                .select()
                .single();

            if (error) throw error;

            // PULSE: Global Refresh
            console.log("[Pulse] Fired from: StorageAdapter.createPlan");
            useAppStore.getState().triggerRefresh();

            return data;
        }
    },

    updatePlan: async (planId: string, isLocal: boolean, updates: any) => {
        if (isLocal) return null;

        const { data, error } = await supabase
            .from('execution_plans')
            .update(updates)
            .eq('id', planId)
            .select()
            .single();

        if (error) throw error;

        // PULSE: Global Refresh
        console.log("[Pulse] Fired from: StorageAdapter.updatePlan");
        useAppStore.getState().triggerRefresh();

        return data;
    },



};

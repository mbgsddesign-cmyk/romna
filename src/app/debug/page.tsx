'use client';

import { useState, useEffect } from 'react';
import { HF_CONFIG } from '@/lib/ai/config';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function DebugPage() {
    const mask = (s?: string) => s ? `${s.slice(0, 5)}...${s.slice(-5)}` : 'MISSING';
    const refreshTick = useAppStore(state => state.refreshTick);
    const locale = useAppStore(state => state.locale);
    const { userId, isLocal } = useAuth();

    const [micPermission, setMicPermission] = useState<string>('checking...');
    const [plansCount, setPlansCount] = useState<number>(0);
    const [tasksCount, setTasksCount] = useState<number>(0);
    const [lastPulse, setLastPulse] = useState<number>(Date.now());

    // Check mic permission
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.permissions) {
            navigator.permissions.query({ name: 'microphone' as PermissionName })
                .then(result => setMicPermission(result.state))
                .catch(() => setMicPermission('unknown'));
        } else {
            setMicPermission('API not available');
        }
    }, []);

    // Track pulse
    useEffect(() => {
        setLastPulse(Date.now());
    }, [refreshTick]);

    const [zombieCount, setZombieCount] = useState(0);

    // Fetch counts
    useEffect(() => {
        const fetchCounts = async () => {
            if (!userId || isLocal) return;

            // Fetch RAW data
            const { data: plans } = await supabase
                .from('execution_plans')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'waiting_approval');

            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', userId)
                .in('status', ['pending', 'active']);

            if (plans && tasks) {
                // Manual Zombie Logic Mirror to avoid import issues
                const realPlans = plans.filter(p => {
                    const title = p.payload?.title || p.payload?.subject;
                    if (!title) return false;
                    return true;
                });

                const zombies = plans.length - realPlans.length;

                setPlansCount(realPlans.length);
                setZombieCount(zombies);
                setTasksCount(tasks.length || 0);
            }
        };
        fetchCounts();
    }, [userId, isLocal, refreshTick]);

    const StatusIcon = ({ ok }: { ok: boolean }) => (
        <span className={ok ? 'text-green-400' : 'text-red-400'}>
            {ok ? '✔' : '✖'}
        </span>
    );

    return (
        <div className="p-6 font-mono text-white bg-black min-h-screen space-y-6">
            <h1 className="text-2xl font-bold">ROMNA V7 Debug</h1>

            {/* System Status */}
            <div className="bg-gray-900 p-4 rounded space-y-2">
                <h2 className="text-lg font-bold text-volt mb-2">System Status</h2>
                <div className="flex justify-between">
                    <span>Mic Permission</span>
                    <span><StatusIcon ok={micPermission === 'granted'} /> {micPermission}</span>
                </div>
                <div className="flex justify-between">
                    <span>Locale / RTL</span>
                    <span>{locale} / {locale === 'ar' ? 'RTL' : 'LTR'}</span>
                </div>
                <div className="flex justify-between">
                    <span>User ID</span>
                    <span className="text-xs">{userId ? mask(userId) : (isLocal ? 'LOCAL' : 'None')}</span>
                </div>
            </div>

            {/* Data Status */}
            <div className="bg-gray-900 p-4 rounded space-y-2">
                <h2 className="text-lg font-bold text-volt mb-2">Data Status</h2>
                <div className="flex justify-between">
                    <span>Plans (Valid Inbox)</span>
                    <span className="text-yellow-400">{plansCount}</span>
                </div>
                <div className="flex justify-between">
                    <span>Zombies (Hidden)</span>
                    <span className="text-red-500 font-bold">{zombieCount}</span>
                </div>
                <div className="flex justify-between">
                    <span>Tasks (active)</span>
                    <span className="text-blue-400">{tasksCount}</span>
                </div>
                <div className="flex justify-between">
                    <span>Last Pulse</span>
                    <span className="text-green-400">{new Date(lastPulse).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                    <span>Pulse Tick</span>
                    <span>{refreshTick}</span>
                </div>
            </div>

            {/* Config */}
            <div className="bg-gray-900 p-4 rounded">
                <h2 className="text-lg font-bold text-volt mb-2">API Config</h2>
                <pre className="text-xs overflow-auto">
                    {JSON.stringify({
                        STT_Model: HF_CONFIG.MODELS.STT,
                        NLU_Model: HF_CONFIG.MODELS.GEMINI_NLU,
                        // Masked keys
                    }, null, 2)}
                </pre>
            </div>

            {/* Console Instructions */}
            <div className="bg-gray-900 p-4 rounded text-sm text-white/50">
                <h2 className="text-lg font-bold text-volt mb-2">Console Markers</h2>
                <p>Open DevTools Console and look for:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><code className="text-green-400">[VOICE]</code> detox logs (garbage rejected)</li>
                    <li><code className="text-blue-400">[PULSE]</code> timestamp on data refresh</li>
                    <li><code className="text-yellow-400">[DATA]</code> plans/tasks count</li>
                </ul>
            </div>

            <button
                onClick={() => useAppStore.getState().triggerRefresh()}
                className="w-full bg-volt text-black py-3 rounded font-bold"
            >
                Manual Pulse Trigger
            </button>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function EmailAccountManager({ userId }: { userId: string }) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAccounts = async () => {
        const { data } = await supabase.from('email_accounts').select('*').eq('user_id', userId);
        setAccounts(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchAccounts();
    }, [userId]);

    const handleConnectGmail = () => {
        // Redirect to Auth API
        window.location.href = '/api/email/oauth/gmail/start';
    };

    const handleConnectResend = async () => {
        const apiKey = prompt("Enter Resend API Key (Demo Mode - usually server env):");
        if (!apiKey) return;

        // Store "Resend" account pointing to env? 
        // For this prompt, let's assume one main Resend account per user or system.
        // Or allow user to add "Domain Email".

        const email = prompt("Enter From Email (e.g. me@domain.com):");
        if (!email) return;

        await supabase.from('email_accounts').insert({
            user_id: userId,
            provider: 'resend',
            email_address: email,
            display_name: 'Domain Email',
            is_default: accounts.length === 0,
            credentials: {} // API Key usually in env, or store here encrypted? Env preferred for V1.
        });
        toast.success("Resend account added");
        fetchAccounts();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove account?")) return;
        await supabase.from('email_accounts').delete().eq('id', id);
        fetchAccounts();
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-space font-bold">Email Accounts</h3>

            <div className="grid gap-3">
                {accounts.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-white/60">
                                {acc.provider === 'gmail' ? 'mail' : 'domain'}
                            </span>
                            <div>
                                <p className="font-bold">{acc.display_name || acc.email_address}</p>
                                <p className="text-xs text-white/40">{acc.email_address}</p>
                            </div>
                        </div>
                        <button onClick={() => handleDelete(acc.id)} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
                    </div>
                ))}
            </div>

            <div className="flex gap-3">
                <button
                    onClick={handleConnectGmail}
                    className="px-4 py-2 bg-white text-black font-bold rounded-lg flex items-center gap-2 hover:bg-gray-200"
                >
                    <span className="material-symbols-outlined">add</span>
                    Connect Gmail
                </button>
                <button
                    onClick={handleConnectResend}
                    className="px-4 py-2 bg-[#000] border border-white/20 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-white/10"
                >
                    <span className="material-symbols-outlined">add</span>
                    Connect Domain
                </button>
            </div>
        </div>
    );
}

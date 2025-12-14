'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface EmailDraftCardProps {
    plan: any;
    onApprove: (planId: string, payload?: any) => Promise<void>;
    onReject: (planId: string) => Promise<void>;
    onCancel?: () => void;
    isExecuting?: boolean;
}

export function EmailDraftCard({ plan, onApprove, onReject, isExecuting }: EmailDraftCardProps) {
    const [isEditing, setIsEditing] = useState(false);

    // Payload State
    const initialPayload = plan.payload || {};
    const [to, setTo] = useState(initialPayload.to || '');
    const [subject, setSubject] = useState(initialPayload.subject || '');
    const [body, setBody] = useState(initialPayload.body || '');

    // Account State
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState(initialPayload.from_account_id || '');

    useEffect(() => {
        // Fetch accounts on mount for selector
        supabase.from('email_accounts').select('id, email_address, display_name, provider')
            .then(({ data }) => {
                if (data) {
                    setAccounts(data);
                    // Default to first if none selected
                    if (!selectedAccountId && data.length > 0) {
                        setSelectedAccountId(data[0].id);
                    }
                }
            });
    }, []);

    const handleSaveAndSend = async () => {
        const updatedPayload = {
            ...initialPayload,
            to,
            subject,
            body,
            from_account_id: selectedAccountId
        };
        await onApprove(plan.id, updatedPayload);
    };

    return (
        <div className="bg-[#111] border border-white/10 rounded-[32px] p-6 relative overflow-hidden w-full max-w-md mx-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-volt to-transparent opacity-50" />

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-volt/10 flex items-center justify-center text-volt">
                    <span className="material-symbols-outlined">mail</span>
                </div>
                <div>
                    <h3 className="text-white font-bold font-space text-lg">Send Email</h3>
                    <p className="text-white/40 text-xs">Approval Required</p>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {/* From Account Selector */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <label className="text-xs text-white/30 uppercase tracking-widest block mb-1">From</label>
                    {accounts.length > 0 ? (
                        <select
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            disabled={!isEditing}
                            className="w-full bg-transparent text-white outline-none text-sm appearance-none disabled:opacity-50"
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id} className="bg-[#222]">
                                    {acc.display_name} ({acc.email_address})
                                </option>
                            ))}
                        </select>
                    ) : (
                        <p className="text-red-400 text-xs">No accounts connected</p>
                    )}
                </div>

                {/* To */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <label className="text-xs text-white/30 uppercase tracking-widest block mb-1">To</label>
                    {isEditing ? (
                        <input
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            className="w-full bg-transparent text-white outline-none font-mono text-sm"
                        />
                    ) : (
                        <p className="text-white/90 text-sm font-mono truncate">{to}</p>
                    )}
                </div>

                {/* Subject */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <label className="text-xs text-white/30 uppercase tracking-widest block mb-1">Subject</label>
                    {isEditing ? (
                        <input
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="w-full bg-transparent text-white outline-none font-bold"
                        />
                    ) : (
                        <p className="text-white/90 font-bold leading-tight">{subject}</p>
                    )}
                </div>

                {/* Body */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 min-h-[120px]">
                    <label className="text-xs text-white/30 uppercase tracking-widest block mb-1">Message</label>
                    {isEditing ? (
                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            className="w-full bg-transparent text-white outline-none text-sm resize-none h-32"
                        />
                    ) : (
                        <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: body }} />
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
                {!isEditing ? (
                    <>
                        <button
                            onClick={() => onReject(plan.id)}
                            className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-colors"
                        >
                            Reject
                        </button>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex-1 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => onApprove(plan.id)}
                            disabled={isExecuting}
                            className="flex-[2] py-3 rounded-xl bg-volt text-black font-bold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(217,253,0,0.2)] disabled:opacity-50"
                        >
                            {isExecuting ? 'Sending...' : 'Approve & Send'}
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-bold hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveAndSend}
                            disabled={isExecuting}
                            className="flex-[2] py-3 rounded-xl bg-volt text-black font-bold hover:opacity-90 transition-opacity"
                        >
                            {isExecuting ? 'Sending...' : 'Save & Send'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

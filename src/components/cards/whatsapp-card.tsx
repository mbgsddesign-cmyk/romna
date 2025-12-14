'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface WhatsAppCardProps {
    plan: any;
    onApprove: (planId: string, payload?: any) => Promise<void>;
    onReject: (planId: string) => Promise<void>;
    isExecuting?: boolean;
}

export function WhatsAppCard({ plan, onApprove, onReject, isExecuting }: WhatsAppCardProps) {
    const [isEditing, setIsEditing] = useState(false);

    const initialPayload = plan.payload || {};
    const [to, setTo] = useState(typeof initialPayload.to === 'string' ? initialPayload.to : '');
    const [body, setBody] = useState(initialPayload.body || '');

    const isUnresolved = typeof initialPayload.to === 'object' && initialPayload.to.unresolved;

    const handleSaveAndSend = async () => {
        if (!to || to.trim().length < 5) {
            toast.error("Please enter a valid recipient number");
            return;
        }

        const updatedPayload = {
            ...initialPayload,
            to, // Resolved string
            body,
        };
        await onApprove(plan.id, updatedPayload);
    };

    return (
        <div className="bg-[#111] border border-white/10 rounded-[32px] p-6 relative overflow-hidden w-full max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366]">
                    <span className="material-symbols-outlined">chat</span>
                </div>
                <div>
                    <h3 className="text-white font-bold font-space text-lg">Send WhatsApp</h3>
                    <p className="text-white/40 text-xs">Approval Required</p>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {/* To */}
                <div className={`rounded-xl p-3 border transition-colors ${isUnresolved ? 'bg-red-500/10 border-red-500/50' : 'bg-white/5 border-white/5'}`}>
                    <label className="text-xs text-white/30 uppercase tracking-widest block mb-1">To</label>
                    {(isEditing || isUnresolved) ? (
                        <input
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            placeholder='e.g. +1234567890'
                            className="w-full bg-transparent text-white outline-none font-mono text-sm placeholder:text-white/20"
                        />
                    ) : (
                        <p className="text-white/90 text-sm font-mono truncate">{to}</p>
                    )}
                    {isUnresolved && !isEditing && (
                        <p className="text-red-400 text-xs mt-1">⚠ Select recipient</p>
                    )}
                </div>

                {/* Body */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 min-h-[80px]">
                    <label className="text-xs text-white/30 uppercase tracking-widest block mb-1">Message</label>
                    {isEditing ? (
                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            className="w-full bg-transparent text-white outline-none text-sm resize-none h-24"
                        />
                    ) : (
                        <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
                {!isEditing && !isUnresolved ? (
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
                            className="flex-[2] py-3 rounded-xl bg-[#25D366] text-black font-bold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(37,211,102,0.2)] disabled:opacity-50"
                        >
                            {isExecuting ? 'Sending...' : 'Approve & Send'}
                        </button>
                    </>
                ) : (
                    <>
                        {/* Editing or Unresolved Mode */}
                        {!isUnresolved && (
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-bold hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={handleSaveAndSend}
                            disabled={isExecuting}
                            className="flex-[2] py-3 rounded-xl bg-[#25D366] text-black font-bold hover:opacity-90 transition-opacity"
                        >
                            {isExecuting ? 'Sending...' : 'Save & Send'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

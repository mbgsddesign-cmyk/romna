import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

// FORCE DYNAMIC
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        console.log("[FORENSIC] Starting audit...");

        // Use Server Client which uses Service Role Key if available, or just auth context
        // But createServerClient usually expects cookie handling?
        // Let's rely on standard supabase-js client if we want raw access? 
        // No, best to use the one configured with env vars.
        // If we are server-side, we should use process.env directly for a forensic script if possible to bypass RLS.

        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!sbUrl || !sbKey) {
            return NextResponse.json({ error: "Missing Env Vars" }, { status: 500 });
        }

        // RAW CLIENT for audit
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(sbUrl, sbKey);

        // 1. Fetch Plans
        // Status: waiting_approval
        const { data: plans, error } = await supabase
            .from('execution_plans')
            .select('*')
            .eq('status', 'waiting_approval')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const now = new Date();
        const zombies = [];
        const clean = [];

        for (const p of plans || []) {
            let reason = [];
            const ageHours = (now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60);

            // Check Payload Structure
            const payload = p.payload || {};
            const title = payload.title || payload.subject;

            // ZOMBIE CRITERIA
            if (!title || title.trim().length === 0) reason.push("MISSING_TITLE");
            if (p.source === 'voice' && (payload.confidence && payload.confidence < 0.6)) reason.push("LOW_CONFIDENCE");
            // if (ageHours > 24) reason.push("STALE_24H"); // Age alone doesn't make it a zombie, just stale.

            // Check short garbage
            if (title && title.length < 3) reason.push("TOO_SHORT");

            if (reason.length > 0) {
                zombies.push({ ...p, zombie_reasons: reason });
            } else {
                clean.push({ ...p, age_hours: ageHours.toFixed(1) });
            }
        }

        return NextResponse.json({
            status: "success",
            audit_timestamp: now.toISOString(),
            total_waiting: plans?.length || 0,
            zombie_count: zombies.length,
            clean_count: clean.length,
            zombies: zombies.map(z => ({
                id: z.id,
                title: z.payload?.title || "NULL",
                reasons: z.zombie_reasons,
                created: z.created_at
            })),
            clean_sample: clean.slice(0, 3).map(c => ({
                id: c.id,
                title: c.payload?.title,
                age: c.age_hours + "h"
            }))
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Zombie Detector - Cron-triggered monitoring endpoint
 * 
 * Purpose: Detect zombie execution_plans (waiting_approval with missing title)
 * Protected by CRON_SECRET Bearer token.
 * 
 * Call: POST /api/monitor/zombies
 * Auth: Bearer <CRON_SECRET>
 * Frequency: Every 30 minutes (configured in Supabase or external cron)
 */

export const dynamic = 'force-dynamic';

// Lazy init to avoid build-time errors
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase admin credentials');
    }

    return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
    const startTime = Date.now();

    // 1. Verify CRON_SECRET
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('[MONITOR/ZOMBIES] CRON_SECRET not configured');
        return NextResponse.json({
            ok: false,
            error: 'CRON_SECRET not configured'
        }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[MONITOR/ZOMBIES] Unauthorized request');
        return NextResponse.json({
            ok: false,
            error: 'Unauthorized'
        }, { status: 401 });
    }

    try {
        const supabase = getSupabaseAdmin();

        // 2. Query for zombie plans (missing title)
        const { data: zombies, error: zombieError } = await supabase
            .from('execution_plans')
            .select('id, created_at')
            .eq('status', 'waiting_approval')
            .or('payload->title.is.null,payload->title.eq.')
            .order('created_at', { ascending: false })
            .limit(10);

        if (zombieError) {
            console.error('[MONITOR/ZOMBIES] Query error:', zombieError);
            throw zombieError;
        }

        // 3. Get total count
        const { count, error: countError } = await supabase
            .from('execution_plans')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'waiting_approval')
            .or('payload->title.is.null,payload->title.eq.');

        if (countError) {
            console.error('[MONITOR/ZOMBIES] Count error:', countError);
            throw countError;
        }

        const zombieCount = count || 0;
        const sampleIds = (zombies || []).map(z => z.id);
        const level = zombieCount > 0 ? 'warn' : 'info';

        // 4. Log to monitoring_events table (if exists)
        try {
            await supabase.from('monitoring_events').insert({
                level,
                source: 'zombie_detector',
                message: zombieCount > 0
                    ? `Detected ${zombieCount} zombie plans`
                    : 'No zombies detected',
                meta: {
                    zombie_count: zombieCount,
                    sample_ids: sampleIds,
                    latency_ms: Date.now() - startTime
                }
            });
        } catch (insertError) {
            // Table might not exist yet - not critical
            console.warn('[MONITOR/ZOMBIES] Could not log to monitoring_events:', insertError);
        }

        // 5. Log to console for Netlify logs
        if (zombieCount > 0) {
            console.warn(`[MONITOR/ZOMBIES] ALERT: ${zombieCount} zombie plans detected. Sample IDs: ${sampleIds.join(', ')}`);
        } else {
            console.log('[MONITOR/ZOMBIES] OK: No zombies detected');
        }

        return NextResponse.json({
            ok: true,
            zombie_count: zombieCount,
            sample_ids: sampleIds,
            checked_at: new Date().toISOString(),
            latency_ms: Date.now() - startTime
        });

    } catch (error: any) {
        console.error('[MONITOR/ZOMBIES] Exception:', error);
        return NextResponse.json({
            ok: false,
            error: error.message || 'Monitoring failed'
        }, { status: 500 });
    }
}

// GET for health check (no auth required)
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        endpoint: 'zombie_detector',
        note: 'Use POST with Authorization: Bearer <CRON_SECRET> to trigger check'
    });
}

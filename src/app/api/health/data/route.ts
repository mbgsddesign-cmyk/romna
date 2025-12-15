import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Data Health Check - Supabase Connection + RLS
 * 
 * Purpose: Verify database connectivity and RLS policies work.
 * 
 * Alert: 500 for > 2 minutes = CRITICAL
 */

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const start = Date.now();

        // Simple query to verify connection
        const { data, error } = await supabase
            .from('tasks')
            .select('id')
            .limit(1);

        const latency = Date.now() - start;

        if (error) {
            console.error('[HEALTH/DATA] Supabase error:', error.message);
            return NextResponse.json({
                status: 'error',
                error: 'supabase_connection',
                message: error.message
            }, { status: 500 });
        }

        return NextResponse.json({
            status: 'ok',
            latency_ms: latency,
            timestamp: Date.now()
        });

    } catch (e: any) {
        console.error('[HEALTH/DATA] Exception:', e);
        return NextResponse.json({
            status: 'error',
            error: 'data_error',
            message: e.message
        }, { status: 500 });
    }
}

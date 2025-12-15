import { NextResponse } from 'next/server';

/**
 * Basic Health Check - App + Runtime
 * 
 * Purpose: Verify the app is alive and responding.
 * - Does NOT depend on Supabase
 * - Does NOT depend on AI services
 * - Must respond in < 50ms
 * 
 * Monitor: Ping every 60s, alert if 2 consecutive failures.
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: Date.now(),
        version: 'v7',
        uptime: process.uptime()
    });
}

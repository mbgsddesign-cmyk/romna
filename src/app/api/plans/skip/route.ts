import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Plans Skip/Snooze API
 * Sets skip_until on execution_plans to hide them temporarily
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
    console.log('[PLANS/SKIP] Request received');

    try {
        const { planId, duration = 24 } = await req.json();

        if (!planId) {
            return NextResponse.json({
                success: false,
                error: 'Missing planId'
            }, { status: 400 });
        }

        // Validate duration (hours)
        const hours = Math.min(Math.max(1, duration), 168); // 1h to 7 days

        // Get auth token
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });

        // Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({
                success: false,
                error: 'Authentication failed'
            }, { status: 401 });
        }

        // Calculate skip_until timestamp
        const skipUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

        // Update plan with skip_until
        const { data, error } = await supabase
            .from('execution_plans')
            .update({
                skip_until: skipUntil.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', planId)
            .eq('user_id', user.id) // Ownership check
            .select()
            .single();

        if (error) {
            console.error('[PLANS/SKIP] Update error:', error);
            return NextResponse.json({
                success: false,
                error: 'Failed to skip plan'
            }, { status: 500 });
        }

        console.log(`[PLANS/SKIP] Plan ${planId} snoozed until ${skipUntil.toISOString()}`);

        return NextResponse.json({
            success: true,
            message: `Snoozed for ${hours} hours`,
            skip_until: skipUntil.toISOString(),
            plan: data
        });

    } catch (error: any) {
        console.error('[PLANS/SKIP] Exception:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to skip plan'
        }, { status: 500 });
    }
}

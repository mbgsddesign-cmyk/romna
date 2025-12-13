import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ExecutionService } from '@/lib/execution/execution-service';
import {
  NotificationProvider,
  AlarmProvider,
  EmailProvider,
  WhatsAppProvider,
} from '@/lib/execution/providers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Scheduler/Worker API
 * Polls execution_queue and executes scheduled actions
 * Called periodically by cron job (Vercel Cron, AWS EventBridge, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron authorization (basic security)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const executionService = new ExecutionService(supabase);

    // Get all scheduled executions that are due
    const scheduledItems = await executionService.getScheduledExecutions();

    if (scheduledItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No executions due',
        executed: 0,
      });
    }

    console.log(`[Worker] Found ${scheduledItems.length} executions to process`);

    const results = [];

    for (const item of scheduledItems) {
      try {
        // Update status to executing
        await executionService.updateExecutionStatus(item.id, 'executing');

        // Get the right provider
        let provider;
        switch (item.type) {
          case 'notification':
            provider = new NotificationProvider();
            break;
          case 'alarm':
            provider = new AlarmProvider();
            break;
          case 'email':
            provider = new EmailProvider();
            break;
          case 'whatsapp':
            provider = new WhatsAppProvider();
            break;
          default:
            throw new Error(`Unknown execution type: ${item.type}`);
        }

        // Execute
        const result = await provider.execute(item.payload);

        if (result.success) {
          // Mark as executed
          await executionService.updateExecutionStatus(item.id, 'executed');
          
          // Update the plan
          await supabase
            .from('execution_plans')
            .update({ status: 'executed', executed_at: new Date().toISOString() })
            .eq('id', item.execution_plan_id);

          results.push({
            id: item.id,
            type: item.type,
            status: 'executed',
          });

          console.log(`[Worker] Successfully executed ${item.type} for ${item.user_id}`);
        } else {
          // Failed - increment retry
          const shouldRetry = item.retry_count < 2;
          
          if (shouldRetry) {
            await executionService.incrementRetry(item.id);
            console.warn(`[Worker] Execution failed, will retry: ${result.error}`);
          } else {
            await executionService.updateExecutionStatus(item.id, 'failed', result.error);
            await supabase
              .from('execution_plans')
              .update({ status: 'failed', error_message: result.error })
              .eq('id', item.execution_plan_id);
            console.error(`[Worker] Execution failed permanently: ${result.error}`);
          }

          results.push({
            id: item.id,
            type: item.type,
            status: shouldRetry ? 'retrying' : 'failed',
            error: result.error,
          });
        }
      } catch (error) {
        console.error(`[Worker] Error processing execution ${item.id}:`, error);
        
        // Increment retry
        await executionService.incrementRetry(item.id);
        
        results.push({
          id: item.id,
          type: item.type,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${scheduledItems.length} executions`,
      executed: results.filter(r => r.status === 'executed').length,
      failed: results.filter(r => r.status === 'failed').length,
      retrying: results.filter(r => r.status === 'retrying').length,
      results,
    });
  } catch (error) {
    console.error('[Worker] Execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
      },
      { status: 500 }
    );
  }
}

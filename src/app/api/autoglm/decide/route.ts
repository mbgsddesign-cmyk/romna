/**
 * POST /api/autoglm/decide
 * 
 * Main API endpoint for triggering AutoGLM decision engine
 * 
 * Request body:
 * {
 *   user_id: string;
 *   trigger?: 'manual' | 'tasks_page' | 'insights_page' | 'voice_intent';
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   decisions: Decision[];
 *   summary: string;
 *   reasoning: { risks_count, opportunities_count, top_priority_task };
 *   logs: string[];
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeAutoGLM } from '@/lib/autoglm/act';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, trigger } = body;
    
    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }
    
    console.log(`[API /autoglm/decide] Received request from user ${user_id}, trigger: ${trigger || 'manual'}`);
    
    // Execute AutoGLM
    const result = await executeAutoGLM({
      user_id,
      trigger: trigger || 'manual',
    });
    
    console.log(`[API /autoglm/decide] Result: ${result.decisions.length} decisions generated`);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /autoglm/decide] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to execute AutoGLM',
        decisions: [],
        summary: 'Error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/autoglm/decide?userId=xxx
 * 
 * Get recent decisions for a user
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId query parameter is required' },
        { status: 400 }
      );
    }
    
    console.log(`[API /autoglm/decide] GET request from user ${userId}`);
    
    // Execute AutoGLM (same as POST for now)
    const result = await executeAutoGLM({
      user_id: userId,
      trigger: 'manual',
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /autoglm/decide] GET Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get decisions',
        decisions: [],
        summary: 'Error occurred',
      },
      { status: 500 }
    );
  }
}

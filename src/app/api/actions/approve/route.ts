import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { intent, payload } = await req.json();
  
  console.log('[Approve]', intent, payload);
  
  try {
    let insertedId: string | null = null;
    
    // Extract user_id from payload if provided by frontend
    const userId = payload.userId || payload.data?.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    switch (intent) {
      case 'reminder': {
        const reminderData = payload.data || {};
        const title = reminderData.title || payload.transcript || 'Untitled Reminder';
        let reminderDate = reminderData.date || reminderData.time || new Date(Date.now() + 3600000).toISOString();
        
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            title: `🔔 ${title}`,
            due_date: reminderDate,
            priority: 'high',
            status: 'pending',
            source: 'voice',
            intent_type: 'reminder',
            confidence: payload.confidence || null,
            transcript: payload.transcript || null,
          })
          .select('id')
          .single();
        
        if (error) throw error;
        insertedId = data?.id;
        
        revalidatePath('/');
        revalidatePath('/tasks');
        revalidatePath('/notifications');
        break;
      }
      
      case 'task': {
        const taskData = payload.data || {};
        const taskTitle = taskData.title || payload.transcript || 'Untitled Task';
        const dueDate = taskData.dueDate || taskData.date || new Date().toISOString();
        const priority = taskData.priority || 'medium';
        
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            title: taskTitle,
            due_date: dueDate,
            priority: priority,
            status: 'pending',
            source: 'voice',
            intent_type: 'task',
            confidence: payload.confidence || null,
            transcript: payload.transcript || null,
          })
          .select('id')
          .single();
        
        if (error) throw error;
        insertedId = data?.id;
        
        revalidatePath('/');
        revalidatePath('/tasks');
        revalidatePath('/insights');
        break;
      }
      
      case 'event': {
        const eventData = payload.data || {};
        const eventTitle = eventData.title || payload.transcript || 'Untitled Event';
        let eventDate = eventData.date || new Date().toISOString();
        
        if (eventData.time) {
          const timePart = eventData.time.replace(/[^\d:]/g, '');
          eventDate = `${eventDate.split('T')[0]}T${timePart.padStart(5, '0')}:00`;
        }
        
        const { data, error } = await supabase
          .from('events')
          .insert({
            user_id: userId,
            title: eventTitle,
            start_time: eventDate,
            location: eventData.location || null,
            source: 'voice',
          })
          .select('id')
          .single();
        
        if (error) throw error;
        insertedId = data?.id;
        
        revalidatePath('/');
        revalidatePath('/calendar');
        revalidatePath('/insights');
        break;
      }
      
      default:
        console.log('[Approve] Unsupported intent type:', intent);
        return NextResponse.json({ 
          success: true, 
          message: 'Intent logged but not persisted'
        });
    }
    
    console.log('[Approve] ✅ Saved:', { intent, id: insertedId });
    
    return NextResponse.json({ 
      success: true, 
      id: insertedId 
    });
    
  } catch (error) {
    console.error('[Approve] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save action', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
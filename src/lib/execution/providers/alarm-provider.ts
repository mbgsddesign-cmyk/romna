import { BaseExecutionProvider, ExecutionResult } from './base-provider';

export class AlarmProvider extends BaseExecutionProvider {
  async execute(payload: Record<string, unknown>): Promise<ExecutionResult> {
    try {
      const { title, time, userId } = payload;

      console.log('[AlarmProvider] Executing alarm:', {
        title,
        time,
        userId,
        timestamp: new Date().toISOString(),
      });

      // TODO: Implement real alarm/sound trigger
      // For now: log to console
      // Future: integrate with device alarm API, play sound, etc.

      return { success: true };
    } catch (error) {
      console.error('[AlarmProvider] Execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Alarm failed',
      };
    }
  }
}

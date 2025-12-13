import { BaseExecutionProvider, ExecutionResult } from './base-provider';

export class WhatsAppProvider extends BaseExecutionProvider {
  async execute(payload: Record<string, unknown>): Promise<ExecutionResult> {
    try {
      const { to, message, userId } = payload;

      console.log('[WhatsAppProvider] Executing WhatsApp message:', {
        to,
        messageLength: (message as string)?.length || 0,
        userId,
        timestamp: new Date().toISOString(),
      });

      // TODO: Implement real WhatsApp sending
      // For now: log to console
      // Future: integrate with Twilio WhatsApp API, WhatsApp Business API, etc.
      // NOTE: This should ONLY be called AFTER user approval

      return { success: true };
    } catch (error) {
      console.error('[WhatsAppProvider] Execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'WhatsApp failed',
      };
    }
  }
}

import { BaseExecutionProvider, ExecutionResult } from './base-provider';

export class EmailProvider extends BaseExecutionProvider {
  async execute(payload: Record<string, unknown>): Promise<ExecutionResult> {
    try {
      const { to, subject, body, from } = payload;

      console.log('[EmailProvider] Executing email:', {
        to,
        subject,
        from,
        bodyLength: (body as string)?.length || 0,
        timestamp: new Date().toISOString(),
      });

      // TODO: Implement real email sending
      // For now: log to console
      // Future: integrate with Resend, SendGrid, AWS SES, etc.
      // NOTE: This should ONLY be called AFTER user approval

      return { success: true };
    } catch (error) {
      console.error('[EmailProvider] Execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email failed',
      };
    }
  }
}

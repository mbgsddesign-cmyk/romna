import { createServerClient } from './supabase';
import { Notification } from './database.types';

interface DeviceToken {
  token: string;
  platform: 'ios' | 'android';
}

interface DispatchResult {
  success: boolean;
  error?: string;
  shouldRetry: boolean;
}

export class NotificationDispatcher {
  private supabase = createServerClient();
  private readonly MAX_RETRIES = 1;

  /**
   * Main entry point to dispatch pending notifications.
   * Call this from a cron job or after inserting a notification.
   */
  async dispatchPendingNotifications(batchSize = 50) {
    console.log('Starting notification dispatch...');

    // 1. Fetch pending notifications (delivered != true)
    // We use metadata to track delivery status since we can't modify schema
    const { data: notifications, error } = await this.supabase
      .from('notifications')
      .select('*')
      .not('metadata->>delivered', 'eq', 'true') // Filter out already delivered
      .limit(batchSize);

    if (error) {
      console.error('Failed to fetch pending notifications:', error);
      return;
    }

    if (!notifications || notifications.length === 0) {
      console.log('No pending notifications to dispatch.');
      return;
    }

    console.log(`Found ${notifications.length} pending notifications.`);

    // 2. Process each notification
    const results = await Promise.allSettled(
      notifications.map((n) => this.processNotification(n))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    console.log(`Dispatch complete. Success: ${successCount}/${notifications.length}`);
  }

  private async processNotification(notification: Notification) {
    const attempts = (notification.metadata?.delivery_attempts as number) || 0;

    // Check if we should retry
    if (attempts > this.MAX_RETRIES) {
      console.log(`Skipping notification ${notification.id}: Max retries exceeded.`);
      return;
    }

    try {
      // 3. Resolve device tokens
      const tokens = await this.resolveDeviceTokens(notification.user_id);

      if (tokens.length === 0) {
        console.log(`No device tokens found for user ${notification.user_id}. Marking as skipped.`);
        // Mark as "delivered" (or skipped) so we don't keep querying it
        await this.updateDeliveryStatus(notification, true, { skipped: 'no_tokens' });
        return;
      }

      // 4. Send to all devices
      const sendPromises = tokens.map((token) =>
        this.sendToDevice(token, notification)
      );

      const sendResults = await Promise.all(sendPromises);
      const allSuccess = sendResults.every((r) => r.success);

      if (allSuccess) {
        // 5. Mark as delivered
        await this.updateDeliveryStatus(notification, true);
      } else {
        // Handle partial or full failure
        throw new Error('Failed to send to one or more devices');
      }

    } catch (error) {
      console.error(`Error processing notification ${notification.id}:`, error);
      
      // 6. Handle failure (increment attempts)
      await this.handleFailure(notification, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Resolves device tokens for a user.
   * NOTE: Since we cannot change schema to add a 'user_devices' table,
   * this is a placeholder implementation. In a real scenario, this would
   * query a dedicated table.
   */
  private async resolveDeviceTokens(userId: string): Promise<DeviceToken[]> {
    // START PLACEHOLDER IMPLEMENTATION
    // Ideally: const { data } = await this.supabase.from('user_devices').select('*').eq('user_id', userId);
    // For now, we return an empty array to prevent errors, or mock data for testing if user_id matches specific logic.
    
    // Check if we have tokens stored in user_integrations (misused for now as per constraints?)
    // No, strict schema compliance. 
    
    // We return empty array effectively "skipping" delivery but marking as processed.
    return []; 
    // END PLACEHOLDER IMPLEMENTATION
  }

  /**
   * Simulates sending a push notification via APNs or FCM.
   */
  private async sendToDevice(
    device: DeviceToken,
    notification: Notification
  ): Promise<DispatchResult> {
    console.log(`[Dispatcher] Sending ${device.platform} notification to ${device.token}`);
    console.log(`[Dispatcher] Payload: ${notification.title} - ${notification.message}`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock success
    return { success: true, shouldRetry: false };
  }

  private async updateDeliveryStatus(
    notification: Notification,
    delivered: boolean,
    extraMeta: Record<string, unknown> = {}
  ) {
    const metadata = notification.metadata || {};
    
    const updatedMeta = {
      ...metadata,
      ...extraMeta,
      delivered,
      delivered_at: new Date().toISOString(),
    };

    await this.supabase
      .from('notifications')
      .update({ metadata: updatedMeta })
      .eq('id', notification.id);
  }

  private async handleFailure(notification: Notification, errorMessage: string) {
    const metadata = notification.metadata || {};
    const currentAttempts = (metadata.delivery_attempts as number) || 0;

    const updatedMeta = {
      ...metadata,
      delivery_attempts: currentAttempts + 1,
      last_error: errorMessage,
      last_attempt_at: new Date().toISOString(),
    };

    await this.supabase
      .from('notifications')
      .update({ metadata: updatedMeta })
      .eq('id', notification.id);
  }
}

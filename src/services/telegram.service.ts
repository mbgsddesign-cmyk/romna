const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

interface TelegramConfig {
  botToken: string;
}

interface SendMessageParams {
  chatId: string;
  message: string;
  scheduledFor?: Date;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

interface TelegramResponse {
  success: boolean;
  messageId?: number;
  error?: string;
}

interface BotInfo {
  success: boolean;
  botName?: string;
  username?: string;
  error?: string;
}

export async function validateTelegramBot(config: TelegramConfig): Promise<BotInfo> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}${config.botToken}/getMe`);
    
    if (!response.ok) {
      return { success: false, error: 'Invalid bot token' };
    }
    
    const data = await response.json();
    
    if (!data.ok) {
      return { success: false, error: data.description || 'Invalid bot token' };
    }
    
    return {
      success: true,
      botName: data.result.first_name,
      username: data.result.username,
    };
  } catch (error) {
    return { success: false, error: 'Failed to validate bot token' };
  }
}

export async function sendTelegramMessage(
  config: TelegramConfig,
  params: SendMessageParams
): Promise<TelegramResponse> {
  if (params.scheduledFor && params.scheduledFor > new Date()) {
    return {
      success: true,
      messageId: Date.now(),
    };
  }

  try {
    const payload: Record<string, unknown> = {
      chat_id: params.chatId,
      text: params.message,
    };

    if (params.parseMode) {
      payload.parse_mode = params.parseMode;
    }

    const response = await fetch(`${TELEGRAM_API_URL}${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.description || 'Failed to send message' };
    }

    return { success: true, messageId: data.result.message_id };
  } catch (error) {
    return { success: false, error: 'Failed to send Telegram message' };
  }
}

export async function getUpdates(config: TelegramConfig, offset?: number): Promise<{ success: boolean; updates?: unknown[]; error?: string }> {
  try {
    const url = new URL(`${TELEGRAM_API_URL}${config.botToken}/getUpdates`);
    if (offset) url.searchParams.set('offset', String(offset));
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (!data.ok) {
      return { success: false, error: data.description };
    }
    
    return { success: true, updates: data.result };
  } catch (error) {
    return { success: false, error: 'Failed to get updates' };
  }
}

export async function sendTestTelegramMessage(config: TelegramConfig, chatId: string): Promise<TelegramResponse> {
  return sendTelegramMessage(config, {
    chatId,
    message: '✅ Test message from ROMNA - Your Telegram bot is connected successfully!',
  });
}

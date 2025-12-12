const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

interface WhatsAppConfig {
  phoneId: string;
  accessToken: string;
}

interface SendMessageParams {
  to: string;
  message: string;
  scheduledFor?: Date;
  templateName?: string;
  templateParams?: string[];
}

interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function validateWhatsAppCredentials(config: WhatsAppConfig): Promise<{ success: boolean; phoneNumber?: string; error?: string }> {
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${config.phoneId}`, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'Invalid credentials' };
    }
    
    const data = await response.json();
    return { success: true, phoneNumber: data.display_phone_number };
  } catch (error) {
    return { success: false, error: 'Failed to validate credentials' };
  }
}

export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  params: SendMessageParams
): Promise<WhatsAppResponse> {
  if (params.scheduledFor && params.scheduledFor > new Date()) {
    return { 
      success: true, 
      messageId: `scheduled_${Date.now()}`,
    };
  }

  try {
    const payload = params.templateName
      ? {
          messaging_product: 'whatsapp',
          to: params.to,
          type: 'template',
          template: {
            name: params.templateName,
            language: { code: 'en' },
            components: params.templateParams?.length
              ? [{
                  type: 'body',
                  parameters: params.templateParams.map(text => ({ type: 'text', text })),
                }]
              : [],
          },
        }
      : {
          messaging_product: 'whatsapp',
          to: params.to,
          type: 'text',
          text: { body: params.message },
        };

    const response = await fetch(`${WHATSAPP_API_URL}/${config.phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'Failed to send message' };
    }

    const data = await response.json();
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    return { success: false, error: 'Failed to send WhatsApp message' };
  }
}

export async function sendTestWhatsAppMessage(config: WhatsAppConfig): Promise<WhatsAppResponse> {
  return sendWhatsAppMessage(config, {
    to: '1234567890',
    message: 'Test message from ROMNA',
  });
}

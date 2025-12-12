interface EmailConfig {
  accessToken: string;
  refreshToken?: string;
}

interface SendEmailParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
  };
  internalDate: string;
}

export async function sendEmail(
  config: EmailConfig,
  params: SendEmailParams
): Promise<EmailResponse> {
  try {
    const message = createRawEmail(params);
    
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: message }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'Failed to send email' };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error) {
    return { success: false, error: 'Failed to send email' };
  }
}

function createRawEmail(params: SendEmailParams): string {
  const boundary = '----=_Part_' + Date.now();
  const headers = [
    `To: ${params.to.join(', ')}`,
    params.cc?.length ? `Cc: ${params.cc.join(', ')}` : '',
    params.bcc?.length ? `Bcc: ${params.bcc.join(', ')}` : '',
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: ${params.isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
  ].filter(Boolean).join('\r\n');

  const email = `${headers}\r\n\r\n${params.body}`;
  
  return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function fetchInbox(
  config: EmailConfig,
  maxResults: number = 20
): Promise<{ success: boolean; messages?: GmailMessage[]; error?: string }> {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message };
    }

    const data = await response.json();
    const messageIds = data.messages || [];
    
    const messages = await Promise.all(
      messageIds.slice(0, 10).map(async (msg: { id: string }) => {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`,
          {
            headers: {
              'Authorization': `Bearer ${config.accessToken}`,
            },
          }
        );
        return msgResponse.json();
      })
    );

    return { success: true, messages };
  } catch (error) {
    return { success: false, error: 'Failed to fetch inbox' };
  }
}

export async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<{ accessToken?: string; error?: string }> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      return { error: 'Failed to refresh token' };
    }

    const data = await response.json();
    return { accessToken: data.access_token };
  } catch (error) {
    return { error: 'Failed to refresh token' };
  }
}

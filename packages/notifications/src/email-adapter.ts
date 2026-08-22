import { logger } from '@jaago/logger';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailProviderAdapter {
  send(message: EmailMessage): Promise<{ success: boolean; messageId: string }>;
}

export class MockEmailAdapter implements EmailProviderAdapter {
  private sentMessages: EmailMessage[] = [];

  public async send(message: EmailMessage): Promise<{ success: boolean; messageId: string }> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.sentMessages.push(message);

    logger.info('SYSTEM', 'email.sent_mock', {
      metadata: {
        to: message.to,
        subject: message.subject,
        messageId,
      },
    });

    return { success: true, messageId };
  }

  public getSentMessages(): EmailMessage[] {
    return this.sentMessages;
  }

  public clear(): void {
    this.sentMessages = [];
  }
}

export function getEmailAdapter(): EmailProviderAdapter {
  // Returns mock adapter for development/test, or can instantiate Resend/SMTP
  return new MockEmailAdapter();
}

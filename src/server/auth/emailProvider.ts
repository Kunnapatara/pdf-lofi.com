/**
 * Transactional Email Provider Abstraction (Server-Side)
 * - Supports real production delivery via SMTP (Nodemailer) or API (Resend)
 * - Clean interface with dependency injection for test verification
 * - Never claims delivery succeeded when provider fails
 * - Fails safely without leaking provider secrets or credentials
 */
import nodemailer, { Transporter } from 'nodemailer';

export interface SendOtpParams {
  to: string;
  code: string;
  expiresInMinutes: number;
  purpose: 'login' | 'email_change';
}

export interface SendOtpResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export interface EmailProvider {
  name: string;
  sendOtp(params: SendOtpParams): Promise<SendOtpResult>;
}

/**
 * Standard SMTP Email Provider (Nodemailer)
 * Works with AWS SES, SendGrid, Mailgun, Postmark, Google Workspace, or custom SMTP servers.
 */
export class SmtpEmailProvider implements EmailProvider {
  public name = 'smtp';
  private transporter: Transporter | null = null;
  private fromAddress: string;

  constructor(options?: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    from?: string;
  }) {
    const host = options?.host || process.env.SMTP_HOST;
    const port = options?.port || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587);
    const secure = options?.secure !== undefined ? options.secure : (process.env.SMTP_SECURE === 'true' || port === 465);
    const user = options?.user || process.env.SMTP_USER;
    const pass = options?.pass || process.env.SMTP_PASS;
    this.fromAddress = options?.from || process.env.EMAIL_FROM || 'PDF-LoFi <auth@pdf-lofi.com>';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
    }
  }

  async sendOtp(params: SendOtpParams): Promise<SendOtpResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'SMTP transporter is not configured. Missing SMTP_HOST, SMTP_USER, or SMTP_PASS.',
      };
    }

    const subject =
      params.purpose === 'email_change'
        ? `[PDF-LoFi] Verify your new email address`
        : `[PDF-LoFi] Your login verification code`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 20px; color: #1c1917;">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #0c0a09; margin: 0 0 8px 0;">PDF-LoFi Account Verification</h2>
          <p style="font-size: 14px; color: #57534e; margin: 0;">Use the single-use code below to complete your sign-in.</p>
        </div>
        <div style="background-color: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0c0a09;">${params.code}</span>
        </div>
        <p style="font-size: 13px; color: #78716c; margin: 0 0 16px 0;">
          This code is valid for <strong>${params.expiresInMinutes} minutes</strong> and can only be used once. If you did not request this code, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 24px 0;" />
        <p style="font-size: 11px; color: #a8a29e; margin: 0;">
          PDF-LoFi — Private, local-first PDF tools.
        </p>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: params.to,
        subject,
        html,
        text: `Your PDF-LoFi verification code is: ${params.code}. It expires in ${params.expiresInMinutes} minutes.`,
      });
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('[EmailProvider:SMTP] Failed to send email:', err?.message);
      return { success: false, error: 'Failed to deliver email through SMTP server.' };
    }
  }
}

/**
 * Resend API Email Provider
 * Direct HTTPS REST call to Resend API.
 */
export class ResendEmailProvider implements EmailProvider {
  public name = 'resend';
  private apiKey: string;
  private fromAddress: string;

  constructor(apiKey?: string, from?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY || '';
    this.fromAddress = from || process.env.EMAIL_FROM || 'PDF-LoFi <auth@pdf-lofi.com>';
  }

  async sendOtp(params: SendOtpParams): Promise<SendOtpResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'RESEND_API_KEY is not configured on the server.',
      };
    }

    const subject =
      params.purpose === 'email_change'
        ? `[PDF-LoFi] Verify your new email address`
        : `[PDF-LoFi] Your login verification code`;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [params.to],
          subject,
          text: `Your PDF-LoFi verification code is: ${params.code}. It expires in ${params.expiresInMinutes} minutes.`,
          html: `<div style="font-family: sans-serif; padding: 20px;"><h2>PDF-LoFi Verification</h2><p>Your code is: <strong>${params.code}</strong> (expires in ${params.expiresInMinutes} mins).</p></div>`,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[EmailProvider:Resend] API Error:', res.status, errorText);
        return { success: false, error: `Resend API returned status ${res.status}` };
      }

      const data: any = await res.json();
      return { success: true, messageId: data?.id };
    } catch (err: any) {
      console.error('[EmailProvider:Resend] Network error:', err?.message);
      return { success: false, error: 'Failed to deliver email via Resend API.' };
    }
  }
}

/**
 * Development & Local Fallback Email Provider
 * Only allowed when NODE_ENV !== 'production'.
 * Explicitly records generated code for local developer workflow.
 */
export class DevEmailProvider implements EmailProvider {
  public name = 'dev-fallback';

  async sendOtp(params: SendOtpParams): Promise<SendOtpResult> {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'Production environment requires a configured transactional email provider (SMTP or Resend).',
      };
    }
    console.log(`[DevEmailProvider] DISPATCHED OTP to ${params.to}: [${params.code}] (valid ${params.expiresInMinutes}m)`);
    return { success: true, messageId: `dev_${Date.now()}` };
  }
}

/**
 * Test Mock Email Provider
 * Records delivered messages in memory for test assertions.
 */
export class TestEmailProvider implements EmailProvider {
  public name = 'test-mock';
  public sentMessages: SendOtpParams[] = [];
  public shouldFail = false;
  public failureReason = 'Mock email provider delivery failed';

  async sendOtp(params: SendOtpParams): Promise<SendOtpResult> {
    if (this.shouldFail) {
      return { success: false, error: this.failureReason };
    }
    this.sentMessages.push({ ...params });
    return { success: true, messageId: `test_${Date.now()}_${this.sentMessages.length}` };
  }

  clear() {
    this.sentMessages = [];
    this.shouldFail = false;
  }
}

// Active provider singleton / configurable instance
let activeEmailProvider: EmailProvider | null = null;

export function setEmailProvider(provider: EmailProvider | null): void {
  activeEmailProvider = provider;
}

export function getEmailProvider(): EmailProvider {
  if (activeEmailProvider) {
    return activeEmailProvider;
  }

  // 1. Check for explicit Resend configuration
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0) {
    activeEmailProvider = new ResendEmailProvider();
    return activeEmailProvider;
  }

  // 2. Check for SMTP configuration
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    activeEmailProvider = new SmtpEmailProvider();
    return activeEmailProvider;
  }

  // 3. In non-production, fallback to DevEmailProvider
  if (process.env.NODE_ENV !== 'production') {
    activeEmailProvider = new DevEmailProvider();
    return activeEmailProvider;
  }

  // 4. In production without credentials, return an unconfigured SMTP provider that will fail closed
  activeEmailProvider = new SmtpEmailProvider();
  return activeEmailProvider;
}

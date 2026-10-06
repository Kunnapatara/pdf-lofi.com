/**
 * Account Ownership & OTP Verification Layer (Server-Side)
 * Provides cryptographically secure, short-lived, single-use email verification.
 * Prevents account claiming by email alone.
 */
import crypto from 'crypto';
import { SaaSDatabase } from '../storage/db';
import { getSessionSecret } from './session';
import { EmailProvider, getEmailProvider } from './emailProvider';

export interface OtpGenerationResult {
  success: boolean;
  expiresAt: number;
  message: string;
  devCode?: string; // Only populated in non-production
  error?: string;
}

export interface OtpVerificationResult {
  valid: boolean;
  error?: string;
  message?: string;
}

export class AccountOwnershipManager {
  private db: SaaSDatabase;
  private emailProvider?: EmailProvider;

  constructor(db: SaaSDatabase, emailProvider?: EmailProvider) {
    this.db = db;
    this.emailProvider = emailProvider;
  }

  setEmailProvider(provider: EmailProvider): void {
    this.emailProvider = provider;
  }

  /**
   * Generates, stores, and dispatches a short-lived (10 min) single-use OTP for email ownership verification.
   * Throttles requests to max 5 requests per 15 minutes per email.
   * Real email delivery abstraction is used in production.
   * If delivery fails, the OTP challenge is deleted immediately so it cannot be used.
   */
  async requestOtp(
    email: string,
    purpose: 'login' | 'email_change' = 'login',
    customProvider?: EmailProvider
  ): Promise<OtpGenerationResult> {
    const cleanEmail = email.trim().toLowerCase();
    const now = Date.now();
    const fifteenMinsAgo = now - 15 * 60 * 1000;

    // Rate-limiting check: max 5 requests per 15 minutes
    const recentRequestsRow = this.db.db
      .prepare(
        'SELECT count(*) as count FROM auth_verification_codes WHERE email = ? AND created_at > ?'
      )
      .get(cleanEmail, fifteenMinsAgo) as { count: number };

    if (recentRequestsRow && recentRequestsRow.count >= 5) {
      return {
        success: false,
        expiresAt: 0,
        error: 'RATE_LIMITED',
        message: 'Too many verification requests. Please wait a few minutes before trying again.',
      };
    }

    // Invalidate any existing active codes for this email and purpose
    this.db.db
      .prepare('DELETE FROM auth_verification_codes WHERE email = ? AND purpose = ?')
      .run(cleanEmail, purpose);

    // Generate 6-digit cryptographically random code
    const code = crypto.randomInt(100000, 999999).toString();
    const secret = getSessionSecret();
    const codeHash = crypto.createHmac('sha256', secret).update(code).digest('hex');

    const codeId = `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    this.db.db
      .prepare(
        `INSERT INTO auth_verification_codes (
          id, email, code_hash, purpose, expires_at, attempts, max_attempts, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(codeId, cleanEmail, codeHash, purpose, expiresAt, 0, 5, now);

    // Real transactional email delivery
    const provider = customProvider || this.emailProvider || getEmailProvider();
    const delivery = await provider.sendOtp({
      to: cleanEmail,
      code,
      expiresInMinutes: 10,
      purpose,
    });

    const isProd = process.env.NODE_ENV === 'production';

    if (!delivery.success) {
      // Invalidate undelivered challenge so it cannot accidentally become usable
      this.db.db.prepare('DELETE FROM auth_verification_codes WHERE id = ?').run(codeId);
      console.warn(`[Auth Verification] Delivery failed to ${cleanEmail}: ${delivery.error}`);
      return {
        success: false,
        expiresAt: 0,
        error: 'DELIVERY_FAILED',
        message: 'Failed to deliver verification code. Please check the email address and try again.',
      };
    }

    // Logging: NEVER log plaintext OTP in production
    if (!isProd) {
      console.log(`[Auth Verification] Generated code for ${cleanEmail} (${purpose}): ${code}`);
    } else {
      console.log(`[Auth Verification] Verification challenge delivered via [${provider.name}] to ${cleanEmail} (${purpose})`);
    }

    return {
      success: true,
      expiresAt,
      message: 'A verification code has been dispatched. Please enter the 6-digit code to verify account ownership.',
      devCode: !isProd ? code : undefined,
    };
  }

  /**
   * Verifies the submitted OTP against the stored cryptographic hash.
   * Single-use: invalidates the code immediately upon success or after max attempts.
   */
  verifyOtp(email: string, code: string, purpose: 'login' | 'email_change' = 'login'): OtpVerificationResult {
    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      return {
        valid: false,
        error: 'INVALID_CODE_FORMAT',
        message: 'Verification code must be a 6-digit number.',
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const now = Date.now();

    const record = this.db.db
      .prepare(
        `SELECT id, code_hash, expires_at, attempts, max_attempts
         FROM auth_verification_codes
         WHERE email = ? AND purpose = ? AND expires_at > ?
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(cleanEmail, purpose, now) as
      | { id: string; code_hash: string; expires_at: number; attempts: number; max_attempts: number }
      | undefined;

    if (!record) {
      return {
        valid: false,
        error: 'INVALID_OR_EXPIRED_CODE',
        message: 'Verification code is invalid, expired, or was already used. Please request a new code.',
      };
    }

    // Check attempts limit
    if (record.attempts >= record.max_attempts) {
      this.db.db.prepare('DELETE FROM auth_verification_codes WHERE id = ?').run(record.id);
      return {
        valid: false,
        error: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.',
      };
    }

    // Increment attempts
    this.db.db
      .prepare('UPDATE auth_verification_codes SET attempts = attempts + 1 WHERE id = ?')
      .run(record.id);

    // Verify hash using constant-time comparison
    const secret = getSessionSecret();
    const expectedHash = crypto.createHmac('sha256', secret).update(cleanCode).digest('hex');

    const hashBuf = Buffer.from(record.code_hash, 'utf8');
    const expectedBuf = Buffer.from(expectedHash, 'utf8');

    let isValid = false;
    if (hashBuf.length === expectedBuf.length) {
      isValid = crypto.timingSafeEqual(hashBuf, expectedBuf);
    }

    if (!isValid) {
      return {
        valid: false,
        error: 'INVALID_CODE',
        message: `Incorrect verification code. ${record.max_attempts - (record.attempts + 1)} attempts remaining.`,
      };
    }

    // Code is valid: delete immediately (single use protection)
    this.db.db.prepare('DELETE FROM auth_verification_codes WHERE id = ?').run(record.id);

    return {
      valid: true,
      message: 'Account ownership verified successfully.',
    };
  }
}

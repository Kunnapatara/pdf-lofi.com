/**
 * Auth API Routes
 * Server-authoritative user identity, account ownership, and session management.
 * - Strict session issuance via cryptographically signed tokens
 * - Rejects unverified client-supplied user identifiers
 * - Cryptographic email OTP verification prevents claiming existing accounts by email alone
 * - Email updates strictly require OTP ownership verification of the new email
 * - Session cookies retain secure, HttpOnly, SameSite=Lax production properties
 * - Zero fallback to fabricated identities (no fake user creation on unauthenticated visits)
 */
import { Router } from 'express';
import { saasStore } from '../storage/saasStore';
import {
  createSignedSessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  AuthenticatedRequest,
  extractSessionToken,
  verifySignedSessionToken,
} from '../auth/session';

export const authRouter = Router();

/**
 * GET /api/auth/me
 * Returns current authenticated user if valid session exists.
 * Returns 401 if unauthenticated (no silent fallback to default user).
 */
authRouter.get('/me', (req: AuthenticatedRequest, res) => {
  const token = extractSessionToken(req);
  const session = verifySignedSessionToken(token);

  if (!session) {
    return res.status(401).json({
      authenticated: false,
      user: null,
      error: 'UNAUTHORIZED',
      message: 'No active authenticated session.',
    });
  }

  const user = saasStore.getUser(session.userId);
  if (!user) {
    return res.status(401).json({
      authenticated: false,
      user: null,
      error: 'USER_NOT_FOUND',
      message: 'User associated with session does not exist.',
    });
  }

  return res.json({
    authenticated: true,
    user,
  });
});

/**
 * POST /api/auth/otp/request
 * Alias: POST /api/auth/request-otp
 * Dispatches a short-lived 6-digit OTP to the requested email.
 * Rate-limited and fails safely without leaking account existence.
 */
async function handleOtpRequest(req: any, res: any) {
  const { email, purpose = 'login' } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({
      error: 'INVALID_EMAIL',
      message: 'A valid email address is required to request a verification code.',
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const validPurpose = purpose === 'email_change' ? 'email_change' : 'login';

  const ownershipManager = saasStore.getOwnershipManager();
  const result = await ownershipManager.requestOtp(cleanEmail, validPurpose);

  if (!result.success) {
    const status = result.error === 'RATE_LIMITED' ? 429 : 503;
    return res.status(status).json({
      error: result.error || 'DELIVERY_FAILED',
      message: result.message,
    });
  }

  return res.json({
    success: true,
    message: result.message,
    expiresAt: result.expiresAt,
    devCode: result.devCode, // Only populated in non-production for testing
  });
}

authRouter.post('/otp/request', handleOtpRequest);
authRouter.post('/request-otp', handleOtpRequest);

/**
 * POST /api/auth/otp/verify
 * Alias: POST /api/auth/verify-otp
 * Validates the single-use OTP and establishes an authenticated session.
 */
function handleOtpVerify(req: any, res: any) {
  const { email, code, name } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({
      error: 'INVALID_EMAIL',
      message: 'A valid email address is required.',
    });
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      error: 'INVALID_CODE',
      message: 'A 6-digit verification code is required.',
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  const ownershipManager = saasStore.getOwnershipManager();
  const verification = ownershipManager.verifyOtp(cleanEmail, cleanCode, 'login');

  if (!verification.valid) {
    const status = verification.error === 'MAX_ATTEMPTS_EXCEEDED' ? 429 : 400;
    return res.status(status).json({
      error: verification.error || 'INVALID_CODE',
      message: verification.message,
    });
  }

  // Account ownership verified: find or create account
  let user = saasStore.findUserByEmail(cleanEmail);
  let isNew = false;

  if (!user) {
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    user = saasStore.saveUser({
      id: newUserId,
      email: cleanEmail,
      name: name && typeof name === 'string' && name.trim().length > 0 ? name.trim() : 'PDF Creator',
      createdAt: Date.now(),
    });
    isNew = true;
  } else if (name && typeof name === 'string' && name.trim().length > 0 && user.name === 'PDF Creator') {
    user = saasStore.saveUser({
      ...user,
      name: name.trim(),
    });
  }

  const token = createSignedSessionToken(user.id);
  setSessionCookie(res, token);

  return res.json({
    success: true,
    user,
    token,
    isNew,
  });
}

authRouter.post('/otp/verify', handleOtpVerify);
authRouter.post('/verify-otp', handleOtpVerify);

/**
 * POST /api/auth/session
 * Strict authentication boundary:
 * If an account already exists for the email, it CANNOT be claimed by email alone.
 * Must provide verification code to establish a session.
 */
authRouter.post('/session', (req, res) => {
  const { email, code, name } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({
      error: 'INVALID_EMAIL',
      message: 'A valid email address is required to establish a user session.',
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existingUser = saasStore.findUserByEmail(cleanEmail);

  // If code is provided, verify OTP
  if (code && typeof code === 'string') {
    return handleOtpVerify(req, res);
  }

  // FAIL CLOSED: Existing accounts CANNOT be claimed without OTP ownership verification!
  if (existingUser) {
    return res.status(403).json({
      error: 'OWNERSHIP_VERIFICATION_REQUIRED',
      message:
        'An account already exists for this email address. To access your paid or existing account, please request and verify a one-time code (OTP).',
      requiresOtp: true,
    });
  }

  // For brand new accounts requesting direct registration, require OTP to prevent squatting
  return res.status(403).json({
    error: 'OWNERSHIP_VERIFICATION_REQUIRED',
    message: 'Please verify email ownership with a one-time code before establishing an account.',
    requiresOtp: true,
  });
});

/**
 * POST /api/auth/init
 * Initializes or restores an authenticated session.
 * If a valid signed session token exists, returns the authenticated user.
 * If no session exists, returns authenticated: false and user: null.
 * Strictly DOES NOT fabricate default identities (no fake user creation on unauthenticated visits).
 */
authRouter.post('/init', (req: AuthenticatedRequest, res) => {
  const existingToken = extractSessionToken(req);
  const session = verifySignedSessionToken(existingToken);

  if (session) {
    const existingUser = saasStore.getUser(session.userId);
    if (existingUser) {
      return res.json({
        success: true,
        authenticated: true,
        user: existingUser,
        token: existingToken,
        isNew: false,
      });
    }
  }

  // Unauthenticated visitor: return null user
  return res.json({
    success: true,
    authenticated: false,
    user: null,
    token: null,
    isNew: false,
  });
});

/**
 * POST /api/auth/update
 * Update profile of the currently authenticated user.
 * Strictly checks session credentials; rejects arbitrary user IDs.
 * Changing email requires ownership verification of the new email with an OTP.
 */
authRouter.post('/update', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { name, email, verificationCode } = req.body || {};

  const cleanName = name && typeof name === 'string' ? name.trim() : user.name;
  let cleanEmail = user.email;

  if (email && typeof email === 'string' && email.includes('@')) {
    const candidateEmail = email.trim().toLowerCase();
    if (candidateEmail !== user.email.toLowerCase()) {
      // Email change requested: verify ownership of candidate email
      if (!verificationCode || typeof verificationCode !== 'string') {
        return res.status(403).json({
          error: 'EMAIL_VERIFICATION_REQUIRED',
          message:
            'Ownership of the new email address must be verified. Please request and submit a verification code for the new email.',
        });
      }

      const ownershipManager = saasStore.getOwnershipManager();
      const verification = ownershipManager.verifyOtp(candidateEmail, verificationCode.trim(), 'email_change');
      if (!verification.valid) {
        return res.status(400).json({
          error: verification.error || 'INVALID_VERIFICATION_CODE',
          message: verification.message,
        });
      }

      // Check if candidate email is already taken by another account
      const existingAccount = saasStore.findUserByEmail(candidateEmail);
      if (existingAccount && existingAccount.id !== user.id) {
        return res.status(409).json({
          error: 'EMAIL_ALREADY_IN_USE',
          message: 'The requested email address is already associated with another account.',
        });
      }

      cleanEmail = candidateEmail;
    }
  }

  const updated = saasStore.saveUser({
    ...user,
    name: cleanName,
    email: cleanEmail,
  });

  return res.json({ success: true, user: updated });
});

/**
 * POST /api/auth/logout
 * Clears session cookie
 */
authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * Session Security Layer (Server-Side)
 * - Cryptographically signed session tokens (HMAC SHA-256)
 * - Strict server-authoritative identity: client cannot choose or spoof user_id
 * - Session expiry and tamper detection
 */
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { saasStore } from '../storage/saasStore';
import { SaaSUser } from '../../types/saas';

// Derive or generate a server-side session secret
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.LEMON_SQUEEZY_WEBHOOK_SECRET ||
  'pdf-lofi-dev-session-secret-key-32-chars-long';

const SESSION_COOKIE_NAME = 'pdf_lofi_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionPayload {
  userId: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Creates a tamper-proof signed session token: base64(payload).signature
 */
export function createSignedSessionToken(userId: string): string {
  const payload: SessionPayload = {
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Validates a signed session token and extracts the verified payload.
 * Returns null if missing, expired, or tampered with.
 */
export function verifySignedSessionToken(token?: string | null): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');

    if (sigBuf.length !== expectedBuf.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload: SessionPayload = JSON.parse(payloadJson);

    if (!payload.userId || typeof payload.userId !== 'string') {
      return null;
    }

    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts session token from Cookie header or Authorization Bearer header
 */
export function extractSessionToken(req: Request): string | null {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Parse cookie header manually without external cookie-parser dependency
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${SESSION_COOKIE_NAME}=`)) {
        return decodeURIComponent(cookie.substring(SESSION_COOKIE_NAME.length + 1));
      }
    }
  }

  return null;
}

export function setSessionCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  // Standard http-only cookie header with SameSite=Lax
  const maxAgeSec = Math.floor(SESSION_DURATION_MS / 1000);
  const cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(
    token
  )}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookie);
}

export function clearSessionCookie(res: Response) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
  );
}

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: SaaSUser;
  session?: SessionPayload;
}

/**
 * Authentication Middleware
 * Strictly enforces that user identity originates from a verified session token.
 * Ignores any client-supplied x-user-id or body.userId for authorization.
 * If requireAuth is true and session is missing/invalid: returns 401 Unauthorized.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractSessionToken(req);
  const session = verifySignedSessionToken(token);

  if (!session) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please authenticate to access billing or account resources.',
    });
  }

  const user = saasStore.getUser(session.userId);
  if (!user) {
    return res.status(401).json({
      error: 'USER_NOT_FOUND',
      message: 'Session references a user account that does not exist.',
    });
  }

  req.user = user;
  req.session = session;
  next();
}

/**
 * Optional Authentication Middleware
 * Validates session if present.
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractSessionToken(req);
  const session = verifySignedSessionToken(token);

  if (session) {
    const user = saasStore.getUser(session.userId);
    if (user) {
      req.user = user;
      req.session = session;
    }
  }

  next();
}

/**
 * Auth API Routes
 * Server-authoritative user identity and session management.
 * - Strict session issuance via cryptographically signed tokens
 * - Rejects unverified client-supplied user identifiers
 * - Explicit login, register, anonymous/guest session, and logout endpoints
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
 * POST /api/auth/session
 * Establish an authenticated session for an existing or new user account.
 * Client sends email/name. Server assigns or looks up user and issues a signed session.
 */
authRouter.post('/session', (req, res) => {
  const { email, name } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({
      error: 'INVALID_EMAIL',
      message: 'A valid email address is required to establish a user session.',
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  let user = saasStore.findUserByEmail(cleanEmail);

  if (!user) {
    // Register new user
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    user = saasStore.saveUser({
      id: newUserId,
      email: cleanEmail,
      name: name && typeof name === 'string' && name.trim().length > 0 ? name.trim() : 'PDF Creator',
      createdAt: Date.now(),
    });
  }

  const token = createSignedSessionToken(user.id);
  setSessionCookie(res, token);

  return res.json({
    success: true,
    user,
    token, // Also returned in JSON for clients that use Bearer auth
  });
});

/**
 * POST /api/auth/init
 * Initializes or restores a session. If a valid session cookie exists, returns it.
 * If no session exists, creates a dedicated, isolated user account for the browser session.
 * Does NOT share or mutate the singleton default user.
 */
authRouter.post('/init', (req: AuthenticatedRequest, res) => {
  const existingToken = extractSessionToken(req);
  const session = verifySignedSessionToken(existingToken);

  if (session) {
    const existingUser = saasStore.getUser(session.userId);
    if (existingUser) {
      return res.json({
        success: true,
        user: existingUser,
        token: existingToken,
        isNew: false,
      });
    }
  }

  // Generate a dedicated isolated user account for this browser session
  const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser = saasStore.saveUser({
    id: newUserId,
    email: `creator_${newUserId.substring(4, 10)}@pdf-lofi.com`,
    name: 'PDF Creator',
    createdAt: Date.now(),
  });

  const token = createSignedSessionToken(newUser.id);
  setSessionCookie(res, token);

  return res.json({
    success: true,
    user: newUser,
    token,
    isNew: true,
  });
});

/**
 * POST /api/auth/update
 * Update profile of the currently authenticated user.
 * Strictly checks session credentials; rejects arbitrary user IDs.
 */
authRouter.post('/update', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { name, email } = req.body || {};

  const updated = saasStore.saveUser({
    ...user,
    name: name && typeof name === 'string' ? name.trim() : user.name,
    email: email && typeof email === 'string' && email.includes('@') ? email.trim().toLowerCase() : user.email,
  });

  return res.json({ user: updated });
});

/**
 * POST /api/auth/logout
 * Clears session cookie
 */
authRouter.post('/logout', (req, res) => {
  clearSessionCookie(res);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

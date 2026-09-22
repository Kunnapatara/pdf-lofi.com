/**
 * Auth API Routes
 * Server-side user identity management
 */
import { Router } from 'express';
import { saasStore } from '../storage/saasStore';

export const authRouter = Router();

// Current user identity
authRouter.get('/me', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || saasStore.getDefaultUser().id;
  const user = saasStore.getUser(userId) || saasStore.getDefaultUser();
  res.json({ user });
});

// Update profile
authRouter.post('/update', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || saasStore.getDefaultUser().id;
  const existing = saasStore.getUser(userId) || saasStore.getDefaultUser();
  const { name, email } = req.body || {};

  const updated = saasStore.saveUser({
    ...existing,
    name: name ? String(name).trim() : existing.name,
    email: email ? String(email).trim() : existing.email,
  });

  res.json({ user: updated });
});

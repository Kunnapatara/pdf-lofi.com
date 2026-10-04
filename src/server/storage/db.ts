/**
 * Production SQLite Database Layer (Server-Side)
 * Powered by Node.js built-in node:sqlite (DatabaseSync)
 * Provides durable ACID storage, WAL concurrency, and safe schema migration.
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { SaaSUser, UserSubscription, UserUsage, PlanDefinition } from '../../types/saas';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, 'saas.db');

export class SaaSDatabase {
  public db: DatabaseSync;
  private inSavepoint = false;

  constructor(filePath: string = DB_PATH) {
    this.db = new DatabaseSync(filePath);
    this.initPragmas();
    this.initSchema();
    this.migrateFromJsonStore();
  }

  private initPragmas(): void {
    try {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
      this.db.exec('PRAGMA busy_timeout = 5000;');
      this.db.exec('PRAGMA foreign_keys = ON;');
    } catch (err) {
      console.warn('[Database] Notice setting pragmas:', err);
    }
  }

  private initSchema(): void {
    this.db.exec(`
      -- Users Table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      -- Subscriptions Table
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        plan_id TEXT NOT NULL,
        status TEXT NOT NULL,
        lemon_squeezy_subscription_id TEXT UNIQUE,
        lemon_squeezy_customer_id TEXT,
        lemon_squeezy_order_id TEXT,
        lemon_squeezy_variant_id TEXT,
        renews_at TEXT,
        ends_at TEXT,
        trial_ends_at TEXT,
        is_paused INTEGER NOT NULL DEFAULT 0,
        cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        lemon_squeezy_updated_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_subs_ls_id ON subscriptions(lemon_squeezy_subscription_id);
      CREATE INDEX IF NOT EXISTS idx_subs_customer_id ON subscriptions(lemon_squeezy_customer_id);

      -- Usage Ledger Table
      CREATE TABLE IF NOT EXISTS usage (
        user_id TEXT NOT NULL,
        period TEXT NOT NULL,
        credits_total INTEGER NOT NULL,
        credits_used INTEGER NOT NULL,
        credits_remaining INTEGER NOT NULL,
        operations_count INTEGER NOT NULL,
        PRIMARY KEY (user_id, period)
      );

      -- Usage Events History Table
      CREATE TABLE IF NOT EXISTS usage_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        period TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        description TEXT NOT NULL,
        credits_cost INTEGER NOT NULL,
        idempotency_key TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (user_id, period) REFERENCES usage(user_id, period) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_usage_events_user_period ON usage_events(user_id, period, timestamp DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_events_idempotency ON usage_events(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

      -- Webhook Event Idempotency Ledger Table
      CREATE TABLE IF NOT EXISTS webhook_events (
        event_id TEXT PRIMARY KEY,
        event_name TEXT NOT NULL,
        processed_at INTEGER NOT NULL,
        status TEXT NOT NULL
      );

      -- Provider Subscription Ordering Timestamp Table
      CREATE TABLE IF NOT EXISTS provider_subscription_timestamps (
        provider_sub_id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL
      );

      -- Account Ownership OTP Verification Codes Table
      CREATE TABLE IF NOT EXISTS auth_verification_codes (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        purpose TEXT NOT NULL, -- 'login', 'email_change'
        expires_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_auth_codes_lookup ON auth_verification_codes(email, expires_at);
    `);
  }

  /**
   * Safe migration from legacy data/saas-store.json to SQLite database.
   * Runs only if the SQLite users table is currently empty and saas-store.json exists.
   * Preserves existing data without deletion.
   */
  private migrateFromJsonStore(): void {
    const jsonPath = path.join(dataDir, 'saas-store.json');
    if (!fs.existsSync(jsonPath)) return;

    try {
      const userCountRow = this.db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
      if (userCountRow && userCountRow.count > 0) {
        return; // Already populated
      }

      const raw = fs.readFileSync(jsonPath, 'utf8');
      const data = JSON.parse(raw);

      this.db.exec('BEGIN IMMEDIATE');

      // Migrate Users
      if (data.users && typeof data.users === 'object') {
        const insertUser = this.db.prepare(
          'INSERT OR IGNORE INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)'
        );
        for (const u of Object.values(data.users) as any[]) {
          if (u && u.id && u.email) {
            insertUser.run(u.id, u.email.toLowerCase(), u.name || 'PDF Creator', u.createdAt || Date.now());
          }
        }
      }

      // Migrate Subscriptions
      if (data.subscriptions && typeof data.subscriptions === 'object') {
        const insertSub = this.db.prepare(`
          INSERT OR IGNORE INTO subscriptions (
            id, user_id, plan_id, status, lemon_squeezy_subscription_id,
            lemon_squeezy_customer_id, lemon_squeezy_order_id, lemon_squeezy_variant_id,
            renews_at, ends_at, trial_ends_at, is_paused, cancel_at_period_end,
            created_at, updated_at, lemon_squeezy_updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of Object.values(data.subscriptions) as any[]) {
          if (s && s.id && s.userId) {
            insertSub.run(
              s.id,
              s.userId,
              s.planId || 'free',
              s.status || 'active',
              s.lemonSqueezySubscriptionId || null,
              s.lemonSqueezyCustomerId || null,
              s.lemonSqueezyOrderId || null,
              s.lemonSqueezyVariantId || null,
              s.renewsAt || null,
              s.endsAt || null,
              s.trialEndsAt || null,
              s.isPaused ? 1 : 0,
              s.cancelAtPeriodEnd ? 1 : 0,
              s.createdAt || Date.now(),
              s.updatedAt || Date.now(),
              s.lemonSqueezyUpdatedAt || null
            );
          }
        }
      }

      // Migrate Usage
      if (data.usage && typeof data.usage === 'object') {
        const insertUsage = this.db.prepare(`
          INSERT OR IGNORE INTO usage (user_id, period, credits_total, credits_used, credits_remaining, operations_count)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const insertEvent = this.db.prepare(`
          INSERT OR IGNORE INTO usage_events (id, user_id, period, operation_type, description, credits_cost, idempotency_key, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const u of Object.values(data.usage) as any[]) {
          if (u && u.userId && u.period) {
            insertUsage.run(
              u.userId,
              u.period,
              u.creditsTotal ?? 10,
              u.creditsUsed ?? 0,
              u.creditsRemaining ?? 10,
              u.operationsCount ?? 0
            );

            if (Array.isArray(u.recentEvents)) {
              for (const ev of u.recentEvents) {
                if (ev && ev.id) {
                  insertEvent.run(
                    ev.id,
                    u.userId,
                    u.period,
                    ev.type || 'pdf_operation_local',
                    ev.description || 'Local operation',
                    ev.credits || 0,
                    null,
                    ev.timestamp || Date.now()
                  );
                }
              }
            }
          }
        }
      }

      // Migrate Webhook events
      if (data.webhookEvents && typeof data.webhookEvents === 'object') {
        const insertWebhook = this.db.prepare(
          'INSERT OR IGNORE INTO webhook_events (event_id, event_name, processed_at, status) VALUES (?, ?, ?, ?)'
        );
        for (const w of Object.values(data.webhookEvents) as any[]) {
          if (w && w.eventId) {
            insertWebhook.run(w.eventId, w.eventName || 'unknown', w.processedAt || Date.now(), w.status || 'processed');
          }
        }
      }

      // Migrate Provider Subscription Timestamps
      if (data.providerSubscriptionTimestamps && typeof data.providerSubscriptionTimestamps === 'object') {
        const insertTs = this.db.prepare(
          'INSERT OR IGNORE INTO provider_subscription_timestamps (provider_sub_id, timestamp) VALUES (?, ?)'
        );
        for (const [subId, ts] of Object.entries(data.providerSubscriptionTimestamps) as [string, any][]) {
          if (subId && typeof ts === 'number') {
            insertTs.run(subId, ts);
          }
        }
      }

      this.db.exec('COMMIT');
      console.log('[Database] Migrated existing data from saas-store.json to SQLite successfully.');
    } catch (err) {
      this.db.exec('ROLLBACK');
      console.error('[Database] Failed to migrate saas-store.json:', err);
    }
  }

  // --- Snapshot / Restore for Test Runner Isolation ---
  snapshot(): void {
    if (this.inSavepoint) {
      try {
        this.db.exec('RELEASE snap_test_isolation');
      } catch {
        // ignore
      }
    }
    this.db.exec('SAVEPOINT snap_test_isolation');
    this.inSavepoint = true;
  }

  restoreSnapshot(): void {
    if (this.inSavepoint) {
      try {
        this.db.exec('ROLLBACK TO snap_test_isolation');
        this.db.exec('RELEASE snap_test_isolation');
      } catch (err) {
        console.warn('[Database] Snapshot rollback notice:', err);
      } finally {
        this.inSavepoint = false;
      }
    }
  }
}

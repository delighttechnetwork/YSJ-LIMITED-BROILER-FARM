/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Profile, DailyReport, FeedStockItem, Comment, WeeklyReport, Notification, AuditLog, UserRole } from './src/types.js';

// Filepath for JSON Database
const DB_FILE = process.env.VERCEL
  ? path.join('/tmp', 'db.json')
  : path.join(process.cwd(), 'data', 'db.json');

// Interface for DB Structure
export interface DbSchema {
  profiles: Profile[];
  daily_reports: DailyReport[];
  weekly_reports: WeeklyReport[];
  feed_stock?: FeedStockItem[];
  comments: Comment[];
  notifications: Notification[];
  audit_logs: AuditLog[];
  passwords: Record<string, string>; // mapping email -> password for mock auth
}

// Global cache
let privateDbCache: DbSchema | null = null;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://evtbjmcnssxrtxazlsjf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_rh_NDmcqXcTznZ2DDCmeKg_9S8a_aXD';

export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Ensure database directory and file exist (returns local data)
function ensureDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const freshDb = getInitialSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(freshDb, null, 2), 'utf-8');
  }
}

// Read database from memory cache or local file
export function readDb(): DbSchema {
  if (privateDbCache) {
    return privateDbCache;
  }
  
  ensureDb();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    privateDbCache = JSON.parse(content) as DbSchema;
    if (!privateDbCache.feed_stock) {
      privateDbCache.feed_stock = [];
    }
    return privateDbCache;
  } catch (error) {
    console.error("Error reading database file, creating fresh:", error);
    const freshDb = getInitialSeedData();
    saveDb(freshDb);
    return freshDb;
  }
}

// Save database both to memory cache, local file, and then push asynchronously to Supabase
export function saveDb(data: DbSchema) {
  privateDbCache = data;
  ensureDb();
  
  // Write local cache backup JSON file
  const tempFile = DB_FILE + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
  
  // Push to Supabase asynchronously in background
  if (supabase) {
    pushToSupabase(data).catch(err => {
      console.error("Background Supabase synchronization deferred:", err.message);
    });
  }
}

// Helper to log audit messages
export function logAudit(userId: string, action: string, details: string) {
  const db = readDb();
  const user = db.profiles.find(p => p.id === userId);
  
  const newLog: AuditLog = {
    id: 'log-' + Math.random().toString(36).substr(2, 9),
    user_id: userId,
    user_name: user ? user.full_name : 'System/Unknown',
    role: user ? user.role : 'ATTENDANT',
    action,
    details,
    created_at: new Date().toISOString()
  };

  db.audit_logs.unshift(newLog); // latest first
  // Cap audit logs at 1000 items
  if (db.audit_logs.length > 1000) {
    db.audit_logs = db.audit_logs.slice(0, 1000);
  }
  saveDb(db);
}

// Async helper to push the entire data state to Supabase
async function pushToSupabase(data: DbSchema) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('ysj_farm_state')
      .upsert({ id: 'singleton', state: data, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      
    if (error) {
      const isMissingTable = error.code === '42P01' || 
                             (error.message && (
                               error.message.includes('ysj_farm_state') || 
                               error.message.includes('schema cache') || 
                               error.message.includes('not find the table')
                             ));
      if (isMissingTable) {
        console.warn("Supabase relation 'ysj_farm_state' does not exist yet. Ensure you run the initialization SQL script in Supabase.");
      } else {
        console.error("Supabase upsert error:", error.message);
      }
    } else {
      console.log("Supabase database successfully updated in real-time.");
    }
  } catch (err: any) {
    console.error("Failed to connect to Supabase container:", err.message);
  }
}

// Async helper to pull the entire data state from Supabase
export async function pullFromSupabase(): Promise<boolean> {
  if (!supabase) {
    console.log("Supabase client is not configured.");
    return false;
  }
  
  try {
    console.log("Attempting to load farm operations from Supabase real-time cloud...");
    const { data, error } = await supabase
      .from('ysj_farm_state')
      .select('state')
      .eq('id', 'singleton')
      .maybeSingle();

    if (error) {
      const isMissingTable = error.code === '42P01' || 
                             (error.message && (
                               error.message.includes('ysj_farm_state') || 
                               error.message.includes('schema cache') || 
                               error.message.includes('not find the table')
                             ));
      if (isMissingTable) {
        console.warn("Supabase 'ysj_farm_state' table is missing or pending initialization. Falling back to local state.");
        injectSupabaseWarningLog();
      } else {
        console.error("Supabase load query error:", error.message);
      }
      return false;
    }

    if (data && data.state) {
      console.log("Supabase database loaded successfully! Active real-time synchronization online.");
      privateDbCache = data.state as DbSchema;
      
      // Save local cache backup copy
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(privateDbCache, null, 2), 'utf-8');
      return true;
    } else {
      console.log("No singleton state row found in Supabase. Pushing local seed state as default.");
      const current = readDb();
      await pushToSupabase(current);
      return true;
    }
  } catch (err: any) {
    console.error("Failed to fetch state from Supabase:", err.message);
    return false;
  }
}

// Check real-time Supabase connection and state details
export async function getSupabaseStatus() {
  if (!supabase) {
    return {
      configured: false,
      connected: false,
      tableExists: false,
      url: process.env.SUPABASE_URL || 'https://evtbjmcnssxrtxazlsjf.supabase.co',
      message: 'Supabase URL/Key environment variables are missing.'
    };
  }

  try {
    const { data, error } = await supabase
      .from('ysj_farm_state')
      .select('updated_at')
      .eq('id', 'singleton')
      .maybeSingle();

    if (error) {
      const isMissingTable = error.code === '42P01' || 
                             (error.message && (
                               error.message.includes('ysj_farm_state') || 
                               error.message.includes('schema cache') || 
                               error.message.includes('not find the table')
                             ));
      if (isMissingTable) {
        return {
          configured: true,
          connected: true,
          tableExists: false,
          url: process.env.SUPABASE_URL,
          message: "Connected to Supabase project, but the 'ysj_farm_state' table is missing. Run the SQL snippet to initialize."
        };
      }
      return {
        configured: true,
        connected: false,
        tableExists: false,
        url: process.env.SUPABASE_URL,
        message: `Connected but returned error: ${error.message}`
      };
    }

    return {
      configured: true,
      connected: true,
      tableExists: true,
      lastSync: data ? data.updated_at : null,
      url: process.env.SUPABASE_URL,
      message: "Fully synchronized with Supabase database."
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      tableExists: false,
      url: process.env.SUPABASE_URL,
      message: `Failed to connect: ${err.message}`
    };
  }
}

// Force overwrite cloud state from current local cache
export async function forcePushToSupabase(): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase client is not initialized.' };
  }
  try {
    const db = readDb();
    const { error } = await supabase
      .from('ysj_farm_state')
      .upsert({ id: 'singleton', state: db, updated_at: new Date().toISOString() }, { onConflict: 'id' });

    if (error) {
      return { success: false, message: `Backup push failed: ${error.message}` };
    }
    return { success: true, message: 'Successfully backed up local state to Supabase Cloud.' };
  } catch (err: any) {
    return { success: false, message: `System error during push: ${err.message}` };
  }
}

// Force overload local cache from Supabase cloud state
export async function forcePullFromSupabase(): Promise<{ success: boolean; message: string }> {
  const success = await pullFromSupabase();
  if (success) {
    return { success: true, message: 'Successfully loaded cloud state from Supabase.' };
  }
  return { success: false, message: 'Failed to sync. Ensure table exists with a valid schema row.' };
}

// Inject system setup instruction notice into audit logs & notifications
function injectSupabaseWarningLog() {
  const db = readDb();
  
  const setupKey = 'supa-setup-not';
  const alreadyExists = db.notifications.some(n => n.id === setupKey);
  if (alreadyExists) return;

  const sqlCode = `CREATE TABLE ysj_farm_state (
  id text PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);`;

  const setupNotification: Notification = {
    id: setupKey,
    user_id: 'ALL',
    title: '⚡ Supabase Sync Setup instructions',
    message: `To activate live live performance sync, create a database table named 'ysj_farm_state' in your Supabase SQL Editor. Code: ${sqlCode}`,
    is_read: false,
    created_at: new Date().toISOString()
  };

  const setupAudit: AuditLog = {
    id: 'supa-setup-audit',
    user_id: 'system',
    user_name: 'Supabase Adapter',
    role: 'ADMIN',
    action: 'SUPABASE_SETUP_PENDING',
    details: `Please execute this inside Supabase SQL editor: ${sqlCode}`,
    created_at: new Date().toISOString()
  };

  db.notifications.unshift(setupNotification);
  db.audit_logs.unshift(setupAudit);
  
  // Write to local JSON file only, avoid looping push try
  const tempFile = DB_FILE + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// Seed clean YSJ poultry company profiles starting fresh
function getInitialSeedData(): DbSchema {
  const now = new Date();
  
  // High polish real staff roles
  const profiles: Profile[] = [
    {
      id: 'staff-admin',
      full_name: 'YSJ Chief Admin',
      email: 'admin@ysjfarm.com',
      phone: '+234 801 234 5678',
      role: 'ADMIN',
      status: 'active',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    }
  ];

  const passwords: Record<string, string> = {
    'admin@ysjfarm.com': 'admin123'
  };

  return {
    profiles,
    daily_reports: [],
    weekly_reports: [],
    feed_stock: [],
    comments: [],
    notifications: [
      {
        id: 'not-clear',
        user_id: 'ALL',
        title: '✨ Welcome to YSJ Farm (Fresh Build)',
        message: 'This dashboard is now connected to your Supabase and cleared of dummy records. All subsequent poultry counts and reports will sync here.',
        is_read: false,
        created_at: now.toISOString()
      }
    ],
    audit_logs: [
      {
        id: 'audit-clear',
        user_id: 'staff-admin',
        user_name: 'YSJ Chief Admin',
        role: 'ADMIN',
        action: 'DB_INITIALIZED',
        details: 'Dummy data removed. Real-time active environment ready.',
        created_at: now.toISOString()
      }
    ],
    passwords
  };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// User Roles
export type UserRole = 'ADMIN' | 'MD' | 'DEPUTY MD' | 'MANAGER' | 'SUPERVISOR' | 'ATTENDANT';

// User Status
export type UserStatus = 'active' | 'inactive';

// Profile interface
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

// Daily Report interface
export interface DailyReport {
  id: string;
  report_date: string; // YYYY-MM-DD
  bird_count: number;
  mortality: number;
  feed_consumed: number; // in bags/kg
  water_consumed?: number; // in liters
  medication: string;
  vaccination: string;
  sales: number; // revenue from sales ($ or Local Currency)
  expenses: number; // expenses incurred
  birds_sold?: number; // number of birds sold/disposed today
  notes: string;
  attachments?: string[]; // array of file path strings or urls
  created_by: string; // Profile ID
  created_by_name?: string; // Cache profile name for easy loading
  created_at: string;
  updated_at: string;
}

// Feed Stock interface
export interface FeedStockItem {
  id: string;
  feed_type: string; // 'Starter' | 'Grower' | 'Finisher' | etc.
  bags: number;
  cost_per_bag: number;
  date_stocked: string; // YYYY-MM-DD
  notes?: string;
  created_by: string; // Profile ID
  created_by_name?: string;
  created_at: string;
}

// Comment interface
export interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  comment: string;
  created_at: string;
}

// Weekly Report interface
export interface WeeklyReport {
  id: string;
  week_start: string; // YYYY-MM-DD
  week_end: string;   // YYYY-MM-DD
  opening_birds: number;
  closing_birds: number;
  total_mortality: number;
  feed_used: number;
  total_sales: number;
  total_expenses: number;
  profit_loss: number;
  ai_summary: string;
  generated_at: string;
}

// Notification interface
export interface Notification {
  id: string;
  user_id: string; // Recipient profile ID or 'ALL'
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Audit Log interface
export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  role: UserRole;
  action: string;
  details: string;
  created_at: string;
}

// Session state / Auth response
export interface AuthState {
  user: Profile | null;
  token: string | null;
}

// Simple permissions checker
export const checkPermission = {
  canCreateReport: (role: UserRole) => ['ADMIN', 'MD', 'DEPUTY MD', 'MANAGER', 'SUPERVISOR'].includes(role),
  canEditReport: (role: UserRole) => ['ADMIN', 'MD', 'DEPUTY MD', 'MANAGER', 'SUPERVISOR'].includes(role),
  canDeleteReport: (role: UserRole) => ['ADMIN', 'MD', 'DEPUTY MD'].includes(role),
  canComment: (role: UserRole) => ['ADMIN', 'MD', 'DEPUTY MD', 'MANAGER'].includes(role),
  canViewReports: (role: UserRole) => true, // Everyone can view
  canManageStaff: (role: UserRole) => role === 'ADMIN',
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, 
  LogOut, 
  Bell, 
  ChevronDown, 
  LayoutDashboard, 
  ClipboardList, 
  TrendingUp, 
  ShieldCheck, 
  Lock, 
  Activity,
  AlertTriangle,
  UserCheck,
  Smartphone,
  CheckCircle,
  HelpCircle,
  Calendar,
  Layers,
  Menu,
  X
} from 'lucide-react';
import DashboardInsights from './components/DashboardInsights';
import DailyReportsSection from './components/DailyReportsSection';
import WeeklyReportsSection from './components/WeeklyReportsSection';
import StaffManagementSection from './components/StaffManagementSection';
import { ChickenLogo } from './components/ChickenLogo';
import { Profile, DailyReport, WeeklyReport, Notification, UserRole, checkPermission } from './types';

export default function App() {
  // Auth state
  const [user, setUser] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Public active flock state
  const [publicActiveFlock, setPublicActiveFlock] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/public/active-flock')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.liveBirds === 'number') {
          setPublicActiveFlock(data.liveBirds);
        }
      })
      .catch(err => console.error("Failed to load public active flock stats:", err));
  }, []);

  // General App Data state
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'daily' | 'weekly' | 'staff'>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication credentials form
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const loadOperationalData = async (authToken: string) => {
    try {
      const authHeader = { 'Authorization': `Bearer ${authToken}` };
      
      // Fetch daily reports
      const reportsRes = await fetch('/api/reports', { headers: authHeader });
      const reportsData = await reportsRes.json();
      if (reportsRes.ok) {
        setDailyReports(reportsData);
        if (reportsData.length > 0) {
          setPublicActiveFlock(reportsData[0].bird_count);
        }
      }

      // Fetch weekly summary
      const weeklyRes = await fetch('/api/weekly-reports', { headers: authHeader });
      const weeklyData = await weeklyRes.json();
      if (weeklyRes.ok) setWeeklyReports(weeklyData);

      // Fetch notifications
      const notRes = await fetch('/api/notifications', { headers: authHeader });
      const notData = await notRes.json();
      if (notRes.ok) {
        setNotifications(notData);
        setUnreadCount(notData.filter((n: Notification) => !n.is_read).length);
      }
    } catch (err) {
      console.error("Failed fetching database payload", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoggingIn(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });
      const data = await response.json();
      
      if (response.ok && data.token) {
        setUser(data.user);
        setToken(data.token);
        setActiveTab('dashboard');
        // Load main tables
        await loadOperationalData(data.token);
      } else {
        setAuthError(data.error || 'Login validation failed.');
      }
    } catch (err) {
      setAuthError('Network timeout or server offline. Check connections.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setDailyReports([]);
    setWeeklyReports([]);
    setNotifications([]);
    setUnreadCount(0);
    setEmailInput('');
    setPasswordInput('');
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!token) return;
    try {
      // Mark local first
      const updated = notifications.map(n => ({ ...n, is_read: true }));
      setNotifications(updated);
      setUnreadCount(0);

      // Async sync to server
      const unread = notifications.filter(n => !n.is_read);
      for (const n of unread) {
        await fetch(`/api/notifications/${n.id}/read`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-emerald-400 gap-3">
        <Activity size={32} className="animate-spin" />
        <span className="text-xs font-mono tracking-widest font-semibold uppercase">Restoring YSJ Limited Session...</span>
      </div>
    );
  }

  // --- LOGGED OUT UI ---
  if (!user || !token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start md:justify-center py-8 md:py-16 px-4 relative overflow-y-auto font-sans">
        
        {/* Subtle background abstract spheres */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Brand Presentation Column */}
          <div className="md:col-span-7 space-y-6 text-white text-center md:text-left pr-0 md:pr-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full text-xs font-semibold">
              <ChickenLogo className="h-5 w-5" />
              YSJ LIMITED POULTRY
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              YSJ LIMITED <br className="hidden md:inline" />
              <span className="text-emerald-500">BROILER FARM</span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto md:mx-0">
              Enterprise poultry lifecycle portal. Connects field pen attendants, veterinary supervisors, managers, and directors on a unified, high-security executive management dashboard.
            </p>

            <div className="flex justify-center md:justify-start items-center gap-5 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span>Active Flock: {publicActiveFlock !== null ? publicActiveFlock.toLocaleString() : '11,000+'} Broilers</span>
              </div>
            </div>
          </div>

          {/* Authentication & Demo Select Card */}
          <div className="md:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="mb-5 text-center">
              <h2 className="text-lg font-bold text-white">Staff Credentials Console</h2>
              <p className="text-xs text-slate-400">Please enter your authorized corporate key</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Staff Email</label>
                <input 
                  id="login-email"
                  type="email"
                  required
                  placeholder="operator@ysjfarm.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs focus:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Password</label>
                <input 
                  id="login-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs focus:bg-slate-950"
                />
              </div>

              {authError && (
                <div role="alert" className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-[11px] font-semibold leading-relaxed">
                  ⚠️ {authError}
                </div>
              )}

              <button 
                id="btn-login"
                type="submit"
                disabled={loggingIn}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-900/30"
              >
                {loggingIn ? 'Authenticating Credentials...' : 'Access Farm Portal'}
              </button>
            </form>

          </div>
        </div>

        {/* Humble system copyright */}
        <div className="mt-12 text-[10px] text-slate-500 relative z-10 self-center">
          © 2026 YSJ Limited Broiler Farm • Enterprise Agriculture Deployment
        </div>
      </div>
    );
  }

  // --- LOGGED IN PORTAL WORKSPACE ---
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans select-none text-slate-700 antialiased relative">
      
      {/* 
        ========================================
        1. MOBILE SIDEBAR DRAWER OVERLAY (BACKBOARD)
        ========================================
      */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity cursor-pointer print:hidden"
        />
      )}

      {/* 
        ========================================
        2. SIDEBAR CONTAINER (RESPONSIVE)
        ========================================
      */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 h-[100dvh] md:h-screen bg-slate-900 text-slate-300 border-r border-slate-850 flex flex-col z-50 transform md:transform-none transition-transform duration-300 ease-in-out md:flex md:sticky md:top-0 shrink-0 print:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Upper Sidebar Area: Brand & Nav List */}
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0">
          
          {/* Header section with brand info */}
          <div className="p-5 border-b border-slate-850 flex items-center justify-between gap-3 bg-slate-950/20 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-slate-800 text-emerald-400 border border-slate-700 rounded-lg shadow-inner flex items-center justify-center">
                <ChickenLogo className="h-6 w-6" />
              </span>
              <div>
                <h1 className="font-extrabold tracking-tight text-white text-xs leading-none uppercase">
                  YSJ Poultry
                </h1>
                <span className="text-[9px] text-slate-400 block mt-0.5 tracking-wider font-mono font-medium">
                  Broiler Portal v3.8
                </span>
              </div>
            </div>
            {/* Close button inside sidebar on mobile */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded md:hidden"
              title="Close sidebar navigation"
            >
              <X size={16} />
            </button>
          </div>

          {/* Current authorized Profile indicator in sidebar */}
          <div className="p-4 mx-4 mt-5 mb-2 bg-slate-950/40 border border-slate-850 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-slate-950 flex items-center justify-center font-extrabold uppercase text-xs shadow-inner shrink-0">
                {user.full_name.charAt(0)}
              </div>
              <div className="text-left text-xs min-w-0">
                <span className="font-bold text-slate-200 block truncate" title={user.full_name}>{user.full_name}</span>
                <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 inline-block mt-0.5">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tab Group */}
          <nav className="p-4 space-y-1.5 flex-1 select-none">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 block mb-2">Main Functions</span>
            
            <button 
              id="sidebar-tab-dashboard"
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-emerald-600/15 border-l-4 border-emerald-500 text-emerald-300 font-bold bg-slate-950/30' 
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard size={15} />
              <span>Dashboard Overview</span>
            </button>
            
            <button 
              id="sidebar-tab-daily"
              onClick={() => {
                setActiveTab('daily');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'daily' 
                  ? 'bg-emerald-600/15 border-l-4 border-emerald-500 text-emerald-300 font-bold bg-slate-950/30' 
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <ClipboardList size={15} />
              <span>Daily Biometric Logs</span>
            </button>
            
            <button 
              id="sidebar-tab-weekly"
              onClick={() => {
                setActiveTab('weekly');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'weekly' 
                  ? 'bg-emerald-600/15 border-l-4 border-emerald-500 text-emerald-300 font-bold bg-slate-950/30' 
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <TrendingUp size={15} />
              <span>Weekly Exec Summaries</span>
            </button>

            {user.role === 'ADMIN' && (
              <div className="pt-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 block mb-2">Administrative</span>
                <button 
                  id="sidebar-tab-staff"
                  onClick={() => {
                    setActiveTab('staff');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'staff' 
                      ? 'bg-emerald-600/15 border-l-4 border-emerald-500 text-emerald-300 font-bold bg-slate-950/30' 
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck size={15} className={activeTab === 'staff' ? 'text-emerald-400' : 'text-emerald-600'} />
                  <span>Staff Access & Audits</span>
                </button>
              </div>
            )}
          </nav>

          {/* Bottom Sidebar: Log Out Control (Now nested inside the scrollable container with mt-auto, ensuring visibility even if bottom of viewport is clipped on mobile) */}
          <div className="p-4 border-t border-slate-850 shrink-0 bg-slate-950/10 mt-auto">
            <button 
              id="sidebar-btn-logout"
              onClick={handleLogout}
              className="w-full py-2 px-3 bg-slate-850 hover:bg-rose-950/30 hover:text-rose-405 border border-slate-700 hover:border-rose-900/30 text-slate-400 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-inner"
              title="Log out from YSJ Limited"
            >
              <LogOut size={13} />
              <span>Sign Out Session</span>
            </button>
            
            <div className="mt-3 text-[9px] text-center text-slate-500 block font-mono">
              YSJ Poultry Farm © 2026
            </div>
          </div>
        </div>
      </aside>

      {/* 
        ========================================
        3. PRIMARY WORKSPACE WRAPPER (MD-SHIFTED RIGHT)
        ========================================
      */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        
        {/* Dynamic Top Workspace Header Bar */}
        <header className="bg-slate-900 border-b border-slate-850 text-white h-16 shrink-0 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs print:hidden">
          
          {/* Left Block: Hamburger menu trigger on mobile, Active context text on desktop */}
          <div className="flex items-center gap-3.5">
            {/* Mobile menu toggle action */}
            <button 
              id="btn-mobile-sidebar-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md md:hidden transition cursor-pointer"
              title="Toggle sidebar menu"
            >
              <Menu size={20} />
            </button>

            {/* Logo display on mobile title */}
            <span className="p-1 bg-slate-850 text-emerald-400 rounded md:hidden flex items-center justify-center">
              <ChickenLogo className="h-5 w-5" />
            </span>

            {/* Dynamic visual tag for active route */}
            <div className="leading-tight">
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold block font-mono">YSJ Enterprise Portal</span>
              <h2 className="text-sm font-bold text-white capitalize flex items-center gap-1.5">
                {activeTab === 'dashboard' && 'Dashboard Insights Overview'}
                {activeTab === 'daily' && 'Daily Biometric Logging Table'}
                {activeTab === 'weekly' && 'Weekly Executive Analytical Archives'}
                {activeTab === 'staff' && 'Authorized Staff Access & System Audits'}
              </h2>
            </div>
          </div>

          {/* Right space: notifications component */}
          <div className="flex items-center gap-4">
            
            {/* Active session lock badge for desktop screen sizes */}
            <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-950/40 border border-slate-850 rounded-full px-3 py-1">
              <Lock size={10} className="text-emerald-500 animate-pulse" />
              <span>TLS Node Active: <strong>{user.email}</strong> Mode</span>
            </div>

            {/* System notifications container bell */}
            <div className="relative">
              <button 
                id="btn-bell"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 hover:bg-slate-800 border border-slate-800/80 rounded-md transition text-slate-300 hover:text-white relative cursor-pointer"
                title="System Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {/* Dynamic notification elements dropdown overlay */}
              {showNotifications && (
                <div role="dialog" className="absolute right-0 mt-2.5 w-80 bg-white text-slate-850 rounded-xl border border-slate-200 shadow-2xl z-50 p-3 leading-snug">
                  <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
                    <span className="font-bold text-xs">Farm Security & Vaccine Alerts</span>
                    <button 
                      id="btn-mark-all-read-dropdown"
                      onClick={handleMarkAllNotificationsRead} 
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {notifications.map(not => (
                      <div key={not.id} className={`p-2 rounded-lg text-xs leading-normal border ${not.is_read ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-emerald-50/40 border-emerald-150 text-slate-800 font-medium'}`}>
                        <span className="font-bold block text-[11px]">{not.title}</span>
                        <span>{not.message}</span>
                        <span className="text-[9px] text-slate-400 block mt-1">
                          {new Date(not.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}

                    {notifications.length === 0 && (
                      <p className="text-center py-6 text-slate-400 italic text-xs">No active alerts logged (system nominal).</p>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* 
          ========================================
          4. MAIN VIEW COMPONENT CONTAINER
          ========================================
        */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          
          {activeTab === 'dashboard' && (
            <DashboardInsights reports={dailyReports} user={user} token={token} onRefresh={() => loadOperationalData(token!)} />
          )}

          {activeTab === 'daily' && (
            <DailyReportsSection reports={dailyReports} user={user} token={token} onRefresh={() => loadOperationalData(token!)} />
          )}

          {activeTab === 'weekly' && (
            <WeeklyReportsSection 
              weeklyReports={weeklyReports} 
              dailyReports={dailyReports} 
              user={user} 
              token={token} 
              onRefresh={() => loadOperationalData(token!)} 
            />
          )}

          {activeTab === 'staff' && user.role === 'ADMIN' && (
            <StaffManagementSection user={user} token={token} />
          )}

        </main>

        {/* 
          ========================================
          5. LOWER LITERAL ADMINISTRATIVE FOOTER
          ========================================
        */}
        <footer className="bg-white border-t border-slate-200 py-4 px-6 font-sans text-center text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div>YSJ Limited Broiler Farm Administration Console • Connected on Local Port Ingress 3000</div>
          <div className="text-[10px] text-slate-400/80">Authorized Staff Access Only • Encrypted telemetry logs.</div>
        </footer>

      </div>
    </div>
  );
}

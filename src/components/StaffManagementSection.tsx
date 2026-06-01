/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldAlert, 
  Compass, 
  Key, 
  Power, 
  Edit, 
  Terminal, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  X,
  Phone,
  Mail,
  UserCheck,
  Download,
  Database,
  RefreshCw,
  CloudUpload,
  CloudDownload,
  Code,
  Copy
} from 'lucide-react';
import { Profile, AuditLog, UserRole } from '../types.js';

interface StaffProps {
  user: Profile;
  token: string;
}

export default function StaffManagementSection({ user, token }: StaffProps) {
  const [staff, setStaff] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Supabase states
  const [supaStatus, setSupaStatus] = useState<any>(null);
  const [loadingSupa, setLoadingSupa] = useState(false);
  const [supaActionMessage, setSupaActionMessage] = useState('');
  const [supaActionError, setSupaActionError] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  const fetchSupaStatus = async () => {
    setLoadingSupa(true);
    setSupaActionError('');
    try {
      const response = await fetch('/api/supabase/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSupaStatus(data);
      } else {
        setSupaActionError('Could not grab Supabase credentials context.');
      }
    } catch (err) {
      setSupaActionError('Error connecting to operational health endpoint.');
    } finally {
      setLoadingSupa(false);
    }
  };

  const handleSupaPush = async () => {
    if (!window.confirm("⚠️ SECURITY WARNING:\n\nThis action will OVERWRITE the cloud Supabase dataset table with your current local offline state.\n\nAre you sure you want to perform a remote Cloud sync push?")) {
      return;
    }
    setLoadingSupa(true);
    setSupaActionError('');
    setSupaActionMessage('');
    try {
      const response = await fetch('/api/supabase/push', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSupaActionMessage('Local operations state uploaded and committed to remote cloud.');
        fetchSupaStatus();
        fetchLogs();
      } else {
        setSupaActionError(data.message || 'Remote database push rejected by host.');
      }
    } catch (err) {
      setSupaActionError('Network link failed during payload backup.');
    } finally {
      setLoadingSupa(false);
    }
  };

  const handleSupaPull = async () => {
    if (!window.confirm("⚠️ SECURITY WARNING:\n\nThis will OVERWRITE your local memory layout, restoring all records directly from Supabase Cloud!\n\nAre you sure you want to initiate a pull restoration?")) {
      return;
    }
    setLoadingSupa(true);
    setSupaActionError('');
    setSupaActionMessage('');
    try {
      const response = await fetch('/api/supabase/pull', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSupaActionMessage('Cloud restoration successful. All local records, logs and rosters resynchronized with live Supabase!');
        fetchStaff();
        fetchLogs();
        fetchSupaStatus();
      } else {
        setSupaActionError(data.message || 'Restoration pull rejected by host schema.');
      }
    } catch (err) {
      setSupaActionError('Network link failed during payload download.');
    } finally {
      setLoadingSupa(false);
    }
  };

  const sqlSnippet = `CREATE TABLE ysj_farm_state (
  id text PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSnippet);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Modal toggles
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  // Active actions target
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('ATTENDANT');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setStaff(data);
      }
    } catch (err) {
      console.error("Failed fetching staff ledger", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed fetching database logs audit", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleDownloadCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'User ID', 'User Name', 'Role', 'Action', 'Details', 'Timestamp'];
    const rows = logs.map(log => [
      log.id,
      log.user_id,
      log.user_name,
      log.role,
      log.action,
      log.details,
      new Date(log.created_at).toISOString()
    ]);

    const escape = (str: string | undefined | null) => {
      if (!str) return '""';
      return `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    };

    const csvContent = [headers.join(','), ...rows.map(e => e.map(val => escape(val)).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ysj_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchStaff();
    fetchLogs();
    fetchSupaStatus();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!fullName || !email || !password) {
      setFormError('Name, email and a temporary login password are required.');
      return;
    }

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          role,
          password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setFormSuccess(`Staff account registered successfully for ${fullName}.`);
        setFullName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setRole('ATTENDANT');
        
        fetchStaff();
        fetchLogs();
        setTimeout(() => setShowAddModal(false), 800);
      } else {
        setFormError(data.error || 'Failed registration.');
      }
    } catch (err) {
      setFormError('Server integration fault.');
    }
  };

  const handleEditStaffClick = (profile: Profile) => {
    setSelectedStaff(profile);
    setFullName(profile.full_name);
    setEmail(profile.email);
    setPhone(profile.phone);
    setRole(profile.role);
    setStatus(profile.status);
    
    setFormError('');
    setFormSuccess('');
    setShowEditModal(true);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setFormError('');
    setFormSuccess('');

    try {
      const response = await fetch(`/api/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          role,
          status
        })
      });

      const data = await response.json();

      if (response.ok) {
        setFormSuccess(`Profile attributes updated for ${fullName}.`);
        fetchStaff();
        fetchLogs();
        setTimeout(() => setShowEditModal(false), 800);
      } else {
        setFormError(data.error || 'Failed update credentials.');
      }
    } catch (err) {
      setFormError('Server error.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !newPassword.trim()) return;
    setFormError('');
    setFormSuccess('');

    try {
      const response = await fetch(`/api/staff/${selectedStaff.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setFormSuccess(`Password successfully reset to '${newPassword}' for ${selectedStaff.full_name}.`);
        setNewPassword('');
        fetchLogs();
        setTimeout(() => setShowResetModal(false), 1200);
      } else {
        setFormError(data.error || 'Failed resetting password.');
      }
    } catch (err) {
      setFormError('Service unreachable.');
    }
  };

  const toggleStaffStatus = async (profile: Profile) => {
    const nextStatus = profile.status === 'active' ? 'inactive' : 'active';
    if (nextStatus === 'inactive' && profile.id === user.id) {
      alert("Security Constraint: You cannot deactivate your own active session profile!");
      return;
    }

    try {
      const response = await fetch(`/api/staff/${profile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await response.json();
      if (response.ok) {
        fetchStaff();
        fetchLogs();
      } else {
        alert(data.error || 'Failed to toggle activation status.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Staff ledger panel */}
      <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
          <div>
            <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
              <Users size={18} className="text-emerald-600" />
              Staff Authentication Profiles
            </h3>
            <p className="text-xs text-slate-400">Manage farm workers, allocate role clearance limits, and reset passwords.</p>
          </div>

          <button 
            id="btn-create-staff"
            onClick={() => {
              setFormError('');
              setFormSuccess('');
              setShowAddModal(true);
            }}
            className="self-start px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus size={15} />
            Onboard New Staff
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-100 uppercase text-[10px] text-slate-500 font-semibold tracking-wider">
                <th className="px-4 py-2.5">Staff Name</th>
                <th className="px-4 py-2.5">Contact coordinates</th>
                <th className="px-4 py-2.5">Security role clearance</th>
                <th className="px-4 py-2.5">Portal Status</th>
                <th className="px-4 py-2.5 text-right">Actions Dashboard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map(profile => (
                <tr key={profile.id} className="hover:bg-slate-50/75 transition">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                        {profile.full_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">{profile.full_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {profile.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5 text-[11px]">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Mail size={12} /> {profile.email}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500 font-mono">
                        <Phone size={12} /> {profile.phone || 'No phone'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold border ${profile.role === 'ADMIN' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : profile.role === 'MD' ? 'bg-rose-50 text-rose-800 border-rose-200' : profile.role === 'MANAGER' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {profile.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button 
                      id={`btn-staff-status-${profile.id}`}
                      onClick={() => toggleStaffStatus(profile)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 cursor-pointer transition active:scale-95 ${profile.status === 'active' ? 'bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700' : 'bg-rose-50 text-rose-700 hover:bg-emerald-50 hover:text-emerald-700'}`}
                      title="Click to toggle activation status"
                    >
                      <Power size={10} />
                      {profile.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        id={`btn-staff-edit-${profile.id}`}
                        onClick={() => handleEditStaffClick(profile)}
                        className="p-1 px-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition text-[11px] flex items-center gap-1"
                        title="Edit profile metadata"
                      >
                        <Edit size={12} /> Edit
                      </button>
                      <button 
                        id={`btn-staff-reset-${profile.id}`}
                        onClick={() => {
                          setSelectedStaff(profile);
                          setNewPassword('');
                          setFormError('');
                          setFormSuccess('');
                          setShowResetModal(true);
                        }}
                        className="p-1 px-2 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition text-[11px] flex items-center gap-1"
                        title="Reset worker credentials"
                      >
                        <Key size={12} /> Unlock Pass
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {loading && staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                    Retrieving farm workforce roster...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ⚡ SUPABASE CLOUD INTEGRATION CONSOLE */}
      <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3 border-b border-slate-100 gap-3">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Database size={17} className="text-emerald-600" />
              Supabase Cloud Database Controller
            </h3>
            <p className="text-xs text-slate-400">Govern real-time synchronization, verify table schema caching, and commit manual full backups.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-supa-refresh"
              onClick={fetchSupaStatus}
              disabled={loadingSupa}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
              title="Test current Supabase connection status"
            >
              <RefreshCw size={13} className={loadingSupa ? "animate-spin" : ""} />
              {loadingSupa ? "Checking..." : "Verify Connection"}
            </button>
          </div>
        </div>

        {/* Sync Status Flag Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">Connection Instance</span>
            {supaStatus?.configured ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-0.5"></span>
                ACTIVE CONFIGURATION
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping mr-0.5"></span>
                DEFAULT SANDBOX ACTIVE
              </span>
            )}
            <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">{supaStatus?.url || "Not Linked"}</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">Table Verification</span>
            {supaStatus?.tableExists ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                ✔ ysj_farm_state RESOLVED
              </span>
            ) : supaStatus?.connected ? (
              <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                ⚠ TABLE MISSING IN CLOUD
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                🔒 PENDING HANDSHAKE
              </span>
            )}
            <p className="text-[10px] text-slate-400 mt-1">Status: {supaStatus?.message || "Pending validation test"}</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">State Synchrony</span>
            <span className="text-xs font-bold text-slate-700 block">
              {supaStatus?.lastSync ? "Cloud Synchronized" : "Local-Only Cache"}
            </span>
            <p className="text-[10px] font-mono text-slate-400 mt-1">
              Last Sync: {supaStatus?.lastSync ? new Date(supaStatus.lastSync).toLocaleTimeString() : 'N/A (Local Cache)'}
            </p>
          </div>
        </div>

        {/* Action Message Alert banners */}
        {supaActionMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{supaActionMessage}</span>
          </div>
        )}

        {supaActionError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-250 text-rose-700 rounded-lg text-xs font-medium flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-500 shrink-0" />
            <span>{supaActionError}</span>
          </div>
        )}

        {/* Cloud Control Hub Button Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
          <div className="p-3 bg-emerald-50/20 border border-emerald-100 rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">Local-to-Cloud Backup Sync</span>
            <p className="text-xs text-slate-500 leading-normal">
              Commits any locally recorded batch sheets, newly registered staff, and comment logs into your permanent cloud cluster.
            </p>
            <button
              id="btn-supa-push"
              onClick={handleSupaPush}
              disabled={loadingSupa}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <CloudUpload size={14} />
              Manual Full Backup Push
            </button>
          </div>

          <div className="p-3 bg-blue-50/25 border border-blue-100 rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider block">Cloud-to-Local Database Restore</span>
            <p className="text-xs text-slate-400 leading-normal">
              Clears temporary container cache and loads coordinates from your active cloud table as the authoritative source of truth.
            </p>
            <button
              id="btn-supa-pull"
              onClick={handleSupaPull}
              disabled={loadingSupa}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <CloudDownload size={14} />
              Cloud Restore Pull
            </button>
          </div>
        </div>

        {/* SQL Script Generator Drawer */}
        <div className="mt-4 pt-1">
          <h4 className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Code size={14} className="text-slate-500" />
            Supabase Project Database Setup Script
          </h4>
          <p className="text-xs text-slate-500 mb-3 leading-normal">
            To start controlling all operations from Supabase, run this query inside your <strong>Supabase SQL Editor</strong> for project <code>{supaStatus?.url ? new URL(supaStatus.url).hostname.split('.')[0] : 'evtbjmcnssxrtxazlsjf'}</code>. This creates the state container row.
          </p>

          <div className="relative font-mono">
            <pre className="p-3.5 bg-slate-900 border border-slate-950 text-emerald-400 text-xs rounded-lg overflow-x-auto select-all h-[110px] leading-relaxed">
              {sqlSnippet}
            </pre>
            <button
              id="btn-copy-sql"
              onClick={handleCopySql}
              className="absolute top-2 right-2 p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:text-white rounded-lg transition active:scale-95 cursor-pointer"
              title="Copy SQL initialization command"
            >
              {copiedSql ? (
                <span className="text-[10px] px-1 font-semibold text-emerald-400 font-sans">Copied!</span>
              ) : (
                <Copy size={13} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Security Audit Tracker */}
      <div className="bg-slate-900 text-slate-150 border border-slate-850 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 pb-3 border-b border-slate-800 gap-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2 font-mono">
              <Terminal size={16} className="text-emerald-500" />
              SYSTEM_AUDIT_LEDGER_STATUS
            </h3>
            <p className="text-[10px] text-slate-400">Secure log metrics tracking critical administrative and operational data executions.</p>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-center">
            {logs.length > 0 && (
              <button
                id="btn-download-audit"
                onClick={handleDownloadCSV}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Download system audit logs CSV file for regulatory compliance"
              >
                <Download size={11} strokeWidth={2.5} />
                Download Audit Log (CSV)
              </button>
            )}
            <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-2.5 py-0.5">
              ● Compliance Live
            </span>
          </div>
        </div>

        <div className="h-[220px] overflow-y-auto pr-1 text-[11px] font-mono leading-relaxed space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="p-2 border border-slate-800/60 bg-slate-950/40 rounded flex flex-col md:flex-row md:items-center md:justify-between gap-1">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-emerald-400 font-bold">[{log.action}]</span>
                  <span className="text-slate-200 font-sans font-medium">{log.user_name} ({log.role})</span>
                </div>
                <p className="text-slate-400 font-sans text-xs">{log.details}</p>
              </div>

              <span className="text-[10px] text-slate-500 shrink-0 self-end md:self-center">
                {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}

          {loadingLogs && logs.length === 0 && (
            <p className="text-center py-8 text-slate-500 italic">Syncing mainframe telemetry files...</p>
          )}

          {logs.length === 0 && !loadingLogs && (
            <p className="text-center py-8 text-slate-500 italic">Auditing system quiescent. No logged executions.</p>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-base">Onboard Staff Worker</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Full Legal Name</label>
                <input 
                  id="staff-fullName"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-slate-700 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Email (Main login user)</label>
                <input 
                  id="staff-email"
                  type="email"
                  required
                  placeholder="name@ysjfarm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-slate-700 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Phone Number</label>
                <input 
                  id="staff-phone"
                  type="text"
                  placeholder="+234 800 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-slate-700 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Company Clearance Role</label>
                  <select 
                    id="staff-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg text-slate-700"
                  >
                    <option value="ATTENDANT">ATTENDANT</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="DEPUTY MD">DEPUTY MD</option>
                    <option value="MD">MD</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Temporary Password</label>
                  <input 
                    id="staff-password"
                    type="text"
                    required
                    placeholder="Enter pass code"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-slate-700 bg-slate-50"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 text-rose-600 font-semibold rounded-lg flex items-center gap-1.5">
                  <AlertTriangle size={14} /> {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-700 font-semibold rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> {formSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button 
                  id="btn-onboard-submit"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Commit User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-base">Modify Worker clearance</h4>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Worker Name</label>
                <input 
                  id="edit-fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Email credentials</label>
                <input 
                  id="edit-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Direct contact phone</label>
                <input 
                  id="edit-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Clearance Level</label>
                  <select 
                    id="edit-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg text-slate-700"
                  >
                    <option value="ATTENDANT">ATTENDANT</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="DEPUTY MD">DEPUTY MD</option>
                    <option value="MD">MD</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Access status</label>
                  <select 
                    id="edit-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-1.5 border border-slate-250 bg-white rounded-lg text-slate-700"
                  >
                    <option value="active">Active Access</option>
                    <option value="inactive">Suspened / Deauthorized</option>
                  </select>
                </div>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 text-rose-600 font-semibold rounded-lg flex items-center gap-1.5">
                  <AlertTriangle size={14} /> {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-700 font-semibold rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> {formSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button 
                  id="btn-edit-submit-config"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Apply Configurations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedStaff && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-xs w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-base">Key Override Manager</h4>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div className="p-3 bg-amber-50 text-amber-850 rounded-lg border border-amber-200 leading-normal gap-1.5 text-[11px]">
                <ShieldAlert size={14} className="text-amber-700 mb-1" />
                This will overwrite the credential pass-key for <strong>{selectedStaff.full_name}</strong> immediately.
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">New Temporary Access Code</label>
                <input 
                  id="reset-newPassword"
                  type="text"
                  required
                  placeholder="e.g. tempPass99"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-slate-700 bg-slate-50"
                />
              </div>

              {formError && (
                <div className="p-2 bg-rose-50 text-rose-600 font-semibold rounded-lg">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-2 bg-emerald-50 text-emerald-700 font-semibold rounded-lg">
                  {formSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowResetModal(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-semibold"
                >
                  Abort
                </button>
                <button 
                  id="btn-reset-ovr"
                  type="submit"
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-1"
                >
                  <Lock size={12} /> Overwrite Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

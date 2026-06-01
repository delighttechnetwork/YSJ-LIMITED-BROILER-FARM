/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  BarChart3, 
  Activity, 
  DollarSign, 
  Skull,
  TrendingUp,
  Cpu,
  RefreshCw,
  Plus,
  AlertTriangle,
  Award,
  Feather,
  Download,
  Printer
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { WeeklyReport, DailyReport, Profile, checkPermission } from '../types.js';

interface WeeklyReportsProps {
  weeklyReports: WeeklyReport[];
  dailyReports: DailyReport[];
  user: Profile;
  token: string;
  onRefresh: () => void;
}

export default function WeeklyReportsSection({ weeklyReports, dailyReports, user, token, onRefresh }: WeeklyReportsProps) {
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(weeklyReports[0] || null);
  
  const handlePrint = () => {
    if (selectedReport) {
      const storedToken = token || localStorage.getItem('token') || '';
      const url = `/api/print/weekly/${selectedReport.id}?token=${storedToken}`;
      window.open(url, '_blank');
    } else {
      window.print();
    }
  };
  
  // Custom week generation state
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [genError, setGenError] = useState('');
  const [genSuccess, setGenSuccess] = useState('');

  // Trend data for last 4 weeks (ordered chronologically)
  const trendData = [...weeklyReports]
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .slice(-4)
    .map(report => {
      const getFormattedDate = (dStr: string) => {
        const parts = dStr.split('-');
        if (parts.length === 3) {
          return `${parts[1]}/${parts[2]}`;
        }
        return dStr;
      };
      return {
        period: `${getFormattedDate(report.week_start)} - ${getFormattedDate(report.week_end)}`,
        "Mortality Rate": report.total_mortality,
        "Total Profit ($)": report.profit_loss
      };
    });

  const handleExportAllToCSV = () => {
    const headers = [
      "Week Start",
      "Week End",
      "Opening Birds",
      "Closing Birds",
      "Total Mortality",
      "Feed Used (bags)",
      "Total Sales ($)",
      "Total Expenses ($)",
      "Profit / Loss ($)",
      "FCR (bags/bird)",
      "AI Summary"
    ];

    const rows = weeklyReports.map(report => {
      const fcr = (report.feed_used / (report.opening_birds - report.total_mortality)).toFixed(3);
      const escape = (str: string | undefined | null) => {
        if (!str) return '""';
        return `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      };
      return [
        report.week_start,
        report.week_end,
        report.opening_birds,
        report.closing_birds,
        report.total_mortality,
        report.feed_used,
        report.total_sales,
        report.total_expenses,
        report.profit_loss,
        fcr,
        escape(report.ai_summary)
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `YSJ_Weekly_Executive_Reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSingleToCSV = (report: WeeklyReport) => {
    const headers = [
      "Metric",
      "Value"
    ];
    const fcr = (report.feed_used / (report.opening_birds - report.total_mortality)).toFixed(3);
    const escape = (str: string | undefined | null) => {
      if (!str) return '""';
      return `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    };
    
    const rows = [
      ["Week Period", `${report.week_start} to ${report.week_end}`],
      ["Opening Birds", report.opening_birds.toString()],
      ["Closing Birds", report.closing_birds.toString()],
      ["Total Mortality", report.total_mortality.toString()],
      ["Feed Used (bags)", report.feed_used.toString()],
      ["FCR Indicator", `${fcr} bags/bird`],
      ["Total Sales Revenue ($)", report.total_sales.toString()],
      ["Total Expenses ($)", report.total_expenses.toString()],
      ["Net Profit/Loss ($)", report.profit_loss.toString()],
      ["Compiler Timestamp", report.generated_at],
      ["Executive Summary", escape(report.ai_summary)]
    ];

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `YSJ_Weekly_Report_${report.week_start}_to_${report.week_end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canGenerate = checkPermission.canCreateReport(user.role);

  const handleGenerateWeeklyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenError('');
    setGenSuccess('');
    
    if (!weekStart || !weekEnd) {
      setGenError('Start Monday and End Sunday dates are required.');
      return;
    }

    setLoadingAi(true);

    try {
      const response = await fetch('/api/weekly-reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ week_start: weekStart, week_end: weekEnd })
      });

      const data = await response.json();

      if (response.ok) {
        setGenSuccess(`Highly detailed weekly stats generated successfully for range ${weekStart} to ${weekEnd}.`);
        onRefresh();
        // Automatically select the newly compiled report
        setSelectedReport(data);
        // Clear dates
        setWeekStart('');
        setWeekEnd('');
      } else {
        setGenError(data.error || 'Failed during statistical synthesis or consultation compilation.');
      }
    } catch (err) {
      setGenError('Server connection timeout during consultant compilation.');
    } finally {
      setLoadingAi(false);
    }
  };

  // Pre-configured suggestions to compose completed periods
  const suggestions = [
    { start: '2026-05-04', end: '2026-05-10', label: 'Flock Cycle Week 1 (Chick Phase)' },
    { start: '2026-05-11', end: '2026-05-17', label: 'Flock Cycle Week 2 (Grower transition)' },
    { start: '2026-05-18', end: '2026-05-24', label: 'Flock Cycle Week 3 (Maturity Phase)' },
    { start: '2026-05-25', end: '2026-05-31', label: 'Flock Cycle Week 4 (Harvest / Sell Phase)' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Print CSS Styles */}
      <style>{`
        @media print {
          /* Hide non-printable inner action items */
          #btn-print-weekly,
          #btn-export-single-weekly {
            display: none !important;
          }
          /* Print text resets */
          #ai-summary-card * {
            color: #0f172a !important;
            text-shadow: none !important;
          }
          /* Accents and subtle headers */
          #ai-summary-card .text-emerald-400,
          #ai-summary-card .text-emerald-400\\/80 {
            color: #047857 !important;
          }
          #ai-summary-card .text-slate-400,
          #ai-summary-card .text-slate-500 {
            color: #475569 !important;
          }
          #ai-summary-card .bg-emerald-500\\/20 {
            background-color: #e6f4ea !important;
            border: 1px solid #a7f3d0 !important;
          }
          /* Parameters grid design for printer */
          #ai-print-parameters {
            background-color: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            color: #0f172a !important;
          }
          #ai-print-parameters div {
            border-color: #cbd5e1 !important;
          }
          #ai-print-parameters span,
          #ai-print-parameters .font-mono {
            color: #0f172a !important;
          }
          #ai-summary-card .border-emerald-800\\/60,
          #ai-summary-card .border-emerald-850\\/60 {
            border-color: #e2e8f0 !important;
          }
          /* Code blocks and quote boxes */
          #ai-summary-card .border-emerald-500 {
            border-left-width: 4px !important;
            border-left-color: #059669 !important;
            padding-left: 16px !important;
          }
          #ai-summary-card .text-slate-200 {
            color: #1e293b !important;
            font-family: Georgia, Cambria, "Times New Roman", Times, serif !important;
            font-size: 11.5pt !important;
            line-height: 1.6 !important;
          }
        }
      `}</style>

      {/* Compiler Action and Suggestions Side Panel */}
      <div className="space-y-4 print:hidden">
        {canGenerate ? (
          <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
              <Cpu size={16} className="text-emerald-600" />
              Compile Weekly Analytics
            </h3>
            <p className="text-xs text-slate-400 mb-4">Calculate total flock stats, expenses, margins & compile executive consultant review.</p>

            <form onSubmit={handleGenerateWeeklyReport} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Week Start (Mon)</label>
                  <input 
                    id="input-week-start"
                    type="date"
                    required
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Week End (Sun)</label>
                  <input 
                    id="input-week-end"
                    type="date"
                    required
                    value={weekEnd}
                    onChange={(e) => setWeekEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {genError && (
                <div role="alert" className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 font-semibold rounded-lg flex items-start gap-1.5">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{genError}</span>
                </div>
              )}

              {genSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold rounded-lg flex items-start gap-1.5">
                  <Award size={14} className="shrink-0 mt-0.5" />
                  <span>{genSuccess}</span>
                </div>
              )}

              <button 
                id="btn-trigger-compile"
                type="submit"
                disabled={loadingAi}
                className="w-full py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer transition active:scale-[0.98]"
              >
                {loadingAi ? (
                  <>
                    <RefreshCw className="animate-spin text-emerald-200" size={14} />
                    Consulting Executive Advisory...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-amber-300" />
                    Compile & Run Executive Audit
                  </>
                )}
              </button>
            </form>

            {/* Quick Suggestions Helper */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 tracking-wider">Quick Suggestions (Demo Flock)</span>
              <div className="space-y-1.5">
                {suggestions.map((s, idx) => (
                  <button 
                    key={idx}
                    type="button"
                    onClick={() => {
                      setWeekStart(s.start);
                      setWeekEnd(s.end);
                      setGenError('');
                      setGenSuccess('');
                    }}
                    className="w-full text-left p-2 hover:bg-slate-50 border border-slate-100 rounded-lg text-slate-600 transition flex justify-between items-center text-[11px]"
                  >
                    <span>{s.label}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-slate-400 italic text-xs leading-relaxed">
            🔒 Supervisor / Attendant Mode: Only farmers holding executive **ADMIN** profiles are authorized to trigger manual weekly calculation synthesis metrics.
          </div>
        )}
      </div>

      {/* Main Historical List and AI Summary Viewer */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Weekly reports archives */}
        <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs print:hidden">
          <div className="mb-4 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all">
            <div>
              <h3 className="font-semibold text-slate-800 text-base">Weekly Synthesis Archives</h3>
              <p className="text-xs text-slate-400">Summarized batch stats generated every Sunday at week-end harvest phases</p>
            </div>
            {weeklyReports.length > 0 && (
              <button
                id="btn-export-all-weekly"
                onClick={handleExportAllToCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-705 border border-slate-200 rounded-lg text-xs font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-center"
                title="Export all weekly logs to downloadable CSV"
              >
                <Download size={13} strokeWidth={2.5} className="text-slate-500" />
                Export Archives (CSV)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {weeklyReports.map((report) => {
              const isSelected = selectedReport?.id === report.id;
              const fcr = (report.feed_used / (report.opening_birds - report.total_mortality)).toFixed(3);
              return (
                <div 
                  id={`week-card-${report.id}`}
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`border p-4 rounded-xl cursor-pointer transition flex flex-col justify-between ${isSelected ? 'border-emerald-500 bg-emerald-50/20 shadow-xs' : 'border-slate-150 hover:bg-slate-50/55'}`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-700 font-bold text-xs flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {report.week_start} ➔ {report.week_end}
                      </span>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Compiled
                      </span>
                    </div>

                    {/* Stats metrics */}
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono border-t border-slate-100/60 pt-2.5 mt-2">
                      <div>
                        <span className="text-[9px] font-sans text-slate-400 block">Total Sold</span>
                        <span className="font-bold text-slate-800">
                          {report.opening_birds - report.closing_birds - report.total_mortality > 0
                            ? (report.opening_birds - report.closing_birds - report.total_mortality)
                            : 0} birds
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-sans text-slate-400 block">Deaths</span>
                        <span className="font-bold text-rose-500">{report.total_mortality} birds</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-sans text-slate-400 block">Profit</span>
                        <span className={`font-bold ${report.profit_loss >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          ${report.profit_loss.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100/60 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Feather size={10} className="text-amber-500" /> FCR Indicator: {fcr} bags/bird
                    </span>
                    <span className="font-sans font-semibold text-slate-600 flex items-center gap-1">
                      View exec summary <ChevronRight size={10} />
                    </span>
                  </div>
                </div>
              );
            })}

            {weeklyReports.length === 0 && (
              <div className="col-span-2 text-center py-8 text-slate-400 italic text-xs">
                No weekly reports generated yet. Enter farm coordinates on the left panel to compile.
              </div>
            )}
          </div>
        </div>

        {/* Selected Weekly report full details showing AI Summary Card */}
        {selectedReport && (
          <div id="ai-summary-card" className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-800 text-white rounded-xl p-5 shadow-lg space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-emerald-800/60">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Sparkles size={16} />
                </span>
                <div>
                  <h4 className="font-semibold text-sm">Weekly Executive Consultant Summary</h4>
                  <p className="text-[10px] text-emerald-400/80">Period: {selectedReport.week_start} to {selectedReport.week_end}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-print-weekly"
                  onClick={handlePrint}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                  title="Print this executive report"
                >
                  <Printer size={11} />
                  Print
                </button>
                <button
                  id="btn-export-single-weekly"
                  onClick={() => handleExportSingleToCSV(selectedReport)}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                  title="Export this report data and summary to CSV"
                >
                  <Download size={11} />
                  Export
                </button>
                <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Weekly Insights
                </span>
              </div>
            </div>

            {/* Quick parameters readout */}
            <div id="ai-print-parameters" className="grid grid-cols-4 gap-2 text-center text-xs py-2 bg-slate-900/40 rounded-xl border border-emerald-900/50">
              <div className="border-r border-emerald-900/50">
                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Opening</span>
                <span className="font-mono text-emerald-300 font-semibold">{selectedReport.opening_birds.toLocaleString()}</span>
              </div>
              <div className="border-r border-emerald-900/50">
                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Closing</span>
                <span className="font-mono text-emerald-300 font-semibold">{selectedReport.closing_birds.toLocaleString()}</span>
              </div>
              <div className="border-r border-emerald-900/50">
                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Feed Consumed</span>
                <span className="font-mono text-emerald-300 font-semibold">{selectedReport.feed_used} bags</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Aggregate Loss</span>
                <span className="font-mono text-rose-400 font-bold">{selectedReport.total_mortality} birds</span>
              </div>
            </div>

            {/* AI Summary Text Box in Editorial Serif Style */}
            <div className="space-y-3 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Executive Assessment</span>
              <p className="text-slate-200 text-xs font-serif leading-relaxed tracking-wide antialiased whitespace-pre-wrap pl-3 border-l-2 border-emerald-500">
                {selectedReport.ai_summary}
              </p>
            </div>

            {/* Generating timestamp */}
            <div className="text-[10px] text-slate-500 text-right pt-3 border-t border-emerald-850/60">
              Generated by farm automation: {new Date(selectedReport.generated_at).toLocaleString()}
            </div>
          </div>
        )}

        {/* Dynamic Multi-line Trend Chart */}
        {weeklyReports.length > 0 && (
          <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs print:hidden">
            <div className="mb-4 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <TrendingUp size={18} className="text-emerald-600" />
                  Management Trajectory Over Time (Last 4 Weeks)
                </h3>
                <p className="text-[11px] text-slate-400">Comparing total net profit ($) with flock mortality rates side-by-side using dual-axis indicators.</p>
              </div>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  
                  {/* Left Axis for Profit */}
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    stroke="#10b981" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(v) => `$${v.toLocaleString()}`}
                  />
                  
                  {/* Right Axis for Mortality */}
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#ef4444" 
                    fontSize={11} 
                    tickLine={false} 
                  />
                  
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  
                  {/* Net Profit Line */}
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="Total Profit ($)" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    activeDot={{ r: 6 }} 
                  />
                  
                  {/* Mortality Line */}
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="Mortality Rate" 
                    stroke="#ef4444" 
                    strokeWidth={2.5} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Calendar, 
  MessageSquare, 
  CheckCircle,
  AlertTriangle,
  Send,
  X,
  PlusCircle,
  Eye,
  Activity,
  Feather,
  Download,
  Camera,
  Printer
} from 'lucide-react';
import { DailyReport, Comment, Profile, checkPermission } from '../types.js';

interface DailyReportsProps {
  reports: DailyReport[];
  user: Profile;
  token: string;
  onRefresh: () => void;
}

export default function DailyReportsSection({ reports, user, token, onRefresh }: DailyReportsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  // Camera & Visual Attachments states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [formAttachments, setFormAttachments] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser or sandbox environment doesn't support the MediaDevices API inside this window.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access failed", err);
      setCameraError(err?.message || "User permission denied or camera device is active in another app. You can still attach files manually.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setCameraError('');
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      setFormAttachments(prev => [...prev, base64]);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormAttachments(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file as Blob);
    });
  };

  const handleExportToCSV = () => {
    const headers = [
      "Report Date",
      "Bird closing count",
      "Mortality metrics",
      "Feed Consumed (bags)",
      "Medication growth additives",
      "Vaccination sequence",
      "Revenue from Sales ($)",
      "Total Costs ($)",
      "Net Profit ($)",
      "Crew Observations"
    ];

    const rows = filteredReports.map(report => {
      const netProfit = report.sales - report.expenses;
      const escape = (str: string | undefined | null) => {
        if (!str) return '""';
        return `"${str.replace(/"/g, '""')}"`;
      };
      return [
        report.report_date,
        report.bird_count,
        report.mortality,
        report.feed_consumed,
        escape(report.medication),
        escape(report.vaccination),
        report.sales,
        report.expenses,
        netProfit,
        escape(report.notes)
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `YSJ_Broiler_Daily_Reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (selectedReport) {
      const storedToken = token || localStorage.getItem('token') || '';
      const url = `/api/print/daily/${selectedReport.id}?token=${storedToken}`;
      window.open(url, '_blank');
    } else {
      window.print();
    }
  };
  
  // Modal toggle states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTargetReport, setEditTargetReport] = useState<DailyReport | null>(null);
  
  // Active report comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Form Fields State
  const [reportDate, setReportDate] = useState('');
  const [openingBirds, setOpeningBirds] = useState<number>(12000);
  const [birdsSold, setBirdsSold] = useState<number>(0);
  const [birdCount, setBirdCount] = useState<number>(12000);
  const [mortality, setMortality] = useState<number>(0);
  const [feedConsumed, setFeedConsumed] = useState<number>(0);
  const [medication, setMedication] = useState('');
  const [vaccination, setVaccination] = useState('');
  const [sales, setSales] = useState<number>(0);
  const [expenses, setExpenses] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Helper to find previous day's closing bird count
  const getPreviousClosingBirds = (dateString: string): number => {
    if (!dateString) return 12000;
    // Find reports chronologically before this date
    const priorReports = reports
      .filter((r) => r.report_date < dateString)
      .sort((a, b) => b.report_date.localeCompare(a.report_date));
    if (priorReports.length > 0) {
      return priorReports[0].bird_count;
    }
    const sortedReports = [...reports].sort((a, b) => a.report_date.localeCompare(b.report_date));
    if (sortedReports.length > 0) {
      return sortedReports[0].bird_count;
    }
    return 12000;
  };

  // Watch for reportDate changes in ADD modal to fetch previous closing population automatically
  useEffect(() => {
    if (showAddModal && reportDate) {
      const prevClosing = getPreviousClosingBirds(reportDate);
      setOpeningBirds(prevClosing);
    }
  }, [reportDate, showAddModal, reports]);

  // Keep closing birdCount auto-calculated in real time when inputs change
  useEffect(() => {
    const calc = openingBirds - mortality - birdsSold;
    setBirdCount(calc < 0 ? 0 : calc);
  }, [openingBirds, mortality, birdsSold]);

  // Clean up camera stream and errors when either modal is closed or inactive
  useEffect(() => {
    if (!showAddModal && !showEditModal) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setIsCameraActive(false);
      setCameraError('');

      // Reset all inputs completely to avoid cross-modal state contamination
      setReportDate('');
      setOpeningBirds(12000);
      setBirdsSold(0);
      setBirdCount(12000);
      setMortality(0);
      setFeedConsumed(0);
      setMedication('');
      setVaccination('');
      setSales(0);
      setExpenses(0);
      setNotes('');
      setFormError('');
      setFormSuccess('');
    }
  }, [showAddModal, showEditModal]);

  // Fetch comments whenever the selected report changes
  const fetchComments = async (reportId: string) => {
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setComments(data);
      }
    } catch (err) {
      console.error("Failed fetching comments log", err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (selectedReport) {
      fetchComments(selectedReport.id);
    }
  }, [selectedReport]);

  const handleSelectReport = (report: DailyReport) => {
    setSelectedReport(report);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !newCommentText.trim() || !checkPermission.canComment(user.role)) return;

    try {
      const response = await fetch(`/api/reports/${selectedReport.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment: newCommentText })
      });
      const data = await response.json();
      if (response.ok) {
        setComments(prev => [...prev, data]);
        setNewCommentText('');
        // Alert main app for audit / details triggers
        onRefresh();
      } else {
        alert(data.error || 'Failed to publish comment.');
      }
    } catch (err) {
      alert('Network failure posting comment review.');
    }
  };

  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!reportDate) {
      setFormError('Operating date is required.');
      return;
    }

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          report_date: reportDate,
          bird_count: birdCount,
          mortality,
          feed_consumed: feedConsumed,
          medication,
          vaccination,
          sales,
          expenses,
          birds_sold: birdsSold,
          notes,
          attachments: formAttachments
        })
      });

      const data = await response.json();

      if (response.ok) {
        setFormSuccess('Daily Broiler Report committed successfully.');
        setShowAddModal(false);
        // Reset states
        setReportDate('');
        setMortality(0);
        setFeedConsumed(0);
        setMedication('');
        setVaccination('');
        setSales(0);
        setExpenses(0);
        setNotes('');
        setFormAttachments([]);
        
        onRefresh();
      } else {
        setFormError(data.error || 'Failed to submit report log.');
      }
    } catch (err) {
      setFormError('Network communication failure with farm database.');
    }
  };

  const handleEditReportClick = (report: DailyReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTargetReport(report);
    setReportDate(report.report_date);
    
    // Auto-calculate previous closing population count
    const prevClosing = getPreviousClosingBirds(report.report_date);
    setOpeningBirds(prevClosing);
    setBirdsSold(report.birds_sold || 0);

    setBirdCount(report.bird_count);
    setMortality(report.mortality);
    setFeedConsumed(report.feed_consumed);
    setMedication(report.medication);
    setVaccination(report.vaccination);
    setSales(report.sales);
    setExpenses(report.expenses);
    setNotes(report.notes);
    setFormAttachments(report.attachments || []);
    stopCamera();
    
    setFormError('');
    setFormSuccess('');
    setShowEditModal(true);
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetReport) return;
    setFormError('');
    setFormSuccess('');

    try {
      const response = await fetch(`/api/reports/${editTargetReport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          report_date: reportDate,
          bird_count: birdCount,
          mortality,
          feed_consumed: feedConsumed,
          medication,
          vaccination,
          sales,
          expenses,
          birds_sold: birdsSold,
          notes,
          attachments: formAttachments
        })
      });

      const data = await response.json();

      if (response.ok) {
        setFormSuccess('Report successfully revised.');
        setShowEditModal(false);
        setEditTargetReport(null);
        setFormAttachments([]);
        if (selectedReport?.id === editTargetReport.id) {
          setSelectedReport(data);
        }
        onRefresh();
      } else {
        setFormError(data.error || 'Failed to revise report log.');
      }
    } catch (err) {
      setFormError('Server integration fault.');
    }
  };

  const handleDeleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("CRITICAL WARNING:\nAre you sure you want to permanently delete this daily report?\nThis will purge all nested supervisor commentaries and audit stats. This action is irreversible.")) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        if (selectedReport?.id === id) {
          setSelectedReport(null);
        }
        onRefresh();
      } else {
        alert(data.error || 'Failed to execute deletion.');
      }
    } catch (err) {
      alert('Network transmission block.');
    }
  };

  const filteredReports = reports.filter(r => 
    r.report_date.includes(searchTerm) || 
    r.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.medication.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.vaccination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canModify = checkPermission.canCreateReport(user.role);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Print CSS Styles */}
      <style>{`
        @media print {
          /* Hide non-printable inner details controls and logs lists */
          #btn-close-details,
          #btn-print-report,
          #input-comment-text,
          #btn-post-comment,
          .form-comment-input,
          .comments-header,
          .comment-bubble-wrapper,
          .lg\\:col-span-2 {
            display: none !important;
          }
          /* Card specific stats layout */
          .stats-grid {
            background-color: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Main Listing Section */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors duration-200">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white text-base">Daily Biometric Logs</h3>
              <p className="text-xs text-slate-400 dark:text-slate-400">Chronological daily monitoring inputs on broiler birds</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button 
                id="btn-export-csv"
                onClick={handleExportToCSV}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold active:scale-95 transition-all flex items-center gap-1.5 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Export currently visible filtered logs to downloadable CSV"
              >
                <Download size={14} />
                Export to CSV
              </button>

              {canModify && (
                <button 
                  id="btn-add-report"
                  onClick={() => {
                    // Pre-fill bird count with latest or 12000
                    const lastCount = reports[0]?.bird_count ?? 12000;
                    setBirdCount(lastCount);
                    setReportDate(new Date().toISOString().split('T')[0]);
                    setFormError('');
                    setFormSuccess('');
                    setFormAttachments([]);
                    setShowAddModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus size={15} />
                  Log Daily Metrics
                </button>
              )}
            </div>
          </div>

          {/* Search Query */}
          <div className="relative mb-4">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={15} />
            </span>
            <input 
              id="input-search-reports"
              type="text"
              placeholder="Search reports by date, notes, medications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-y border-slate-100 dark:border-slate-800 uppercase text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider transition-colors">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Bird Population</th>
                  <th className="px-4 py-2.5">Mortality</th>
                  <th className="px-4 py-2.5">Feed (bags)</th>
                  <th className="px-4 py-2.5">Profit/Loss</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReports.map((report) => {
                  const isSelected = selectedReport?.id === report.id;
                  const itemProfit = report.sales - report.expenses;
                  return (
                    <tr 
                      key={report.id}
                      onClick={() => handleSelectReport(report)}
                      className={`cursor-pointer transition hover:bg-slate-50/75 dark:hover:bg-slate-800/40 ${isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                          {report.report_date}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">{report.bird_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-800">
                        {report.mortality > 0 ? (
                          <span className={`font-mono text-xs font-semibold ${report.mortality > 6 ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded' : 'text-slate-700 dark:text-slate-300'}`}>
                            {report.mortality} birds
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{report.feed_consumed} bags</td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono">
                        {itemProfit > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+${itemProfit}</span>
                        ) : itemProfit < 0 ? (
                          <span className="text-rose-500 dark:text-rose-400 font-semibold">-${Math.abs(itemProfit)}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            id={`btn-view-${report.id}`}
                            onClick={() => handleSelectReport(report)}
                            className="p-1 px-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded transition"
                            title="View sheet details and comments"
                          >
                            <Eye size={14} />
                          </button>
                          
                          {canModify && (
                            <>
                              <button 
                                id={`btn-edit-${report.id}`}
                                onClick={(e) => handleEditReportClick(report, e)}
                                className="p-1 px-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition"
                                title="Edit parameters"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                id={`btn-del-${report.id}`}
                                onClick={(e) => handleDeleteReport(report.id, e)}
                                className="p-1 px-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition"
                                title="Delete record"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                      No matching daily broiler entry logs located.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Side Details Pane + Comments System */}
      <div className="space-y-4">
        {selectedReport ? (
          <div id="printable-report-card" className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between transition-colors duration-200">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                  <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <h4>Sheet: {selectedReport.report_date}</h4>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-print-report"
                    onClick={handlePrint}
                    className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold hover:scale-105 active:scale-95 transition flex items-center gap-1 cursor-pointer"
                    title="Print report card layout formatted to A4 pages"
                  >
                    <Printer size={13} />
                    Print
                  </button>
                  <button 
                    id="btn-close-details"
                    onClick={() => setSelectedReport(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Stats Breakdown */}
              <div className="grid grid-cols-3 gap-3 mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800 font-mono text-xs transition-colors duration-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold tracking-wider block">Live Population</span>
                  <span className="text-slate-800 dark:text-slate-100 font-bold text-sm block">{selectedReport.bird_count.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold tracking-wider block">Day Mortality</span>
                  <span className={`font-bold text-sm block ${selectedReport.mortality > 6 ? 'text-rose-505 font-extrabold text-rose-600 dark:text-rose-450' : 'text-slate-800 dark:text-slate-100'}`}>
                    {selectedReport.mortality} birds
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-sans font-semibold tracking-wider block">Feed Consumed</span>
                  <span className="text-slate-800 dark:text-slate-250 font-bold block flex items-center gap-1">
                    <Feather size={12} className="text-amber-500" /> {selectedReport.feed_consumed} bags
                  </span>
                </div>
              </div>

              {/* Veterinary & Financial context */}
              <div className="space-y-2 mb-4 text-xs">
                <div className="p-2 py-1.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
                  <span className="text-slate-400 font-medium">Vaccination Protocol:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedReport.vaccination}</span>
                </div>
                <div className="p-2 py-1.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
                  <span className="text-slate-400 font-medium">Medication/Additive:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedReport.medication}</span>
                </div>
                <div className="p-2 py-1.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
                  <span className="text-slate-400 font-medium">Sales Revenue:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">${selectedReport.sales}</span>
                </div>
                <div className="p-2 py-1.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
                  <span className="text-slate-400 font-medium">Logging Operator:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedReport.created_by_name || 'Admin'}</span>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <span className="text-[10px] text-slate-400 uppercase font-semibold font-sans tracking-wider block mb-1">Notes & Crew Observation</span>
                <p className="bg-slate-50 dark:bg-slate-955 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap transition-colors">
                  {selectedReport.notes || 'No observation notes reported.'}
                </p>
              </div>

              {/* Snapshots Attachments Grid */}
              {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                <div className="mb-4">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold font-sans tracking-wider block mb-1.5">Camera Attachments ({selectedReport.attachments.length})</span>
                  <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg">
                    {selectedReport.attachments.map((img, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          const w = window.open();
                          if (w) w.document.write(`<img src="${img}" style="max-width:100%" referrerPolicy="no-referrer" />`);
                        }}
                        className="relative aspect-video rounded border border-slate-200 dark:border-slate-850 overflow-hidden cursor-zoom-in"
                      >
                        <img 
                          src={img} 
                          alt={`Snapshot ${idx + 1}`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Subsection */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2 print:hidden">
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold text-xs mb-3">
                  <MessageSquare size={14} className="text-emerald-500" />
                  <h5>Supervisor Commentaries ({comments.length})</h5>
                </div>

                {/* Comment Thread */}
                <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1 text-xs mb-4">
                  {loadingComments ? (
                    <div className="text-center py-2 text-slate-400 italic">Syncing commentary logs...</div>
                  ) : comments.map(com => (
                    <div key={com.id} className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-850 dark:text-slate-100 block text-[11px]">{com.user_name}</span>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${com.user_role === 'ADMIN' ? 'bg-emerald-100 text-emerald-800' : com.user_role === 'MD' ? 'bg-rose-100 text-rose-800 font-bold' : com.user_role === 'MANAGER' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                          {com.user_role}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-normal text-[11px]">{com.comment}</p>
                      <span className="text-[9px] text-slate-400 block mt-1 text-right">
                        {new Date(com.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}

                  {comments.length === 0 && !loadingComments && (
                    <p className="text-slate-400 text-center py-4 italic">No commentaries registered for this entry.</p>
                  )}
                </div>

                {/* Comment input form */}
                {checkPermission.canComment(user.role) ? (
                  <form onSubmit={handlePostComment} className="flex gap-1">
                    <input 
                      id="input-comment-text"
                      type="text"
                      placeholder="Add an executive commentary..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-750 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    />
                    <button 
                      id="btn-post-comment"
                      type="submit"
                      className="p-1 px-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                    >
                      <Send size={12} />
                    </button>
                  </form>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-[10px] text-slate-400 italic leading-normal">
                    🔒 Access Control: Only Administration, MD, Deputy MD, & Managers are authorized to attach commentary remarks on reports.
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/20 rounded-xl p-6 text-center shadow-xs flex flex-col justify-center items-center py-16">
            <span className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full mb-3 shadow-inner">
              <PlusCircle size={24} />
            </span>
            <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm mb-1">Select Daily Log Sheets</h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed max-w-[200px]">
              Tap any row in the biometric log ledger to audit comments, medication directives, and vaccination updates.
            </p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-base">New Daily Operations Log</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddReport} className="space-y-3.5 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Operational Date</label>
                  <input 
                    id="form-date"
                    type="date"
                    required
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Opening Stock (Birds)</label>
                  <input 
                    id="form-opening-birds"
                    type="number"
                    required
                    min={0}
                    value={openingBirds}
                    onChange={(e) => setOpeningBirds(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg font-mono text-slate-800 bg-slate-50"
                  />
                  <small className="text-[9px] text-slate-400 block mt-0.5">Sourced from previous closing (editable)</small>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1 text-rose-700">Mortality (today)</label>
                  <input 
                    id="form-mortality"
                    type="number"
                    required
                    min={0}
                    value={mortality}
                    onChange={(e) => setMortality(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg font-mono text-rose-600 font-bold"
                  />
                  <small className="text-[9px] text-slate-400 block mt-0.5">Number of bird deaths</small>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1 text-emerald-700">Birds Sold (today)</label>
                  <input 
                    id="form-birds-sold"
                    type="number"
                    required
                    min={0}
                    value={birdsSold}
                    onChange={(e) => setBirdsSold(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg font-mono text-emerald-600 font-semibold"
                  />
                  <small className="text-[9px] text-slate-400 block mt-0.5">Broilers sold/removed</small>
                </div>
                <div className="bg-amber-50/50 p-1.5 rounded-lg border border-amber-100">
                  <label className="block text-amber-800 font-bold mb-0.5">Closing Stock (auto)</label>
                  <input 
                    id="form-birds"
                    type="number"
                    disabled
                    value={birdCount}
                    className="w-full px-3 py-1 border border-slate-200 bg-slate-100 rounded-md font-mono font-bold text-slate-700 cursor-not-allowed text-center"
                  />
                  <small className="text-[8px] text-slate-500 block leading-tight mt-0.5 text-center">Remaining flock count</small>
                </div>
              </div>

              <div className="mb-3.5">
                <label className="block text-slate-500 font-semibold mb-1">Feed Used (bags)</label>
                <input 
                  id="form-feed"
                  type="number"
                  required
                  min={0}
                  value={feedConsumed}
                  onChange={(e) => setFeedConsumed(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Active Medication / Growth Booster</label>
                  <input 
                    id="form-med"
                    type="text"
                    placeholder="None"
                    value={medication}
                    onChange={(e) => setMedication(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Vaccination Code/Protocol</label>
                  <input 
                    id="form-vacc"
                    type="text"
                    placeholder="None"
                    value={vaccination}
                    onChange={(e) => setVaccination(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Total Income / Revenue ($)</label>
                  <input 
                    id="form-sales"
                    type="number"
                    min={0}
                    value={sales}
                    onChange={(e) => setSales(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg font-mono text-emerald-600 font-semibold bg-emerald-50/20"
                  />
                  <small className="text-[9px] text-slate-400 block mt-0.5">Broiler sales, litter sales, funding injections etc.</small>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Total Expenses ($)</label>
                  <input 
                    id="form-expenses"
                    type="number"
                    min={0}
                    value={expenses}
                    onChange={(e) => setExpenses(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg font-mono text-rose-600 font-semibold bg-rose-50/10"
                  />
                  <small className="text-[9px] text-slate-400 block mt-0.5">Petrol/fuel, repairs, maintenance, feed purchased etc.</small>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Observation Notes</label>
                <textarea 
                  id="form-notes"
                  placeholder="Describe flock condition, air ventilation settings, feed wastage, etc..."
                  value={notes}
                  rows={3}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800"
                ></textarea>
              </div>

              {/* Camera & Snapshots */}
              <div className="border-t border-slate-150 pt-3 mt-3">
                <span className="block text-slate-500 font-semibold mb-1.5 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                  <Camera size={14} className="text-emerald-600" />
                  Visual Attachments / Snapshots
                </span>
                
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {!isCameraActive ? (
                    <button
                      id="btn-start-camera"
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 border border-slate-250 cursor-pointer"
                    >
                      <Camera size={13} />
                      Start Camera Capture
                    </button>
                  ) : (
                    <div className="w-full flex flex-col gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <video 
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-48 bg-black rounded object-cover"
                      ></video>
                      <div className="flex gap-2">
                        <button
                          id="btn-capture-photo"
                          type="button"
                          onClick={capturePhoto}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] flex items-center justify-center gap-1"
                        >
                          <Camera size={13} />
                          Capture Frame Snapshot
                        </button>
                        <button
                          id="btn-stop-camera"
                          type="button"
                          onClick={stopCamera}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Standard file picker for base64 fallback */}
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 border border-slate-250 cursor-pointer">
                    <Plus size={13} />
                    Import Image File
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {cameraError && (
                  <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-400 rounded-lg text-[11px] leading-relaxed flex flex-col gap-1 shadow-xs">
                    <p className="font-semibold flex items-center gap-1 text-amber-700 dark:text-amber-300">
                      <AlertTriangle size={13} className="text-amber-600" />
                      Camera Permission or Connection Issue:
                    </p>
                    <p className="text-slate-600 dark:text-slate-350">{cameraError}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      💡 Tip: If you are previewing inside the sandbox iframe, try opening the application in a <strong>new tab</strong> to allow standard camera access prompts, or click <strong>Import Image File</strong> above to attach photos from your device.
                    </p>
                  </div>
                )}

                {/* Thumbnails list */}
                {formAttachments.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2 p-2 bg-slate-50 border border-slate-150 rounded-lg">
                    {formAttachments.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded border border-slate-200 overflow-hidden group">
                        <img 
                          src={img} 
                          alt={`Attachment ${idx + 1}`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setFormAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md flex items-center justify-center cursor-pointer"
                          style={{ width: '18px', height: '18px' }}
                          title="Remove snapshot"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 text-rose-600 font-semibold rounded-lg flex items-center gap-2">
                  <AlertTriangle size={15} /> {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-600 font-semibold rounded-lg flex items-center gap-2">
                  <CheckCircle size={15} /> {formSuccess}
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
                  id="btn-submit-report"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-semibold"
                >
                  Save Metrics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editTargetReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-base">Edit Daily Operations Logs</h4>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleUpdateReport} className="space-y-3.5 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Operational Date</label>
                  <input 
                    id="edit-date"
                    type="date"
                    required
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Opening Stock (Birds)</label>
                  <input 
                    id="edit-opening-birds"
                    type="number"
                    required
                    min={0}
                    value={openingBirds}
                    onChange={(e) => setOpeningBirds(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg font-mono text-slate-800 bg-slate-50"
                  />
                  <small className="text-[9px] text-slate-400 block mt-0.5">Sourced from previous closing (editable)</small>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1 text-rose-700">Mortality</label>
                  <input 
                    id="edit-mortality"
                    type="number"
                    required
                    min={0}
                    value={mortality}
                    onChange={(e) => setMortality(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg font-mono text-rose-600 font-bold"
                  />
                  <small className="text-[9px] text-slate-400 block mt-0.5">Number of bird deaths</small>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1 text-emerald-700">Birds Sold (today)</label>
                  <input 
                    id="edit-birds-sold"
                    type="number"
                    required
                    min={0}
                    value={birdsSold}
                    onChange={(e) => setBirdsSold(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg font-mono text-emerald-600 font-semibold"
                  />
                  <small className="text-[9px] text-slate-400 block mt-0.5">Broilers sold/removed</small>
                </div>
                <div className="bg-amber-50/50 p-1.5 rounded-lg border border-amber-100">
                  <label className="block text-amber-800 font-bold mb-0.5">Closing Stock (auto)</label>
                  <input 
                    id="edit-birds"
                    type="number"
                    disabled
                    value={birdCount}
                    className="w-full px-3 py-1 border border-slate-200 bg-slate-100 rounded-md font-mono font-bold text-slate-700 cursor-not-allowed text-center"
                  />
                  <small className="text-[8px] text-slate-500 block leading-tight mt-0.5 text-center">Remaining flock count</small>
                </div>
              </div>

              <div className="mb-3.5">
                <label className="block text-slate-500 font-semibold mb-1">Feed Used (bags)</label>
                <input 
                  id="edit-feed"
                  type="number"
                  required
                  min={0}
                  value={feedConsumed}
                  onChange={(e) => setFeedConsumed(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Active Medication</label>
                  <input 
                    id="edit-med"
                    type="text"
                    placeholder="None"
                    value={medication}
                    onChange={(e) => setMedication(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Vaccination protocol</label>
                  <input 
                    id="edit-vacc"
                    type="text"
                    placeholder="None"
                    value={vaccination}
                    onChange={(e) => setVaccination(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Total Income / Revenue ($)</label>
                  <input 
                    id="edit-sales"
                    type="number"
                    min={0}
                    value={sales}
                    onChange={(e) => setSales(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg font-mono text-emerald-600 font-semibold bg-emerald-50/20"
                  />
                  <small className="text-[9px] text-slate-400 block mt-0.5">Broiler sales, litter sales, funding injections etc.</small>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Total Expenses ($)</label>
                  <input 
                    id="edit-expenses"
                    type="number"
                    min={0}
                    value={expenses}
                    onChange={(e) => setExpenses(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-250 rounded-lg font-mono text-rose-600 font-semibold bg-rose-50/10"
                  />
                  <small className="text-[9px] text-slate-400 block mt-0.5">Petrol/fuel, repairs, maintenance, feed purchased etc.</small>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Observation Notes</label>
                <textarea 
                  id="edit-notes"
                  value={notes}
                  rows={3}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-250 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white text-slate-800"
                ></textarea>
              </div>

              {/* Camera & Snapshots */}
              <div className="border-t border-slate-150 pt-3 mt-3">
                <span className="block text-slate-500 font-semibold mb-1.5 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                  <Camera size={14} className="text-emerald-600" />
                  Visual Attachments / Snapshots
                </span>
                
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {!isCameraActive ? (
                    <button
                      id="edit-btn-start-camera"
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 border border-slate-250 cursor-pointer"
                    >
                      <Camera size={13} />
                      Start Camera Capture
                    </button>
                  ) : (
                    <div className="w-full flex flex-col gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <video 
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-48 bg-black rounded object-cover"
                      ></video>
                      <div className="flex gap-2">
                        <button
                          id="edit-btn-capture-photo"
                          type="button"
                          onClick={capturePhoto}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] flex items-center justify-center gap-1"
                        >
                          <Camera size={13} />
                          Capture Frame Snapshot
                        </button>
                        <button
                          id="edit-btn-stop-camera"
                          type="button"
                          onClick={stopCamera}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Standard file picker for base64 fallback */}
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 border border-slate-250 cursor-pointer">
                    <Plus size={13} />
                    Import Image File
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {cameraError && (
                  <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-400 rounded-lg text-[11px] leading-relaxed flex flex-col gap-1 shadow-xs">
                    <p className="font-semibold flex items-center gap-1 text-amber-700 dark:text-amber-300">
                      <AlertTriangle size={13} className="text-amber-600" />
                      Camera Permission or Connection Issue:
                    </p>
                    <p className="text-slate-600 dark:text-slate-350">{cameraError}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      💡 Tip: If you are previewing inside the sandbox iframe, try opening the application in a <strong>new tab</strong> to allow standard camera access prompts, or click <strong>Import Image File</strong> above to attach photos from your device.
                    </p>
                  </div>
                )}

                {/* Thumbnails list */}
                {formAttachments.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2 p-2 bg-slate-50 border border-slate-150 rounded-lg">
                    {formAttachments.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded border border-slate-200 overflow-hidden group">
                        <img 
                          src={img} 
                          alt={`Attachment ${idx + 1}`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setFormAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md flex items-center justify-center cursor-pointer"
                          style={{ width: '18px', height: '18px' }}
                          title="Remove snapshot"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 text-rose-600 font-semibold rounded-lg flex items-center gap-2">
                  <AlertTriangle size={15} /> {formError}
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
                  id="btn-edit-submit"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-semibold"
                >
                  Apply Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

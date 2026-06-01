/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Skull, 
  Activity, 
  DollarSign, 
  Calculator, 
  Sparkles, 
  Smartphone, 
  HelpCircle,
  TrendingDown,
  RefreshCw,
  Clock,
  ChevronRight,
  Calendar,
  X,
  Plus
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { DailyReport, Profile, FeedStockItem, checkPermission } from '../types.js';

interface DashboardProps {
  reports: DailyReport[];
  user: Profile;
  token: string;
  onRefresh?: () => void;
}

export default function DashboardInsights({ reports, user, token, onRefresh }: DashboardProps) {
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [selectedChart, setSelectedChart] = useState<'mortality' | 'finance' | 'feed'>('mortality');

  // Stock New Batch states
  const [showStockModal, setShowStockModal] = useState<boolean>(false);
  const [batchSize, setBatchSize] = useState<string>('12000');
  const [chickCost, setChickCost] = useState<string>('1.50');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [breed, setBreed] = useState<string>('Ross 308');
  const [medication, setMedication] = useState<string>('Vitamin supplements');
  const [notes, setNotes] = useState<string>('');
  const [clearHistory, setClearHistory] = useState<boolean>(true);
  const [stockingLoading, setStockingLoading] = useState<boolean>(false);
  const [stockError, setStockError] = useState<string>('');

  // Stock Feed states
  const [feedStocks, setFeedStocks] = useState<FeedStockItem[]>([]);
  const [showFeedModal, setShowFeedModal] = useState<boolean>(false);
  const [feedType, setFeedType] = useState<string>('Broilers Starter Crumble');
  const [feedBags, setFeedBags] = useState<string>('100');
  const [feedCostPerBag, setFeedCostPerBag] = useState<string>('21.50');
  const [feedStockDate, setFeedStockDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [feedNotes, setFeedNotes] = useState<string>('');
  const [feedLoading, setFeedLoading] = useState<boolean>(false);
  const [feedError, setFeedError] = useState<string>('');

  const fetchFeedStocks = async () => {
    try {
      const response = await fetch('/api/feed/stock', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFeedStocks(data);
      }
    } catch (err) {
      console.error('Failed to load feed stocks:', err);
    }
  };

  useEffect(() => {
    fetchFeedStocks();
  }, [reports]);

  const handleFeedStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedLoading(true);
    setFeedError('');

    try {
      const response = await fetch('/api/feed/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          feed_type: feedType,
          bags: Number(feedBags),
          cost_per_bag: Number(feedCostPerBag),
          date_stocked: feedStockDate,
          notes: feedNotes
        })
      });

      const data = await response.json();
      if (response.ok) {
        setShowFeedModal(false);
        setFeedNotes('');
        await fetchFeedStocks();
        onRefresh?.();
      } else {
        setFeedError(data.error || 'Failed to stock feed.');
      }
    } catch (err) {
      setFeedError('Operational network connection lost.');
    } finally {
      setFeedLoading(false);
    }
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockingLoading(true);
    setStockError('');

    try {
      const response = await fetch('/api/batches/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          batch_size: Number(batchSize),
          chick_cost: Number(chickCost),
          start_date: startDate,
          breed,
          medication,
          notes,
          clear_history: clearHistory
        })
      });

      const data = await response.json();
      if (response.ok) {
        setShowStockModal(false);
        setNotes('');
        onRefresh?.();
      } else {
        setStockError(data.error || 'Failed to stock new batch.');
      }
    } catch (err) {
      setStockError('Operational network connection lost.');
    } finally {
      setStockingLoading(false);
    }
  };

  // Calculate Metrics from raw reports
  const totalReportsCount = reports.length;
  
  // Chronological order to find the start of the batch
  const sortedChronological = [...reports].sort((a, b) => a.report_date.localeCompare(b.report_date));
  const earliestReport = sortedChronological[0];
  const latestReport = reports[0]; 

  const originalFlockSize = earliestReport 
    ? (earliestReport.bird_count + earliestReport.mortality + (earliestReport.birds_sold || 0)) 
    : 0;

  const currentFlockCount = latestReport ? latestReport.bird_count : 0;
  
  // Mortalities
  const recentMortality = reports.slice(0, 7).reduce((sum, r) => sum + r.mortality, 0);
  const accumulatedMortality = reports.reduce((sum, r) => sum + r.mortality, 0);
  const mortalityPercentage = originalFlockSize > 0 
    ? ((accumulatedMortality / originalFlockSize) * 100).toFixed(2) 
    : "0.00";

  // Financials
  const accumulatedSales = reports.reduce((sum, r) => sum + r.sales, 0);
  const accumulatedExpenses = reports.reduce((sum, r) => sum + r.expenses, 0);
  const netEarnings = accumulatedSales - accumulatedExpenses;

  // Feed consumed (sacks)
  const totalBagsConsumed = reports.reduce((sum, r) => sum + r.feed_consumed, 0);

  // Feed Stock Calculations
  const totalBagsStocked = feedStocks.reduce((sum, fs) => sum + fs.bags, 0);
  const remainingFeedStock = totalBagsStocked - totalBagsConsumed;

  // Parse chart data (reverse to chronological order for charts)
  const chartData = [...reports].reverse().slice(-14).map(r => ({
    date: new Date(r.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    "Mortality": r.mortality,
    "FCR Feed (bags)": r.feed_consumed,
    "Sales ($)": r.sales,
    "Expenses ($)": r.expenses,
    "Net Operating ($)": r.sales - r.expenses
  }));

  // Dynamic milestone calculations
  let flockAgeDays = 0;
  let batchStartDateStr = "";
  let cycleStatus = "PENDING BATCH";
  let feedProgram = "None";

  if (earliestReport) {
    const start = new Date(earliestReport.report_date);
    const latest = latestReport ? new Date(latestReport.report_date) : new Date();
    const diffTime = Math.abs(latest.getTime() - start.getTime());
    flockAgeDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    batchStartDateStr = new Date(earliestReport.report_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    if (flockAgeDays < 10) {
      cycleStatus = "CHICK PHASE";
      feedProgram = "Broilers Starter Crumble";
    } else if (flockAgeDays < 25) {
      cycleStatus = "GROWER PHASE";
      feedProgram = "Broilers Grower Pellet";
    } else if (flockAgeDays < 35) {
      cycleStatus = "FINISHER PHASE";
      feedProgram = "Broilers Finisher Pellet";
    } else {
      cycleStatus = "HARVEST STAGE";
      feedProgram = "Broilers Finisher Pellet";
    }
  }

  // Trigger Gemini Farm Advisor
  const fetchAiAdvice = async () => {
    setLoadingAi(true);
    setAiAdvice('');
    try {
      const response = await fetch('/api/ai/analyse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setAiAdvice(data.analysis || 'Analysis delivered.');
      } else {
        setAiAdvice(data.error || 'Server returned an error.');
      }
    } catch (err) {
      setAiAdvice('Network connectivity failure or backend offline. Please verify API key.');
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    // Lazy load first advice on mount to preserve token usage but give clean UI
    if (reports.length > 0) {
      fetchAiAdvice();
    }
  }, [totalReportsCount]);

  const renderStockModal = () => (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm">🐣</span>
            <div>
              <h3 className="font-bold text-sm">Stock New Broiler flock Batch</h3>
              <p className="text-[10px] text-slate-400">Initialize a new broiler production cohort</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setShowStockModal(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleStockSubmit} className="p-6 space-y-4">
          {stockError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              ⚠️ {stockError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Chicks Placed (Count)</label>
              <input
                type="number"
                required
                min="1"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-emerald-500"
                placeholder="e.g. 12000"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cost per Chick ($)</label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={chickCost}
                onChange={(e) => setChickCost(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-emerald-500"
                placeholder="e.g. 1.50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Stocking Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Breed Variety</label>
              <input
                type="text"
                required
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-emerald-500"
                placeholder="e.g. Ross 308"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Starter Medication</label>
            <input
              type="text"
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-emerald-500"
              placeholder="e.g. Anti-stress multivitamin"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Optional Administration Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-emerald-500 resize-none font-sans"
              placeholder="e.g. Starter feed bags stacked. Chick density checks approved."
            ></textarea>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-lg flex items-start gap-2.5">
            <input
              id="chk-clear-history"
              type="checkbox"
              checked={clearHistory}
              onChange={(e) => setClearHistory(e.target.checked)}
              className="mt-1 accent-amber-600 rounded cursor-pointer"
            />
            <label htmlFor="chk-clear-history" className="text-[11px] text-amber-800 leading-normal font-medium cursor-pointer selection:bg-transparent">
              <strong>Clear previous batch records?</strong> (highly recommended)<br />
              Wipes old offline database daily reports so the dashboard analytics, cumulative feed intake, mortality graphs, and cumulative sales start fresh with this cohort.
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowStockModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={stockingLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {stockingLoading ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  Stocking Chicks...
                </>
              ) : (
                'Confirm & Stock Batch'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderFeedModal = () => (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 bg-amber-500/20 text-amber-200 rounded-lg text-sm">🌾</span>
            <div>
              <h3 className="font-bold text-sm">Stock Feed Inventory</h3>
              <p className="text-[10px] text-amber-200">Replenish feed supplies & book purchasing expenses</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setShowFeedModal(false)}
            className="p-1 text-amber-200 hover:text-white rounded-lg hover:bg-amber-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleFeedStockSubmit} className="p-6 space-y-4">
          {feedError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              ⚠️ {feedError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Feed Type / Variety</label>
            <select
              value={feedType}
              onChange={(e) => setFeedType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-amber-500 font-medium cursor-pointer"
            >
              <option value="Broilers Starter Crumble">Broilers Starter Crumble (0 - 14 Days)</option>
              <option value="Broilers Grower Pellet">Broilers Grower Pellet (15 - 28 Days)</option>
              <option value="Broilers Finisher Pellet">Broilers Finisher Pellet (29+ Days)</option>
              <option value="Pre-Starter Mash">Pre-Starter Mash</option>
              <option value="Other / Special Feed mix">Other / Special Feed mix</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bags / Sacks Stocked</label>
              <input
                type="number"
                required
                min="1"
                value={feedBags}
                onChange={(e) => setFeedBags(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-amber-500"
                placeholder="e.g. 100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cost per Bag ($)</label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={feedCostPerBag}
                onChange={(e) => setFeedCostPerBag(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-amber-500"
                placeholder="e.g. 21.50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Delivery Replenishing Date</label>
            <input
              type="date"
              required
              value={feedStockDate}
              onChange={(e) => setFeedStockDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Optional Delivery / Supplier Notes</label>
            <textarea
              value={feedNotes}
              onChange={(e) => setFeedNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-amber-500 resize-none font-sans"
              placeholder="e.g. Delivered by Premier Feeds Ltd. Batch checked for moisture control."
            ></textarea>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-lg text-[11px] text-amber-800 leading-normal font-medium flex items-start gap-2.5">
            <span className="text-sm">👉</span>
            <div>
              <strong>Automatic Bookkeeping Injected</strong><br />
              Stocking this feed automatically registers an expense of <strong>${(Number(feedBags || 0) * Number(feedCostPerBag || 0)).toLocaleString()}</strong> into the daily report record for <strong>{feedStockDate}</strong> to keep financial calculations synchronized.
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowFeedModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={feedLoading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {feedLoading ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  Stocking Feed...
                </>
              ) : (
                'Confirm & Stock Feed'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Dashboard Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Poultry Performance Center</h2>
          <p className="text-xs text-slate-500">Live operational review, dynamic biometrics & cycle management</p>
        </div>
        {checkPermission.canCreateReport(user.role) && (
          <div className="flex gap-2.5 shrink-0">
            <button
              id="btn-stock-feed-active"
              onClick={() => setShowFeedModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer whitespace-nowrap"
            >
              🌾 Stock Feed
            </button>
            <button
              id="btn-stock-batch-active"
              onClick={() => setShowStockModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer whitespace-nowrap"
            >
              🐣 Stock New Batch
            </button>
          </div>
        )}
      </div>

      {/* Elegant Empty State Alert banner inside dashboard overview */}
      {reports.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="text-xl">🐣</span>
            <div className="text-left">
              <h4 className="text-xs font-bold text-amber-800">No Active Flock Production Cohort</h4>
              <p className="text-[11px] text-amber-600 mt-0.5">The telemetry database has no records. Stock a new batch of chicks to initialize live metrics tracking.</p>
            </div>
          </div>
          {checkPermission.canCreateReport(user.role) && (
            <button
              onClick={() => setShowStockModal(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition active:scale-95"
            >
              Stock First Cohort
            </button>
          )}
        </div>
      )}

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1 */}
        <div id="stat-birds" className="bg-white border border-emerald-100 rounded-xl p-3.5 sm:p-4 shadow-xs overflow-hidden">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate" title="Live Birds">Live Birds</span>
            <span className="p-1 sm:p-1.5 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
              <Activity size={14} />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl xl:text-2xl font-bold font-mono text-slate-800 truncate" title={currentFlockCount.toLocaleString()}>
            {currentFlockCount.toLocaleString()}
          </div>
          <p className="mt-1 text-[10px] text-slate-400 truncate">Of {originalFlockSize.toLocaleString()}</p>
        </div>

        {/* Card 2 */}
        <div id="stat-mortality" className="bg-white border border-rose-100 rounded-xl p-3.5 sm:p-4 shadow-xs overflow-hidden">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate" title="Mortality Rate">Mortality Rate</span>
            <span className="p-1 sm:p-1.5 bg-rose-50 text-rose-600 rounded-lg shrink-0">
              <Skull size={14} />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl xl:text-2xl font-bold font-mono text-rose-600 truncate" title={`${mortalityPercentage}%`}>
            {mortalityPercentage}%
          </div>
          <p className="mt-1 text-[10px] text-slate-400 truncate" title={`${accumulatedMortality} birds lost / 7d recent: ${recentMortality}`}>
            {accumulatedMortality} lost / {recentMortality} recent
          </p>
        </div>

        {/* Card 3 */}
        <div id="stat-feed" className="bg-white border border-amber-100 rounded-xl p-3.5 sm:p-4 shadow-xs overflow-hidden">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate" title="Feed Stock Balance">Feed Balance</span>
            <span className="p-1 sm:p-1.5 bg-amber-50 text-amber-700 rounded-lg shrink-0">
              <Calculator size={14} />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl xl:text-2xl font-bold font-mono text-amber-700 truncate" title={`${remainingFeedStock < 0 ? 0 : remainingFeedStock} bags left`}>
            {remainingFeedStock < 0 ? 0 : remainingFeedStock} <span className="text-[10px] sm:text-xs font-sans text-slate-500 font-normal">bags</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 truncate" title={`Stocked: ${totalBagsStocked} / Used: ${totalBagsConsumed}`}>
            In: {totalBagsStocked} / Out: {totalBagsConsumed}
          </p>
        </div>

        {/* Card 4 */}
        <div id="stat-revenue" className="bg-white border border-slate-100 rounded-xl p-3.5 sm:p-4 shadow-xs overflow-hidden">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate" title="Total Sales">Total Sales</span>
            <span className="p-1 sm:p-1.5 bg-slate-50 text-slate-700 rounded-lg shrink-0">
              <DollarSign size={14} />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl xl:text-2xl font-bold font-mono text-emerald-600 truncate" title={`$${accumulatedSales.toLocaleString()}`}>
            ${accumulatedSales.toLocaleString()}
          </div>
          <p className="mt-1 text-[10px] text-slate-400 truncate">Flock sale stage</p>
        </div>

        {/* Card 5 */}
        <div id="stat-expenses" className="bg-white border border-slate-100 rounded-xl p-3.5 sm:p-4 shadow-xs overflow-hidden">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate" title="Expenses">Expenses</span>
            <span className="p-1 sm:p-1.5 bg-slate-50 text-slate-700 rounded-lg shrink-0">
              <TrendingDown size={14} />
            </span>
          </div>
          <div className="mt-2 text-lg sm:text-xl xl:text-2xl font-bold font-mono text-rose-500 truncate" title={`$${accumulatedExpenses.toLocaleString()}`}>
            ${accumulatedExpenses.toLocaleString()}
          </div>
          <p className="mt-1 text-[10px] text-slate-400 truncate">Logged cycle costs</p>
        </div>

        {/* Card 6 */}
        <div id="stat-profit" className="bg-white border border-blue-100 rounded-xl p-3.5 sm:p-4 shadow-xs overflow-hidden">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate" title="Net Profit / Loss">Net Yield</span>
            <span className="p-1 sm:p-1.5 bg-blue-50 text-blue-700 rounded-lg shrink-0">
              <TrendingUp size={14} />
            </span>
          </div>
          <div className={`mt-2 text-lg sm:text-xl xl:text-2xl font-bold font-mono truncate ${netEarnings >= 0 ? 'text-emerald-600' : 'text-amber-500'}`} title={`$${netEarnings >= 0 ? '+' : ''}${netEarnings.toLocaleString()}`}>
            ${netEarnings >= 0 ? '+' : ''}{netEarnings.toLocaleString()}
          </div>
          <p className="mt-1 text-[10px] text-slate-400 truncate">Cumulative margin</p>
        </div>
      </div>

      {/* Main Grid: Charts + AI Side Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Viewport */}
        <div className="lg:col-span-2 bg-white border border-slate-150 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="font-semibold text-slate-800 text-base">Operational Trajectory</h3>
              <p className="text-xs text-slate-400">Visual analytics of chronological daily entries</p>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg self-start">
              <button 
                id="btn-chart-mort"
                onClick={() => setSelectedChart('mortality')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selectedChart === 'mortality' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Mortality Rate
              </button>
              <button 
                id="btn-chart-fin"
                onClick={() => setSelectedChart('finance')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selectedChart === 'finance' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Cash flows
              </button>
              <button 
                id="btn-chart-fd"
                onClick={() => setSelectedChart('feed')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selectedChart === 'feed' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Feed intake
              </button>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {selectedChart === 'mortality' ? (
                <LineChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="Mortality" stroke="#ef4444" strokeWidth={2.5} activeDot={{ r: 6 }} />
                </LineChart>
              ) : selectedChart === 'finance' ? (
                <BarChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Sales ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses ($)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Line type="basis" dataKey="Net Operating ($)" stroke="#0284c7" strokeWidth={2} dot={false} />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="FCR Feed (bags)" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Senior Advisory Insights Widget */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2">
                <span className="p-1 px-1.5 bg-emerald-500/20 text-emerald-400 rounded-md">
                  <Sparkles size={16} />
                </span>
                <div>
                  <h4 className="font-semibold text-sm">YSJ Farm Executive Advisor</h4>
                  <p className="text-[10px] text-slate-400">Live operational review & recommendations</p>
                </div>
              </div>
              
              <button 
                id="btn-refresh-ai"
                onClick={fetchAiAdvice} 
                disabled={loadingAi}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition"
                title="Recalculate executive recommendations"
              >
                <RefreshCw size={14} className={loadingAi ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="text-xs leading-relaxed space-y-3 max-h-[240px] overflow-y-auto pr-1 text-slate-300">
              {loadingAi ? (
                <div className="space-y-3 pt-4">
                  <div className="h-3 bg-slate-700 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-slate-700 rounded animate-pulse w-5/6"></div>
                  <div className="h-3 bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-3 bg-slate-700 rounded animate-pulse w-2/3"></div>
                  <p className="text-[10px] text-slate-400 text-center italic mt-2">Compiling metrics & calculating cohort trends...</p>
                </div>
              ) : aiAdvice ? (
                <div className="whitespace-pre-line text-slate-200 text-[11px] font-sans antialiased">
                  {aiAdvice}
                </div>
              ) : (
                <p className="text-slate-400 text-[11px] italic">No consultant feedback compiled yet. Press sync to request Advisory view.</p>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-700/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Engine: Poultry Executive Analytics 3.5</span>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-500 text-emerald-950 font-semibold rounded-full flex items-center gap-1">
              • Verified Calculations
            </span>
          </div>
        </div>

      </div>

      {/* Flock General Status Card */}
      <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex gap-3 items-start md:items-center">
          <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
            <Clock size={20} />
          </span>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">
              {flockAgeDays > 0 ? `Flock Lifecycle Milestone: Day ${flockAgeDays} Active` : 'No Active Flock Cohort'}
            </h4>
            <p className="text-xs text-slate-500">
              {flockAgeDays > 0 
                ? `The active Broiler batch loaded on ${batchStartDateStr} has finalized ${Math.floor(flockAgeDays / 7)} operational weeks and ${flockAgeDays % 7} days in the broiler house.`
                 : 'Deploy your first Broiler batch by logging a daily operations sheet to initiate live dynamic biometrics tracking.'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 text-xs">
          <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-md">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Feed Program</span>
            <span className="font-medium text-slate-800">{feedProgram}</span>
          </div>
          <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-md">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Cycle Status</span>
            <span className={`font-medium ${cycleStatus === 'PENDING BATCH' ? 'text-amber-500' : 'text-emerald-600'} font-semibold`}>{cycleStatus}</span>
          </div>
        </div>
      </div>

      {/* Feed Stocking Logs */}
      <div className="bg-white border border-slate-150 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">Feed Stock Replenishment Orders</h4>
            <p className="text-[11px] text-slate-500">Chronological history of feed deliveries stocked at the performance center</p>
          </div>
          {feedStocks.length > 0 && (
            <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg font-mono">
              {feedStocks.length} deliveries logged
            </span>
          )}
        </div>

        {feedStocks.length === 0 ? (
          <p className="text-slate-400 text-xs italic py-2 text-center">No feed restocking runs logged. Restock feed inventory to view recent invoices.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5">Date Stocked</th>
                  <th className="py-2.5">Feed Type</th>
                  <th className="py-2.5 text-right">Bags</th>
                  <th className="py-2.5 text-right">Cost / Bag</th>
                  <th className="py-2.5 text-right font-medium text-slate-800">Total Purchase</th>
                  <th className="py-2.5 pl-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...feedStocks].sort((a, b) => b.date_stocked.localeCompare(a.date_stocked)).map((fs) => (
                  <tr key={fs.id} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="py-3 font-mono text-slate-600">{fs.date_stocked}</td>
                    <td className="py-3 font-medium text-slate-800">
                      <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded text-[10px] mr-1">🌾</span>
                      {fs.feed_type}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-700">{fs.bags} bags</td>
                    <td className="py-3 text-right font-mono text-slate-500">${fs.cost_per_bag.toFixed(2)}</td>
                    <td className="py-3 text-right font-mono font-bold text-emerald-600">${(fs.bags * fs.cost_per_bag).toLocaleString()}</td>
                    <td className="py-3 pl-4 text-slate-400 italic max-w-xs truncate" title={fs.notes}>{fs.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showStockModal && renderStockModal()}
      {showFeedModal && renderFeedModal()}
    </div>
  );
}

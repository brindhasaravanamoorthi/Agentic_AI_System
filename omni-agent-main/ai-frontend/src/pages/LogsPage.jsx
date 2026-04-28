import { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Info,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Package,
  ShoppingCart,
  FileDown,
  TrendingUp,
  Lightbulb,
  BarChart3,
  DollarSign,
  Calendar,
  Clock,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { getSimulationStatus, getSimulationAnalytics, spikeSales, lowInventory } from '../lib/api';

const SEVERITY_COLORS = { error: 'bg-red-500/20 text-red-400 border-red-500/40', warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', info: 'bg-[#3b82f6]/20 text-blue-400 border-[#3b82f6]/40' };
const INVENTORY_COLORS = ['#dc2626', '#ca8a04', '#22c55e'];
const SEVERITY_CHART_COLORS = { error: '#dc2626', warning: '#ca8a04', info: '#3b82f6' };

const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

export default function LogsPage() {
  const [status, setStatus] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const dashboardRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [statusRes, analyticsRes] = await Promise.all([
        getSimulationStatus(),
        getSimulationAnalytics().catch(() => ({ data: { data: null } })),
      ]);
      setStatus(statusRes.data.data);
      setAnalytics(analyticsRes.data?.data ?? null);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSpikeSales = async () => {
    try {
      const res = await spikeSales({ multiplier: 2 + Math.floor(Math.random() * 3), durationHours: 1 + Math.floor(Math.random() * 3) });
      const data = res.data?.data;
      const msg = data ? `${data.sku}: ${data.unitsSold} units sold (${data.previousStock} → ${data.newStock})` : 'Sales spike simulated!';
      alert(msg);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to simulate');
    }
  };

  const handleLowInventory = async () => {
    try {
      const targetQty = Math.floor(Math.random() * 5) + 1;
      const res = await lowInventory({ targetQuantity: targetQty });
      const data = res.data?.data;
      const msg = data ? `${data.sku}: stock set to ${data.newStock} (was ${data.previousStock})` : 'Low inventory simulated!';
      alert(msg);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Failed to simulate');
    }
  };

  const exportToPdf = async () => {
    if (!dashboardRef.current) return;
    setExportingPdf(true);
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      if (pdfHeight > pdf.internal.pageSize.getHeight()) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -(pdf.internal.pageSize.getHeight()), pdfWidth, pdfHeight);
      }
      pdf.save(`Business-Analytics-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const getSeverityClass = (severity) => {
    return SEVERITY_COLORS[severity?.toLowerCase()] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getAgentClass = (agentId) => {
    const map = {
      warden: 'bg-purple-500/30 text-purple-300',
      finance: 'bg-emerald-500/30 text-emerald-300',
      architect: 'bg-orange-500/30 text-orange-300',
      support: 'bg-[#3b82f6]/30 text-blue-300',
      executive: 'bg-slate-600 text-white',
    };
    return map[agentId] || 'bg-slate-600/50 text-slate-300';
  };

  // Business insights derived from data
  const insights = (() => {
    const list = [];
    const crit = status?.summary?.criticalAlerts ?? 0;
    const lowStock = status?.summary?.lowStockCount ?? 0;
    const abandoned = status?.summary?.abandonedCartsCount ?? 0;
    const abandonedVal = analytics?.totalAbandonedValue ?? 0;

    if (crit > 0) list.push({ type: 'critical', text: `${crit} product(s) at critical stock (≤5 units). Immediate restock recommended.` });
    if (lowStock > 0 && crit === 0) list.push({ type: 'warning', text: `${lowStock} product(s) below reorder threshold. Plan restocking within 48 hours.` });
    if (lowStock === 0 && crit === 0) list.push({ type: 'success', text: 'All inventory levels are healthy. No restock actions needed.' });
    if (abandoned > 0) list.push({ type: 'warning', text: `${abandoned} abandoned cart(s) worth ${formatCurrency(abandonedVal)}. Consider recovery email campaigns.` });
    if (abandoned === 0) list.push({ type: 'info', text: 'No abandoned carts in the last 24 hours.' });
    if (analytics?.orderStats && analytics.orderStats.totalOrders > 0) list.push({ type: 'info', text: `Last 7 days: ${analytics.orderStats.totalOrders} orders, ${formatCurrency(analytics.orderStats.totalRevenue)} revenue.` });
    return list;
  })();

  const inventoryPieData = analytics
    ? [
      { name: 'Critical (≤5)', value: analytics.inventoryByStatus.critical, color: INVENTORY_COLORS[0] },
      { name: 'Low Stock', value: analytics.inventoryByStatus.low, color: INVENTORY_COLORS[1] },
      { name: 'Healthy', value: analytics.inventoryByStatus.healthy, color: INVENTORY_COLORS[2] },
    ].filter((d) => d.value > 0)
    : [];

  const severityPieData = analytics?.activityBySeverity
    ? analytics.activityBySeverity
      .filter((d) => d.count > 0)
      .map((d) => ({ name: d.severity, value: d.count, color: SEVERITY_CHART_COLORS[d.severity?.toLowerCase()] ?? '#64748b' }))
    : [];

  const getInsightClass = (type) => {
    switch (type) {
      case 'critical': return 'bg-red-500/20 border-red-500/40 text-red-300';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300';
      case 'success': return 'bg-green-500/20 border-green-500/40 text-green-300';
      case 'info': return 'bg-[#3b82f6]/20 border-[#3b82f6]/40 text-blue-300';
      default: return 'bg-slate-800/50 border-slate-600/50 text-slate-300';
    }
  };

  const reportPeriod = 'Last 7 Days';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-[#0a0e1a]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-700 border-t-[#3b82f6] rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-400">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl bg-[#0a0e1a] min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-slate-400" />
            Financial Dashboard
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {reportPeriod}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToPdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            {exportingPdf ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div ref={dashboardRef} className="space-y-6 p-6 -m-6 rounded min-h-screen bg-slate-900/30 border border-slate-800">
        {/* Key Performance Indicators */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Key Performance Indicators</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-800/80 p-4 rounded border border-slate-700/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Revenue</span>
                <DollarSign className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(analytics?.orderStats?.totalRevenue)}</p>
              <p className="text-xs text-slate-500 mt-0.5">{reportPeriod}</p>
            </div>
            <div className="bg-slate-800/80 p-4 rounded border border-slate-700/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Orders</span>
              </div>
              <p className="text-xl font-bold text-white tabular-nums">{analytics?.orderStats?.totalOrders ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">{reportPeriod}</p>
            </div>
            <div className="bg-slate-800/80 p-4 rounded border border-slate-700/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Order Value</span>
              </div>
              <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(analytics?.orderStats?.avgOrderValue)}</p>
              <p className="text-xs text-slate-500 mt-0.5">AOV</p>
            </div>
            <div className="bg-slate-800/80 p-4 rounded border border-slate-700/80 border-l-2 border-l-red-500">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Critical Alerts</span>
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-xl font-bold text-white tabular-nums">{status?.summary?.criticalAlerts ?? 0}</p>
              <p className="text-xs text-red-400 mt-0.5">Requires action</p>
            </div>
            <div className="bg-slate-800/80 p-4 rounded border border-slate-700/80 border-l-2 border-l-amber-500">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Low Stock</span>
                <Package className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl font-bold text-white tabular-nums">{status?.summary?.lowStockCount ?? 0}</p>
              <p className="text-xs text-amber-400 mt-0.5">Below threshold</p>
            </div>
            <div className="bg-slate-800/80 p-4 rounded border border-slate-700/80 border-l-2 border-l-blue-500">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Abandoned Value</span>
                <ShoppingCart className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(analytics?.totalAbandonedValue)}</p>
              <p className="text-xs text-blue-400 mt-0.5">{status?.summary?.abandonedCartsCount ?? 0} carts</p>
            </div>
          </div>
        </section>

        {/* Business Insights */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Executive Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, i) => (
              <div key={i} className={`p-4 rounded border font-medium text-sm ${getInsightClass(insight.type)}`}>
                {insight.text}
              </div>
            ))}
          </div>
        </section>

        {/* Charts */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Performance Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {analytics?.activityByDay && analytics.activityByDay.length > 0 && (
              <div className="bg-slate-800/80 p-4 rounded border border-slate-700/80 lg:col-span-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  Activity Over Time
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.activityByDay}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#64748b" />
                      <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid #334155', backgroundColor: '#0d1324', fontSize: 12 }} />
                      <Area type="monotone" dataKey="count" stroke="#2563eb" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {analytics?.activityByAgent && analytics.activityByAgent.length > 0 && (
              <div className="bg-slate-800/80 p-4 rounded border border-slate-700/80">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  Activity by Agent
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.activityByAgent} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#64748b" />
                      <YAxis type="category" dataKey="agent" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#64748b" width={55} />
                      <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid #334155', backgroundColor: '#0d1324', fontSize: 12 }} />
                      <Bar dataKey="count" fill="#475569" radius={[0, 2, 2, 0]} name="Events" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {inventoryPieData.length > 0 && (
              <div className="bg-slate-800/80 p-4 rounded border border-slate-700/80">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <PieChartIcon className="w-4 h-4 text-slate-400" />
                  Inventory Status
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={inventoryPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {inventoryPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [v ?? 0, 'Items']} contentStyle={{ borderRadius: 4, border: '1px solid #334155', backgroundColor: '#0d1324', fontSize: 12 }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {severityPieData.length > 0 && (
              <div className="bg-slate-800/80 p-4 rounded border border-slate-700/80">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <Activity className="w-4 h-4 text-slate-400" />
                  Events by Severity
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={severityPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {severityPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [v ?? 0, 'Events']} contentStyle={{ borderRadius: 4, border: '1px solid #334155', backgroundColor: '#0d1324', fontSize: 12 }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Data Tables */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Operational Data</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Table */}
            <div className="bg-slate-800/80 rounded border border-slate-700/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/80">
                <h3 className="text-sm font-semibold text-white">Low Stock Items</h3>
                <p className="text-xs text-slate-500 mt-0.5">Products below reorder threshold</p>
              </div>
              <div className="overflow-x-auto">
                {status?.lowStockItems?.length === 0 ? (
                  <div className="p-8 text-center border border-green-500/30 bg-green-500/10 rounded m-4">
                    <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                    <p className="text-green-300 font-medium text-sm">All items well stocked</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/80">
                        <th className="text-left py-3 px-4 font-medium text-slate-500">Product</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">SKU</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">Stock</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">Threshold</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">Deficit</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status?.lowStockItems?.map((item, i) => (
                        <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-4 font-medium text-white">{item.productName}</td>
                          <td className="py-3 px-4 text-slate-400">{item.sku}</td>
                          <td className="py-3 px-4 text-right tabular-nums font-medium">{item.currentStock}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-400">{item.threshold}</td>
                          <td className="py-3 px-4 text-right tabular-nums font-medium text-red-400">{item.deficit}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.currentStock <= 5 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {item.currentStock <= 5 ? 'Critical' : 'Low'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Abandoned Carts Table */}
            <div className="bg-slate-800/80 rounded border border-slate-700/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/80">
                <h3 className="text-sm font-semibold text-white">Abandoned Carts</h3>
                <p className="text-xs text-slate-500 mt-0.5">Last 24 hours</p>
              </div>
              <div className="overflow-x-auto">
                {status?.abandonedCarts?.length === 0 ? (
                  <div className="p-8 text-center border border-slate-600 rounded m-4">
                    <ShoppingCart className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No abandoned carts</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/80">
                        <th className="text-left py-3 px-4 font-medium text-slate-500">Customer</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">Email</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">Items</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">Value</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">Abandoned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status?.abandonedCarts?.map((cart, i) => (
                        <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-4 font-medium text-white">{cart.customer?.name ?? '—'}</td>
                          <td className="py-3 px-4 text-slate-400 text-xs">{cart.customer?.email ?? '—'}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-300">{cart.itemCount}</td>
                          <td className="py-3 px-4 text-right tabular-nums font-medium text-white">{formatCurrency(cart.totalValue)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-500">{cart.hoursAbandoned}h ago</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Recent Activity Log</h2>
          <div className="bg-slate-800/80 rounded border border-slate-700/80 overflow-hidden">
            <div className="overflow-x-auto">
              {status?.recentActivity?.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Info className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/80">
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Agent</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Severity</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Message</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Event Type</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status?.recentActivity?.map((log, i) => (
                      <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getAgentClass(log.agentId)}`}>
                            {log.agentId}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityClass(log.severity)}`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{log.message}</td>
                        <td className="py-3 px-4 text-slate-500 text-xs">{log.eventType}</td>
                        <td className="py-3 px-4 text-right text-slate-500 text-xs tabular-nums">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        {/* Simulation Controls */}
        <section className="bg-slate-800/50 rounded border border-slate-700/80 p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-white">Simulation Controls</h2>
            <p className="text-xs text-slate-500 mt-0.5">Test agent reactions by manipulating data</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleSpikeSales}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 p-4 rounded text-left transition-colors group"
            >
              <h3 className="font-semibold text-white text-sm mb-1">Spike Sales</h3>
              <p className="text-slate-400 text-xs">Simulate sales velocity increase for a random product</p>
            </button>
            <button
              onClick={handleLowInventory}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 p-4 rounded text-left transition-colors group"
            >
              <h3 className="font-semibold text-white text-sm mb-1">Low Inventory</h3>
              <p className="text-slate-400 text-xs">Force low stock (1–5 units) for a random product</p>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

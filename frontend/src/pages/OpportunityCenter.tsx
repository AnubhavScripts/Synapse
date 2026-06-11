import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserCheck, UserX, IndianRupee, ShoppingCart, Megaphone, TrendingUp } from 'lucide-react';
import {
  getAnalyticsOverview, getOpportunities, refreshOpportunities,
  investigateOpportunity, dismissOpportunity,
} from '../api/client';
import { LoadingButton } from '../components/ui/LoadingButton';
import type { AnalyticsOverview, Opportunity } from '../types';

const revenueData = [
  { month: 'Jul', revenue: 420000 }, { month: 'Aug', revenue: 380000 }, { month: 'Sep', revenue: 510000 },
  { month: 'Oct', revenue: 470000 }, { month: 'Nov', revenue: 620000 }, { month: 'Dec', revenue: 780000 },
  { month: 'Jan', revenue: 540000 }, { month: 'Feb', revenue: 490000 }, { month: 'Mar', revenue: 610000 },
  { month: 'Apr', revenue: 580000 }, { month: 'May', revenue: 650000 }, { month: 'Jun', revenue: 720000 },
];

const customerGrowth = [
  { month: 'Jul', customers: 2100 }, { month: 'Aug', customers: 2250 }, { month: 'Sep', customers: 2400 },
  { month: 'Oct', customers: 2580 }, { month: 'Nov', customers: 2750 }, { month: 'Dec', customers: 2900 },
  { month: 'Jan', customers: 3050 }, { month: 'Feb', customers: 3180 }, { month: 'Mar', customers: 3320 },
  { month: 'Apr', customers: 3450 }, { month: 'May', customers: 3600 }, { month: 'Jun', customers: 3780 },
];

const OPP_TYPE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  dormant_recovery: { icon: '⚠️', label: 'Dormancy Risk', color: '#f59e0b' },
  churn_prevention: { icon: '🔴', label: 'Churn Signal', color: '#ef4444' },
  cross_sell: { icon: '🔀', label: 'Cross-Sell Gap', color: '#8b5cf6' },
  emerging_vip: { icon: '⭐', label: 'Emerging VIP', color: '#10b981' },
  loyalty: { icon: '👑', label: 'VIP Unrewarded', color: '#3b82f6' },
  upsell: { icon: '📈', label: 'Upsell Window', color: '#06b6d4' },
};

function priorityColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f59e0b';
  return '#10b981';
}

function formatRevenue(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

export default function OpportunityCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [investigatingId, setInvestigatingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: overview, isLoading: loadingOverview } = useQuery<AnalyticsOverview>({
    queryKey: ['overview'], queryFn: getAnalyticsOverview,
  });

  const { data: opportunities, isLoading: loadingOpps } = useQuery<Opportunity[]>({
    queryKey: ['opportunities'], queryFn: getOpportunities,
  });

  useEffect(() => { document.title = 'ReachIQ — Opportunity Center'; }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const fresh = await refreshOpportunities();
      queryClient.setQueryData(['opportunities'], fresh);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleInvestigate(opp: Opportunity) {
    setInvestigatingId(opp.id);
    try {
      await investigateOpportunity(opp.id);
      // Navigate to AI Strategist with pre-loaded context
      navigate(`/strategist?opp=${opp.id}&goal=${encodeURIComponent(opp.recommended_action)}`);
    } catch {
      navigate(`/strategist?goal=${encodeURIComponent(opp.recommended_action)}`);
    } finally {
      setInvestigatingId(null);
    }
  }

  async function handleDismiss(id: string) {
    setDismissingId(id);
    try {
      await dismissOpportunity(id);
      queryClient.setQueryData(['opportunities'], (old: Opportunity[] | undefined) =>
        (old || []).filter(o => o.id !== id)
      );
    } finally {
      setDismissingId(null);
    }
  }

  const metrics = overview ? [
    { label: 'Total Customers', value: overview.total_customers.toLocaleString(), icon: Users, color: 'primary', trend: '+12%', up: true },
    { label: 'Active Customers', value: overview.active_customers.toLocaleString(), icon: UserCheck, color: 'success', trend: '+8%', up: true },
    { label: 'Dormant Customers', value: overview.dormant_customers.toLocaleString(), icon: UserX, color: 'warning', trend: '-3%', up: false },
    { label: 'Total Revenue', value: formatRevenue(overview.total_revenue), icon: IndianRupee, color: 'success', trend: '+15%', up: true },
    { label: 'Orders This Month', value: overview.orders_this_month.toLocaleString(), icon: ShoppingCart, color: 'info', trend: '+5%', up: true },
    { label: 'Active Campaigns', value: overview.active_campaigns.toString(), icon: Megaphone, color: 'primary', trend: '', up: true },
    { label: 'Avg Customer LTV', value: formatRevenue(overview.avg_customer_ltv), icon: TrendingUp, color: 'success', trend: '+7%', up: true },
  ] : [];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Opportunity Center</h1>
          <p>AI-discovered growth opportunities and business overview</p>
        </div>
        <LoadingButton
          loading={refreshing}
          onClick={handleRefresh}
          variant="secondary"
          size="sm"
        >
          🔄 Refresh Scan
        </LoadingButton>
      </div>

      {/* ── Business Overview Metrics ─────────────────────────────── */}
      <section className="section">
        <h2 className="section-title"><TrendingUp size={20} /> Business Overview</h2>
        {loadingOverview ? (
          <div className="grid-7">
            {[1,2,3,4,5,6,7].map(i => <div key={i} className="metric-card skeleton" style={{ height: 90 }} />)}
          </div>
        ) : (
          <div className="grid-7">
            {metrics.map((m, i) => (
              <motion.div key={m.label} className="metric-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="metric-card-header">
                  <div className={`metric-card-icon ${m.color}`}><m.icon size={18} /></div>
                  {m.trend && <span className={`metric-card-trend ${m.up ? 'up' : 'down'}`}>{m.trend}</span>}
                </div>
                <div className="metric-card-value">{m.value}</div>
                <div className="metric-card-label">{m.label}</div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── Charts ────────────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Revenue & Customer Health</h2>
        <div className="grid-2">
          <div className="chart-container">
            <h3>Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₹${v/1000}K`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-container">
            <h3>Customer Growth</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={customerGrowth}>
                <defs>
                  <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'Customers']} />
                <Area type="monotone" dataKey="customers" stroke="#10b981" fill="url(#custGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── AI Opportunity Feed ────────────────────────────────────── */}
      <section className="section">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <h2 className="section-title" style={{ margin: 0 }}>⚡ Discovered Opportunities</h2>
          {!loadingOpps && opportunities && opportunities.length > 0 && (
            <span style={{
              background: 'var(--color-primary-500)', color: '#fff',
              borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700,
            }}>{opportunities.length}</span>
          )}
        </div>

        {loadingOpps ? (
          <div className="opp-card-grid">
            {[1,2,3].map(i => <div key={i} className="opp-skeleton-card skeleton" />)}
          </div>
        ) : !opportunities || opportunities.length === 0 ? (
          <div className="empty-state">
            <p>No active opportunities found. Click Refresh Scan to re-analyse your customer base.</p>
          </div>
        ) : (
          <div className="opp-card-grid">
            {opportunities.map(opp => {
              const meta = OPP_TYPE_LABELS[opp.opportunity_type] || { icon: '💡', label: opp.opportunity_type, color: '#6366f1' };
              const isInvestigating = investigatingId === opp.id;
              const isDismissing = dismissingId === opp.id;
              return (
                <div key={opp.id} className="opp-card" style={{ borderLeftColor: meta.color }}>
                  <div className="opp-card__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 18 }}>{meta.icon}</span>
                      <div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: meta.color,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>{meta.label}</div>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{opp.title}</h3>
                      </div>
                    </div>
                    <div className="priority-ring" style={{ '--ring-color': priorityColor(opp.priority_score ?? 50) } as React.CSSProperties}>
                      <span>{opp.priority_score ?? 50}</span>
                    </div>
                  </div>

                  <div className="opp-card__metrics">
                    <div className="opp-metric">
                      <span className="opp-metric__label">Revenue at stake</span>
                      <span className="opp-metric__value" style={{ color: '#ef4444' }}>
                        {opp.potential_revenue > 0 ? formatRevenue(opp.potential_revenue) : '—'}
                      </span>
                    </div>
                    <div className="opp-metric">
                      <span className="opp-metric__label">Customers affected</span>
                      <span className="opp-metric__value">{opp.affected_customers.toLocaleString()}</span>
                    </div>
                  </div>

                  {opp.key_drivers && opp.key_drivers.length > 0 && (
                    <div className="opp-card__drivers">
                      <div className="opp-card__drivers-title">Why this exists</div>
                      <ul className="key-driver-list">
                        {opp.key_drivers.slice(0, 3).map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="opp-card__actions">
                    <LoadingButton
                      onClick={() => handleInvestigate(opp)}
                      loading={isInvestigating}
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: 13 }}
                    >
                      🔍 Investigate Opportunity
                    </LoadingButton>
                    <LoadingButton
                      onClick={() => handleDismiss(opp.id)}
                      loading={isDismissing}
                      className="btn btn-secondary"
                      style={{ fontSize: 13 }}
                    >
                      Dismiss
                    </LoadingButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

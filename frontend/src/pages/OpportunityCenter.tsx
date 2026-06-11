import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserCheck, UserX, IndianRupee, ShoppingCart, Megaphone, TrendingUp, Sparkles, Send } from 'lucide-react';
import { getAnalyticsOverview, getOpportunities } from '../api/client';
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

const suggestions = [
  "Bring back dormant customers",
  "Increase repeat purchases",
  "Promote our new collection",
  "Reward VIP customers",
];

function formatCurrency(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

export default function OpportunityCenter() {
  const navigate = useNavigate();
  const [goalText, setGoalText] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [goalLoading, setGoalLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const { data: overview } = useQuery<AnalyticsOverview>({ queryKey: ['overview'], queryFn: getAnalyticsOverview });
  const { data: opportunities } = useQuery<Opportunity[]>({ queryKey: ['opportunities'], queryFn: getOpportunities });

  useEffect(() => { document.title = 'ReachIQ — Opportunity Center'; }, []);

  useEffect(() => {
    const interval = setInterval(() => setPlaceholderIdx(i => (i + 1) % suggestions.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGoalSubmit = () => {
    if (!goalText.trim()) return;
    setGoalLoading(true);
    // Navigate triggers re-render; brief visual feedback before unmount
    setTimeout(() => {
      navigate(`/strategist?goal=${encodeURIComponent(goalText)}`);
    }, 300);
  };

  async function handleGenerateStrategy(opp: Opportunity) {
    setGeneratingId(opp.id);
    await new Promise(r => setTimeout(r, 200)); // micro-delay for feedback
    navigate(`/strategist?goal=${encodeURIComponent(opp.recommended_action)}`);
  }

  async function handleDismiss(id: string) {
    setDismissingId(id);
    await dismissOpportunity(id);
    setDismissingId(null);
  }

  const metrics = overview ? [
    { label: 'Total Customers', value: overview.total_customers.toLocaleString(), icon: Users, color: 'primary', trend: '+12%', up: true },
    { label: 'Active Customers', value: overview.active_customers.toLocaleString(), icon: UserCheck, color: 'success', trend: '+8%', up: true },
    { label: 'Dormant Customers', value: overview.dormant_customers.toLocaleString(), icon: UserX, color: 'warning', trend: '-3%', up: false },
    { label: 'Total Revenue', value: formatCurrency(overview.total_revenue), icon: IndianRupee, color: 'success', trend: '+15%', up: true },
    { label: 'Orders This Month', value: overview.orders_this_month.toLocaleString(), icon: ShoppingCart, color: 'info', trend: '+5%', up: true },
    { label: 'Active Campaigns', value: overview.active_campaigns.toString(), icon: Megaphone, color: 'primary', trend: '', up: true },
    { label: 'Avg Customer LTV', value: formatCurrency(overview.avg_customer_ltv), icon: TrendingUp, color: 'success', trend: '+7%', up: true },
  ] : [];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Opportunity Center</h1>
        <p>AI-discovered growth opportunities for your business</p>
      </div>

      {/* Quick Goal Input */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="goal-input-container" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="goal-input-label">What's your business goal today?</div>
          <div className="goal-input-sublabel">Describe what you want to achieve and AI will create the strategy</div>
          <div className="goal-input-wrapper">
            <input
              className="goal-input"
              type="text"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder={suggestions[placeholderIdx]}
              onKeyDown={(e) => e.key === 'Enter' && handleGoalSubmit()}
              id="goal-input"
            />
            <LoadingButton
              loading={goalLoading}
              loadingText="Thinking..."
              icon={<Send size={18} />}
              onClick={handleGoalSubmit}
              id="goal-submit-btn"
              style={{ padding: 'var(--space-4) var(--space-6)', borderRadius: 'var(--radius-lg)', background: 'white', color: 'var(--color-primary-700)', fontWeight: 700, fontSize: 'var(--text-md)', whiteSpace: 'nowrap' }}
            >
              Strategize
            </LoadingButton>
          </div>
          <div className="goal-suggestions">
            {suggestions.map((s) => (
              <button key={s} className="goal-suggestion" onClick={() => { setGoalText(s); navigate(`/strategist?goal=${encodeURIComponent(s)}`); }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Business Overview Metrics */}
      <section className="section">
        <h2 className="section-title"><TrendingUp size={20} /> Business Overview</h2>
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
      </section>

      {/* Revenue & Customer Health Charts */}
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

      {/* AI Opportunity Feed */}
      <section className="section">
        <h2 className="section-title"><Sparkles size={20} /> AI Opportunity Feed</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {opportunities?.map((opp, i) => (
            <motion.div key={opp.id} className="ai-insight-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="ai-insight-header">
                <div className="ai-insight-icon"><Sparkles size={16} /></div>
                <div>
                  <div className="ai-insight-title">{opp.title}</div>
                  <div className="ai-insight-body">{opp.description}</div>
                  <div className="ai-insight-meta">
                    <span className={`badge badge-${opp.priority === 'high' ? 'error' : opp.priority === 'medium' ? 'warning' : 'info'}`}>
                      {opp.priority} priority
                    </span>
                    {opp.potential_revenue > 0 && (
                      <span>Revenue opportunity: {formatCurrency(opp.potential_revenue)}</span>
                    )}
                    <span>{opp.affected_customers} customers affected</span>
                  </div>
                </div>
              </div>
              <div className="ai-insight-actions">
                <LoadingButton
                  size="sm"
                  loading={generatingId === opp.id}
                  loadingText="Preparing..."
                  icon={<Sparkles size={14} />}
                  onClick={() => handleGenerateStrategy(opp)}
                >
                  Generate Strategy
                </LoadingButton>
                <LoadingButton
                  size="sm"
                  variant="secondary"
                  loading={dismissingId === opp.id}
                  loadingText="Dismissing"
                  onClick={() => handleDismiss(opp.id)}
                >
                  Dismiss
                </LoadingButton>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

async function dismissOpportunity(_id: string) {
  // TODO: call API — adding a brief optimistic delay for UX feedback
  await new Promise(r => setTimeout(r, 400));
}

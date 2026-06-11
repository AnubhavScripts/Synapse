import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, TrendingUp, IndianRupee, Target, Eye, ShoppingCart } from 'lucide-react';
import { getAnalyticsOverview, getChannelPerformance, getAudiencePerformance } from '../api/client';
import type { AnalyticsOverview, ChannelPerformance } from '../types';

function formatCurrency(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

const channelColors: Record<string, string> = {
  whatsapp: '#25d366', sms: '#3b82f6', email: '#8b5cf6', rcs: '#f59e0b',
};

export default function AnalyticsPage() {
  const { data: overview } = useQuery<AnalyticsOverview>({ queryKey: ['analytics-overview'], queryFn: getAnalyticsOverview });
  const { data: channels } = useQuery<ChannelPerformance[]>({ queryKey: ['channel-perf'], queryFn: getChannelPerformance });
  const { data: audiences } = useQuery({ queryKey: ['audience-perf'], queryFn: getAudiencePerformance });

  useEffect(() => { document.title = 'ReachIQ — Analytics'; }, []);

  const execMetrics = overview ? [
    { label: 'Revenue Influenced', value: formatCurrency(overview.revenue_influenced), icon: IndianRupee, color: 'success' },
    { label: 'Campaign ROI', value: `${overview.campaign_roi}%`, icon: TrendingUp, color: 'primary' },
    { label: 'Conversion Rate', value: `${overview.conversion_rate}%`, icon: Target, color: 'warning' },
    { label: 'Read Rate', value: `${overview.read_rate}%`, icon: Eye, color: 'info' },
    { label: 'Retention Rate', value: `${overview.retention_rate}%`, icon: ShoppingCart, color: 'success' },
  ] : [];

  const channelRevData = channels?.map(ch => ({
    channel: ch.channel.charAt(0).toUpperCase() + ch.channel.slice(1),
    revenue: ch.revenue,
    campaigns: ch.campaigns_count,
    fill: channelColors[ch.channel] || '#6366f1',
  })) || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Decision-making intelligence, not just reporting</p>
      </div>

      {/* Executive Metrics */}
      <section className="section">
        <h2 className="section-title"><BarChart3 size={20} /> Executive Metrics</h2>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {execMetrics.map((m, i) => (
            <motion.div key={m.label} className="metric-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="metric-card-header">
                <div className={`metric-card-icon ${m.color}`}><m.icon size={18} /></div>
              </div>
              <div className="metric-card-value">{m.value}</div>
              <div className="metric-card-label">{m.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Channel Performance */}
      <section className="section">
        <h2 className="section-title">Channel Performance</h2>
        <div className="grid-2">
          <div className="chart-container">
            <h3>Channel Metrics Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channels?.map(ch => ({
                channel: ch.channel.charAt(0).toUpperCase() + ch.channel.slice(1),
                'Delivery': ch.delivery_rate,
                'Read': ch.read_rate,
                'Click': ch.click_rate,
                'Conversion': ch.conversion_rate,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Delivery" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Read" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Click" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Conversion" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-container">
            <h3>Revenue by Channel</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelRevData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 12 }} />
                <YAxis dataKey="channel" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {channelRevData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Audience Performance */}
      {audiences && (
        <section className="section">
          <h2 className="section-title">Audience Performance</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>Customers</th>
                  <th>Revenue</th>
                  <th>Engagement</th>
                  <th>Growth</th>
                </tr>
              </thead>
              <tbody>
                {(audiences as { name: string; customer_count: number; revenue: number; engagement_rate: number; growth_trend: number }[]).map(a => (
                  <tr key={a.name}>
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td>{a.customer_count.toLocaleString()}</td>
                    <td>{formatCurrency(a.revenue)}</td>
                    <td>
                      <div className="engagement-score">
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{a.engagement_rate.toFixed(0)}%</span>
                        <div className="engagement-bar">
                          <div className={`engagement-bar-fill ${a.engagement_rate >= 70 ? 'high' : a.engagement_rate >= 40 ? 'medium' : 'low'}`}
                            style={{ width: `${Math.min(a.engagement_rate, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: a.growth_trend >= 0 ? 'var(--color-success-600)' : 'var(--color-error-600)', fontWeight: 600 }}>
                        {a.growth_trend >= 0 ? '+' : ''}{a.growth_trend.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

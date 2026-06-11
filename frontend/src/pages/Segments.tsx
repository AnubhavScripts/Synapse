import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, IndianRupee, TrendingUp, Sparkles, Search, Send, X } from 'lucide-react';
import { getSegments, buildSegment } from '../api/client';
import type { Segment } from '../types';

// ── Type descriptions (why each prebuilt segment exists) ─────────────────

const SEGMENT_DESCRIPTIONS: Record<string, {
  why: string;
  criteria: string[];
  color: string;
  icon: string;
}> = {
  'Frequent Buyers': {
    icon: '🔁',
    color: '#10b981',
    why: 'Customers with the highest purchase frequency and strong engagement. These are your most reliable revenue drivers who buy consistently across all categories.',
    criteria: ['Order count ≥ 4 in last 90 days', 'Engagement score ≥ 70', 'Risk level: loyal or stable', 'Average order value above median'],
  },
  'High Value': {
    icon: '💎',
    color: '#6366f1',
    why: 'Customers with the highest lifetime value and total spend. Even with fewer transactions, their per-order value is significantly above average, making them your most profitable segment.',
    criteria: ['Lifetime value ≥ 90th percentile', 'Average order value ≥ ₹3,000', 'Total spend ≥ ₹15,000', 'Risk level: loyal or stable'],
  },
  'New Customers': {
    icon: '🌱',
    color: '#f59e0b',
    why: 'Customers who joined in the last 30 days. This segment is critical for habit formation — early engagement campaigns within this window have the highest long-term retention impact.',
    criteria: ['Account created ≤ 30 days ago', 'Order count: 1–2', 'Engagement score: any', 'Risk level: new'],
  },
  'VIP Customers': {
    icon: '👑',
    color: '#8b5cf6',
    why: 'Your top-tier customers by both value and engagement. These customers have demonstrated exceptional brand loyalty and respond best to exclusivity signals, early access, and personalized rewards.',
    criteria: ['Lifetime value ≥ 95th percentile', 'Engagement score ≥ 80', 'Order count ≥ 5', 'Risk level: loyal'],
  },
  'At Risk Customers': {
    icon: '⚠️',
    color: '#ef4444',
    why: 'Customers who were previously active but show declining engagement. Their purchase intervals are lengthening and engagement scores are dropping — indicating a 45–60 day churn window.',
    criteria: ['Last purchase: 30–60 days ago', 'Engagement score declining (was ≥ 50)', 'Risk level: at_risk', 'Channel affinity: any'],
  },
  'Dormant Customers': {
    icon: '😴',
    color: '#dc2626',
    why: 'Customers who have not purchased in 75+ days. Their normal purchase cycle is ~18 days, making this gap a strong signal of disengagement. Win-back campaigns within 90 days have the highest recovery rate.',
    criteria: ['Last purchase ≥ 75 days ago', 'Previously had ≥ 2 orders', 'Risk level: dormant', 'Engagement score: low'],
  },
  'Discount Driven': {
    icon: '🏷️',
    color: '#06b6d4',
    why: 'Customers whose purchasing behavior is strongly correlated with promotions. Over 60% of their historical transactions were triggered by a discount or promotional event.',
    criteria: ['Discount affinity: high', '≥ 60% purchases triggered by promotions', 'Price sensitivity: high', 'Category: any'],
  },
};

function formatCurrency(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

export default function SegmentsPage() {
  const [query, setQuery] = useState('');
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<{ customers_matched: number; revenue_opportunity: number; reasoning: string } | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  const { data: segments, isLoading, refetch } = useQuery<Segment[]>({
    queryKey: ['segments'], queryFn: getSegments,
  });

  useEffect(() => { document.title = 'ReachIQ — Segments'; }, []);

  async function handleBuild() {
    if (!query.trim()) return;
    setBuilding(true);
    setBuildResult(null);
    try {
      const result = await buildSegment(query);
      setBuildResult(result);
      refetch();
    } catch (e) { console.error(e); }
    finally { setBuilding(false); }
  }

  const prebuilt = segments?.filter(s => s.segment_type === 'prebuilt') || [];
  const aiGenerated = segments?.filter(s => s.segment_type === 'ai_generated') || [];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Segments</h1>
        <p>Audience discovery and management powered by persona attributes</p>
      </div>

      {/* AI Segment Builder */}
      <div className="card" style={{ marginBottom: 'var(--space-8)', background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-white))' }}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Sparkles size={18} color="var(--color-primary-500)" /> AI Segment Builder
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>
          Describe your audience in natural language
        </p>
        <div className="flex gap-3">
          <div className="search-input-wrapper" style={{ flex: 1 }}>
            <Search size={16} />
            <input
              placeholder="e.g., Customers who spent more than ₹5000 and haven't purchased in 45 days"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuild()}
            />
          </div>
          <button className="btn btn-primary" onClick={handleBuild} disabled={building}>
            {building ? <div className="spinner" /> : <Send size={16} />}
            {building ? 'Building...' : 'Build Segment'}
          </button>
        </div>
        {buildResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 'var(--space-4)' }}>
            <div className="card card-sm" style={{ background: 'var(--color-success-50)', borderColor: 'var(--color-success-500)' }}>
              <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-2)' }}>
                <strong>{buildResult.customers_matched} customers matched</strong>
                <span>Revenue: {formatCurrency(buildResult.revenue_opportunity)}</span>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>{buildResult.reasoning}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Prebuilt Segments */}
      <section className="section">
        <h2 className="section-title">Prebuilt Segments</h2>
        <p style={{ fontSize: 13, color: 'var(--color-gray-400)', marginBottom: 16 }}>
          Click any segment to see why it exists and who's in it.
        </p>

        {isLoading ? (
          <div className="grid-7">
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className="skeleton" style={{ height: 130, borderRadius: 12 }} />
            ))}
          </div>
        ) : (
          <div className="grid-7">
            {prebuilt.map((seg, i) => {
              const meta = SEGMENT_DESCRIPTIONS[seg.name];
              const isSelected = selectedSegment?.id === seg.id;
              return (
                <motion.div
                  key={seg.id}
                  className={`segment-card ${isSelected ? 'segment-card--active' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedSegment(isSelected ? null : seg)}
                  style={{
                    cursor: 'pointer',
                    borderLeftColor: meta?.color || 'var(--color-primary-300)',
                    borderLeftWidth: 4,
                    ...(isSelected ? {
                      boxShadow: `0 0 0 2px ${meta?.color || 'var(--color-primary-400)'}`,
                      background: 'var(--color-primary-50)',
                    } : {}),
                  }}
                >
                  <div className="segment-card-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{meta?.icon || '👥'}</span>
                    {seg.name}
                  </div>
                  <div className="segment-card-stats">
                    <div>
                      <div className="segment-stat-label"><Users size={12} style={{ display: 'inline' }} /> Audience</div>
                      <div className="segment-stat-value">{seg.customer_count.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="segment-stat-label"><IndianRupee size={12} style={{ display: 'inline' }} /> Revenue</div>
                      <div className="segment-stat-value">{formatCurrency(seg.revenue_contribution)}</div>
                    </div>
                    <div>
                      <div className="segment-stat-label">Engagement</div>
                      <div className="segment-stat-value">{seg.engagement_rate.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="segment-stat-label"><TrendingUp size={12} style={{ display: 'inline' }} /> Growth</div>
                      <div className="segment-stat-value" style={{ color: seg.growth_trend >= 0 ? 'var(--color-success-600)' : 'var(--color-error-600)' }}>
                        {seg.growth_trend >= 0 ? '+' : ''}{seg.growth_trend.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Segment Detail Panel */}
      <AnimatePresence>
        {selectedSegment && (
          <>
            <motion.div
              className="slide-panel-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSegment(null)}
            />
            <motion.div
              className="slide-panel"
              initial={{ x: 600 }}
              animate={{ x: 0 }}
              exit={{ x: 600 }}
              transition={{ type: 'spring', damping: 25 }}
            >
              <div className="slide-panel-header">
                <div>
                  <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                    {SEGMENT_DESCRIPTIONS[selectedSegment.name]?.icon || '👥'} {selectedSegment.name}
                  </h2>
                  <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
                    {selectedSegment.customer_count.toLocaleString()} customers · {formatCurrency(selectedSegment.revenue_contribution)} revenue
                  </p>
                </div>
                <button className="slide-panel-close" onClick={() => setSelectedSegment(null)}><X size={18} /></button>
              </div>

              {/* Metrics */}
              <div className="grid-3" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                {[
                  { label: 'Audience', value: selectedSegment.customer_count.toLocaleString() },
                  { label: 'Engagement', value: `${selectedSegment.engagement_rate.toFixed(0)}%` },
                  { label: 'Growth', value: `${selectedSegment.growth_trend >= 0 ? '+' : ''}${selectedSegment.growth_trend.toFixed(1)}%` },
                ].map(m => (
                  <div key={m.label} className="metric-card card-sm">
                    <div className="metric-card-value">{m.value}</div>
                    <div className="metric-card-label">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Why this segment exists */}
              {SEGMENT_DESCRIPTIONS[selectedSegment.name] && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div style={{
                    background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)',
                    borderLeft: `4px solid ${SEGMENT_DESCRIPTIONS[selectedSegment.name].color}`,
                    borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: SEGMENT_DESCRIPTIONS[selectedSegment.name].color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      🧠 Why this segment exists
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--color-gray-700)', lineHeight: 1.6, margin: 0 }}>
                      {SEGMENT_DESCRIPTIONS[selectedSegment.name].why}
                    </p>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                      Inclusion criteria
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {SEGMENT_DESCRIPTIONS[selectedSegment.name].criteria.map((c, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          fontSize: 13, color: 'var(--color-gray-600)',
                          background: 'var(--color-gray-50)',
                          border: '1px solid var(--color-gray-200)',
                          borderRadius: 'var(--radius-sm)', padding: '6px 12px',
                        }}>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* AI-generated segment */}
              {selectedSegment.segment_type === 'ai_generated' && selectedSegment.query_text && (
                <div style={{
                  background: 'var(--color-primary-50)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-primary-200)', padding: 16, marginBottom: 20,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    AI-Generated from query
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-gray-700)', fontStyle: 'italic', margin: 0 }}>
                    "{selectedSegment.query_text}"
                  </p>
                </div>
              )}

              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSelectedSegment(null)}>
                Close
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI-Generated Segments */}
      {aiGenerated.length > 0 && (
        <section className="section">
          <h2 className="section-title"><Sparkles size={20} /> AI-Generated Segments</h2>
          <div className="grid-7">
            {aiGenerated.map((seg) => (
              <div
                key={seg.id}
                className="segment-card"
                style={{ borderColor: 'var(--color-primary-200)', cursor: 'pointer' }}
                onClick={() => setSelectedSegment(selectedSegment?.id === seg.id ? null : seg)}
              >
                <div className="segment-card-name"><Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />{seg.name}</div>
                <div className="segment-card-stats">
                  <div>
                    <div className="segment-stat-label">Audience</div>
                    <div className="segment-stat-value">{seg.customer_count.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="segment-stat-label">Revenue</div>
                    <div className="segment-stat-value">{formatCurrency(seg.revenue_contribution)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

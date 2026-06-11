import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, IndianRupee, TrendingUp, Sparkles, Search, Send } from 'lucide-react';
import { getSegments, buildSegment } from '../api/client';
import type { Segment } from '../types';

function formatCurrency(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

export default function SegmentsPage() {
  const [query, setQuery] = useState('');
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<{ customers_matched: number; revenue_opportunity: number; reasoning: string } | null>(null);

  const { data: segments, refetch } = useQuery<Segment[]>({ queryKey: ['segments'], queryFn: getSegments });

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
        <div className="grid-7">
          {segments?.filter(s => s.segment_type === 'prebuilt').map((seg, i) => (
            <motion.div key={seg.id} className="segment-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="segment-card-name">{seg.name}</div>
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
          ))}
        </div>
      </section>

      {/* AI-Generated Segments */}
      {segments?.filter(s => s.segment_type === 'ai_generated').length ? (
        <section className="section">
          <h2 className="section-title"><Sparkles size={20} /> AI-Generated Segments</h2>
          <div className="grid-7">
            {segments?.filter(s => s.segment_type === 'ai_generated').map((seg) => (
              <div key={seg.id} className="segment-card" style={{ borderColor: 'var(--color-primary-200)' }}>
                <div className="segment-card-name">{seg.name}</div>
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
      ) : null}
    </div>
  );
}

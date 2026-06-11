import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { getCampaigns, getCampaignFunnel, getCampaignTimeline, getCampaignDecisions, launchCampaign } from '../api/client';
import { LoadingButton } from '../components/ui/LoadingButton';
import type { Campaign, CampaignFunnel, Activity, DecisionLog } from '../types';

function formatCurrency(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

const statusColors: Record<string, string> = {
  draft: 'gray', queued: 'info', processing: 'warning', sending: 'primary', completed: 'success', failed: 'error',
};

const funnelColors = ['#6366f1', '#818cf8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#dc2626'];


export default function CampaignsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [funnel, setFunnel] = useState<CampaignFunnel | null>(null);
  const [timeline, setTimeline] = useState<Activity[]>([]);
  const [decisions, setDecisions] = useState<DecisionLog[]>([]);
  const [tab, setTab] = useState<'overview' | 'funnel' | 'timeline' | 'decisions'>('overview');
  const [launchingIds, setLaunchingIds] = useState<Set<string>>(new Set());

  const { data: campaigns, refetch } = useQuery<Campaign[]>({ queryKey: ['campaigns'], queryFn: getCampaigns });

  useEffect(() => { document.title = 'ReachIQ — Campaigns'; }, []);

  async function openCampaign(c: Campaign) {
    setSelectedCampaign(c);
    setTab('overview');
    try {
      const [f, t, d] = await Promise.all([
        getCampaignFunnel(c.id),
        getCampaignTimeline(c.id),
        getCampaignDecisions(c.id),
      ]);
      setFunnel(f); setTimeline(t); setDecisions(d);
    } catch { /* empty */ }
  }

  async function handleLaunch(id: string) {
    setLaunchingIds(prev => new Set(prev).add(id));
    try {
      await launchCampaign(id);
      refetch();
    } catch (e) { console.error(e); }
    finally {
      setLaunchingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Campaigns</h1>
        <p>Campaign management, execution, and AI analysis</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Audience</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Conversions</th>
              <th>Revenue</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns?.map(c => (
              <tr key={c.id} onClick={() => openCampaign(c)}>
                <td>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>{c.goal}</div>
                </td>
                <td>{c.segment_name || '—'}</td>
                <td><span className={`badge badge-${c.channel}`}>{c.channel}</span></td>
                <td><span className={`badge badge-${statusColors[c.status] || 'gray'}`}>{c.status}</span></td>
                <td>{c.actual_sent.toLocaleString()}</td>
                <td>{c.actual_converted.toLocaleString()}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(c.actual_revenue)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {c.status === 'draft' && (
                    <LoadingButton
                      loading={launchingIds.has(c.id)}
                      loadingText="Launching"
                      size="sm"
                      onClick={() => handleLaunch(c.id)}
                    >
                      Launch
                    </LoadingButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Campaign Detail Panel */}
      <AnimatePresence>
        {selectedCampaign && (
          <>
            <motion.div className="slide-panel-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCampaign(null)} />
            <motion.div className="slide-panel" initial={{ x: 600 }} animate={{ x: 0 }} exit={{ x: 600 }} transition={{ type: 'spring', damping: 25 }}>
              <div className="slide-panel-header">
                <div>
                  <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{selectedCampaign.name}</h2>
                  <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>{selectedCampaign.goal}</p>
                </div>
                <button className="slide-panel-close" onClick={() => setSelectedCampaign(null)}><X size={18} /></button>
              </div>

              {/* Tabs */}
              <div className="tabs">
                {(['overview', 'funnel', 'timeline', 'decisions'] as const).map(t => (
                  <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Overview Tab */}
              {tab === 'overview' && (
                <div>
                  <div className="flex gap-3" style={{ marginBottom: 'var(--space-4)' }}>
                    <span className={`badge badge-${selectedCampaign.channel}`}>{selectedCampaign.channel}</span>
                    <span className={`badge badge-${statusColors[selectedCampaign.status]}`}>{selectedCampaign.status}</span>
                  </div>

                  <div className="card" style={{ background: 'var(--color-gray-50)', marginBottom: 'var(--space-4)' }}>
                    <h4 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-2)' }}>{selectedCampaign.message_headline}</h4>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)' }}>{selectedCampaign.message_body}</p>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-2)' }}>{selectedCampaign.message_cta}</button>
                  </div>

                  <div className="grid-3" style={{ gap: 'var(--space-3)' }}>
                    <div className="metric-card card-sm">
                      <div className="metric-card-value">{selectedCampaign.actual_sent.toLocaleString()}</div>
                      <div className="metric-card-label">Sent</div>
                    </div>
                    <div className="metric-card card-sm">
                      <div className="metric-card-value">{selectedCampaign.actual_read.toLocaleString()}</div>
                      <div className="metric-card-label">Read</div>
                    </div>
                    <div className="metric-card card-sm">
                      <div className="metric-card-value">{selectedCampaign.actual_clicked.toLocaleString()}</div>
                      <div className="metric-card-label">Clicked</div>
                    </div>
                    <div className="metric-card card-sm">
                      <div className="metric-card-value">{selectedCampaign.actual_converted.toLocaleString()}</div>
                      <div className="metric-card-label">Converted</div>
                    </div>
                    <div className="metric-card card-sm">
                      <div className="metric-card-value">{formatCurrency(selectedCampaign.actual_revenue)}</div>
                      <div className="metric-card-label">Revenue</div>
                    </div>
                    <div className="metric-card card-sm">
                      <div className="metric-card-value">{selectedCampaign.actual_failed.toLocaleString()}</div>
                      <div className="metric-card-label">Failed</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Funnel Tab */}
              {tab === 'funnel' && funnel && (
                <div className="funnel-chart">
                  {[
                    { label: 'Queued', value: funnel.queued },
                    { label: 'Sent', value: funnel.sent },
                    { label: 'Delivered', value: funnel.delivered },
                    { label: 'Read', value: funnel.read },
                    { label: 'Clicked', value: funnel.clicked },
                    { label: 'Converted', value: funnel.converted },
                  ].map((stage, i) => {
                    const max = Math.max(funnel.queued, 1);
                    const pct = Math.max((stage.value / max) * 100, 8);
                    return (
                      <div key={stage.label} className="funnel-stage">
                        <span className="funnel-label">{stage.label}</span>
                        <div className="funnel-bar-wrapper">
                          <motion.div
                            className="funnel-bar"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.15, duration: 0.5 }}
                            style={{ background: funnelColors[i] }}
                          >
                            {stage.value.toLocaleString()}
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Timeline Tab */}
              {tab === 'timeline' && (
                <div className="timeline">
                  {timeline.map(a => (
                    <div key={a.id} className="timeline-item">
                      <div className={`timeline-dot ${a.status}`} />
                      <div className="timeline-content">
                        <div className="timeline-time">{new Date(a.created_at).toLocaleString()}</div>
                        <div className="timeline-desc">{a.description}</div>
                        <div className="timeline-meta">
                          <span className={`badge badge-${a.status === 'success' ? 'success' : a.status === 'warning' ? 'warning' : a.status === 'error' ? 'error' : 'info'}`}>
                            {a.event_type.replace(/_/g, ' ')}
                          </span>
                          {a.affected_count > 0 && <span>{a.affected_count} affected</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Decisions Tab */}
              {tab === 'decisions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {decisions.length === 0 && <div className="empty-state"><h3>No decisions logged yet</h3></div>}
                  {decisions.map(d => (
                    <div key={d.id} className="decision-card">
                      <div className="decision-header">
                        <span className="decision-customer">{d.customer_name || 'Campaign-level'}</span>
                        <span className="badge badge-primary">{d.decision_type.replace('_', ' ')}</span>
                      </div>
                      <div className="decision-value">{d.decision}</div>
                      <div className="decision-reasoning">{d.reasoning}</div>
                      <div className="decision-confidence">
                        Confidence: {(d.confidence_score * 100).toFixed(0)}% · Source: {d.source}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

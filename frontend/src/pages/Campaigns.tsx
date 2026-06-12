import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { getCampaigns, getCampaign, getCampaignFunnel, getCampaignTimeline, getCampaignDecisions, launchCampaign, getCampaignMessages } from '../api/client';
import { LoadingButton } from '../components/ui/LoadingButton';
import type { Campaign, CampaignFunnel, Activity, DecisionLog, CampaignMessage, CampaignTimelineEvent } from '../types';

function formatCurrency(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

const statusColors: Record<string, string> = {
  draft: 'gray', queued: 'info', processing: 'warning', sending: 'primary', completed: 'success', failed: 'error',
  sent: 'primary', delivered: 'success', read: 'info', clicked: 'info', converted: 'success', expired: 'gray',
};

const funnelColors = ['#6366f1', '#818cf8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#dc2626'];


export default function CampaignsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [funnel, setFunnel] = useState<CampaignFunnel | null>(null);
  const [timeline, setTimeline] = useState<CampaignTimelineEvent[]>([]);
  const [decisions, setDecisions] = useState<DecisionLog[]>([]);
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'funnel' | 'decisions' | 'messages'>('overview');
  const [launchingIds, setLaunchingIds] = useState<Set<string>>(new Set());

  const { data: campaigns, isLoading: loadingCampaigns, refetch } = useQuery<Campaign[]>({ queryKey: ['campaigns'], queryFn: getCampaigns });

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  }

  useEffect(() => { document.title = 'ReachIQ — Campaigns'; }, []);

  useEffect(() => {
    if (!selectedCampaign) return;

    const isActive = selectedCampaign.status === 'sending' || selectedCampaign.status === 'queued';
    if (!isActive) return;

    const interval = setInterval(async () => {
      try {
        const [c, t, f, m] = await Promise.all([
          getCampaign(selectedCampaign.id),
          getCampaignTimeline(selectedCampaign.id),
          getCampaignFunnel(selectedCampaign.id),
          getCampaignMessages(selectedCampaign.id),
        ]);
        setSelectedCampaign(c);
        setTimeline(t);
        setFunnel(f);
        setMessages(m);
        refetch();
      } catch (e) {
        console.error('Error polling campaign state:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedCampaign?.id, selectedCampaign?.status, refetch]);

  async function openCampaign(c: Campaign) {
    setSelectedCampaign(c);
    setTab('overview');
    try {
      const [f, t, d, m] = await Promise.all([
        getCampaignFunnel(c.id),
        getCampaignTimeline(c.id),
        getCampaignDecisions(c.id),
        getCampaignMessages(c.id),
      ]);
      setFunnel(f); setTimeline(t); setDecisions(d); setMessages(m);
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
        {loadingCampaigns ? (
          <div style={{ padding: '20px' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 10 }} />
            ))}
          </div>
        ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Audience</th>
              <th>Channel</th>
              <th>Date</th>
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
                <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', whiteSpace: 'nowrap' }}>
                  <div>{formatDate(c.created_at)}</div>
                  {c.launched_at && <div style={{ color: 'var(--color-primary-500)' }}>↗ {formatDate(c.launched_at)}</div>}
                </td>
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
        )}
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
                {(['overview', 'funnel', 'messages', 'decisions'] as const).map(t => (
                  <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                    {t === 'messages' ? 'Message Feed' : t.charAt(0).toUpperCase() + t.slice(1)}
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

                  {/* Dynamic Distributed Delivery Pipeline Status Block */}
                  {(() => {
                    const totalBatches = Math.max(Math.ceil((selectedCampaign.actual_sent || selectedCampaign.predicted_reach || 43) / 10), 1);
                    const gatewayEvents = timeline.filter(e => e.service === 'gateway' && e.event_type === 'batch_processing');
                    const processedBatches = gatewayEvents.filter(e => e.status === 'success').length;
                    const isGatewayDone = selectedCampaign.status === 'completed' || timeline.some(e => e.event_type === 'dispatch_completed');
                    const callbackEvents = timeline.filter(e => e.service === 'callback');

                    const crmStatus = selectedCampaign.status === 'completed' ? '✓ Done' : (selectedCampaign.status === 'sending' || selectedCampaign.status === 'queued') ? '✓ Active' : 'Idle';
                    const gatewayStatus = selectedCampaign.status === 'dispatch_failed' ? '⚠️ Offline' : isGatewayDone ? '✓ Done' : selectedCampaign.status === 'sending' ? `Batch ${Math.min(processedBatches + 1, totalBatches)}/${totalBatches}` : 'Idle';
                    const callbackStatus = selectedCampaign.status === 'completed' ? '✓ Done' : (callbackEvents.length > 0 && selectedCampaign.status === 'sending') ? `Receiving (${callbackEvents.length})` : 'Idle';
                    const analyticsStatus = selectedCampaign.status === 'completed' ? '✓ Finalized' : selectedCampaign.status === 'sending' ? 'Updating' : 'Idle';

                    return (
                      <div style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Distributed Delivery Pipeline</h3>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                          {[
                            { title: 'CRM API', status: crmStatus, activeColor: 'var(--color-primary-500)', icon: '💻' },
                            { title: 'Messaging Gateway', status: gatewayStatus, activeColor: '#a855f7', icon: '⚡' },
                            { title: 'Callback Handler', status: callbackStatus, activeColor: 'var(--color-success-500)', icon: '🔌' },
                            { title: 'Analytics Engine', status: analyticsStatus, activeColor: 'var(--color-warning-500)', icon: '📈' },
                          ].map((node, index, arr) => {
                            const isActive = node.status !== 'Idle';
                            const isDone = node.status.includes('Done') || node.status === '✓ Finalized';
                            const isFailed = node.status.includes('Offline');
                            return (
                              <div key={node.title} style={{ display: 'flex', flex: '1 1 110px', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <div
                                  style={{
                                    flex: 1,
                                    background: isFailed ? 'rgba(239, 68, 68, 0.05)' : isDone ? 'rgba(16, 185, 129, 0.05)' : isActive ? 'rgba(99, 102, 241, 0.03)' : '#fcfcfc',
                                    border: `1px solid ${isFailed ? 'var(--color-error-300)' : isDone ? 'var(--color-success-200)' : isActive ? node.activeColor : 'var(--color-gray-200)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-3) var(--space-2)',
                                    textAlign: 'center',
                                    transition: 'all 0.3s ease',
                                    boxShadow: isActive && !isDone && !isFailed ? `0 0 12px ${node.activeColor}15` : 'none',
                                    position: 'relative',
                                  }}
                                >
                                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{node.icon}</div>
                                  <div style={{ fontWeight: 600, fontSize: '10px', color: 'var(--color-gray-800)', whiteSpace: 'nowrap' }}>{node.title}</div>
                                  <div
                                    style={{
                                      fontSize: '9px',
                                      marginTop: '6px',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      color: isFailed ? 'var(--color-error-600)' : isDone ? 'var(--color-success-600)' : isActive ? node.activeColor : 'var(--color-gray-400)',
                                    }}
                                  >
                                    {node.status}
                                  </div>
                                </div>
                                {index < arr.length - 1 && (
                                  <div style={{ color: 'var(--color-gray-300)', fontWeight: 700, fontSize: 'var(--text-md)' }}>➜</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Campaign Execution Timeline Stream */}
                  <div style={{ marginTop: 'var(--space-6)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Campaign Execution Timeline</h3>
                      {(selectedCampaign.status === 'sending' || selectedCampaign.status === 'queued') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-xs)', color: 'var(--color-primary-500)' }}>
                          <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary-500)' }} />
                          Live Updating...
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
                      {timeline.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                          <h3>No timeline events generated yet</h3>
                          <p>Launch this campaign to see the distributed pipeline start processing.</p>
                        </div>
                      ) : (
                        timeline.map((event) => {
                          const serviceName =
                            event.service === 'crm' ? 'CRM API' :
                            event.service === 'gateway' ? 'Messaging Gateway' :
                            event.service === 'callback' ? 'CRM Callback Handler' :
                            event.service === 'analytics' ? 'CRM Analytics Engine' : 'System';

                          const serviceColor =
                            event.status === 'failed' ? 'var(--color-error-500)' :
                            event.service === 'crm' ? 'var(--color-primary-500)' :
                            event.service === 'gateway' ? '#a855f7' :
                            event.service === 'callback' ? 'var(--color-success-500)' :
                            event.service === 'analytics' ? 'var(--color-warning-500)' : 'var(--color-gray-500)';

                          const serviceBg =
                            event.status === 'failed' ? 'rgba(239, 68, 68, 0.03)' :
                            event.service === 'crm' ? 'rgba(59, 130, 246, 0.03)' :
                            event.service === 'gateway' ? 'rgba(168, 85, 247, 0.03)' :
                            event.service === 'callback' ? 'rgba(16, 185, 129, 0.03)' :
                            event.service === 'analytics' ? 'rgba(245, 158, 11, 0.03)' : '#fff';

                          return (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              style={{
                                display: 'flex',
                                borderLeft: `4px solid ${serviceColor}`,
                                background: serviceBg,
                                borderRadius: '4px var(--radius-md) var(--radius-md) 4px',
                                padding: 'var(--space-3) var(--space-4)',
                                borderTop: '1px solid var(--color-gray-100)',
                                borderRight: '1px solid var(--color-gray-100)',
                                borderBottom: '1px solid var(--color-gray-100)',
                                gap: 'var(--space-3)',
                                alignItems: 'flex-start',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '18px',
                                  background: '#fff',
                                  border: `1px solid var(--color-gray-200)`,
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                  flexShrink: 0,
                                }}
                              >
                                {event.service === 'crm' ? '💻' :
                                 event.service === 'gateway' ? '⚡' :
                                 event.service === 'callback' ? '🔌' : '📈'}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                                  <h4 style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-gray-950)' }}>
                                    {event.title}
                                  </h4>
                                  <span style={{ fontSize: '10px', color: 'var(--color-gray-400)', whiteSpace: 'nowrap' }}>
                                    {new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--color-gray-400)' }}>Source Service:</span>
                                  <span style={{ fontSize: '10px', fontWeight: 600, color: serviceColor }}>{serviceName}</span>
                                </div>

                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-600)', lineHeight: '1.4' }}>
                                  {event.description}
                                </p>

                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                  <pre
                                    style={{
                                      fontSize: '9px',
                                      background: 'var(--color-gray-100)',
                                      padding: 'var(--space-2)',
                                      borderRadius: '4px',
                                      marginTop: 'var(--space-2)',
                                      fontFamily: 'monospace',
                                      overflowX: 'auto',
                                      color: 'var(--color-gray-600)',
                                      margin: '6px 0 0 0',
                                    }}
                                  >
                                    {JSON.stringify(event.metadata, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Tab */}
              {tab === 'messages' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {messages.length === 0 && (
                    <div className="empty-state">
                      <h3>No message attempts recorded</h3>
                      <p>Launch this campaign to start message delivery.</p>
                    </div>
                  )}
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className="card-sm"
                      style={{
                        border: '1px solid var(--color-gray-200)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-3)',
                        cursor: 'pointer',
                        background: expandedMsgId === msg.id ? 'var(--color-gray-50)' : '#fff',
                        transition: 'background 0.2s'
                      }}
                      onClick={() => setExpandedMsgId(expandedMsgId === msg.id ? null : msg.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                            {msg.customer_name}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: 2 }}>
                            Channel: <span style={{ textTransform: 'capitalize' }}>{msg.channel}</span>
                          </div>
                        </div>
                        <span className={`badge badge-${statusColors[msg.status] || 'gray'}`}>
                          {msg.status}
                        </span>
                      </div>

                      <AnimatePresence>
                        {expandedMsgId === msg.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden', marginTop: 'var(--space-3)' }}
                          >
                            <div
                              style={{
                                borderLeft: '2px solid var(--color-primary-200)',
                                paddingLeft: 'var(--space-4)',
                                marginLeft: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-2)'
                              }}
                            >
                              {msg.history.map((h, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: '-21px',
                                      top: '4px',
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '50%',
                                      background: h.status === 'converted' ? 'var(--color-success-500)' :
                                                  h.status === 'failed' ? 'var(--color-error-500)' :
                                                  'var(--color-primary-400)',
                                      border: '2px solid #fff'
                                    }}
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                                      {h.status}
                                    </span>
                                    <span style={{ color: 'var(--color-gray-400)' }}>
                                      {new Date(h.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                  </div>
                                  {h.error_message && (
                                    <div style={{ fontSize: 11, color: 'var(--color-error-600)', marginTop: 2 }}>
                                      ⚠️ {h.error_message}
                                    </div>
                                  )}
                                  {h.revenue && h.revenue > 0 ? (
                                    <div style={{ fontSize: 11, color: 'var(--color-success-600)', fontWeight: 600, marginTop: 2 }}>
                                      💰 Purchased ₹{h.revenue.toLocaleString()}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
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
